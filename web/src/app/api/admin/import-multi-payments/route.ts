import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { Policy } from "@/models/Policy";
import { Payment } from "@/models/Payment";
import { Customer } from "@/models/Customer";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

function splitCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') {
      current += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

function parseDate(value: string): Date | null {
  if (!value || value.trim() === "") return null;
  
  const dateStr = value.toString().trim();
  // Try parsing M/D/YYYY format
  const mdyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Fall back to standard Date parsing
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function parseAmount(value: string): number | null {
  if (!value || value.trim() === "") return null;
  const cleaned = value.toString().replace(/[^\d.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;
    
    await connectDb();

    const body = await req.json();
    const { csvText, fieldMappings } = body as {
      csvText: string;
      fieldMappings?: Record<string, string>;
    };

    if (!csvText || typeof csvText !== "string") {
      return json({ error: "CSV text is required" }, 400);
    }

    // Parse CSV
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length);
    if (lines.length < 2) {
      return json({ error: "CSV must have at least a header row and one data row" }, 400);
    }

    const headers = splitCsvRow(lines[0]);
    const rows = lines.slice(1).map(splitCsvRow);

    // Find policy number column using field mappings or auto-detect
    let policyNumberIdx = -1;
    if (fieldMappings && fieldMappings.policyNumber) {
      policyNumberIdx = headers.indexOf(fieldMappings.policyNumber);
    } else {
      policyNumberIdx = headers.findIndex(h => h.toLowerCase().includes("policy number"));
    }
    
    if (policyNumberIdx === -1) {
      return json({ error: "Could not find 'Policy Number' column. Please map it manually." }, 400);
    }

    // Find account number column (optional)
    let accountNumberIdx = -1;
    if (fieldMappings && fieldMappings.accountNumber) {
      accountNumberIdx = headers.indexOf(fieldMappings.accountNumber);
    } else {
      accountNumberIdx = headers.findIndex(h => h.toLowerCase().includes("account number"));
    }

    // Find payment columns using field mappings or auto-detect (2-10)
    const paymentColumns: Array<{dateIdx: number, numberIdx: number, amountIdx: number}> = [];
    
    for (let i = 2; i <= 10; i++) {
      let dateIdx = -1;
      let numberIdx = -1;
      let amountIdx = -1;
      
      // Try field mappings first
      if (fieldMappings) {
        const dateMapping = fieldMappings[`recDate${i}`];
        const numberMapping = fieldMappings[`recNumber${i}`];
        const amtMapping = fieldMappings[`recAmt${i}`];
        
        if (dateMapping) dateIdx = headers.indexOf(dateMapping);
        if (numberMapping) numberIdx = headers.indexOf(numberMapping);
        if (amtMapping) amountIdx = headers.indexOf(amtMapping);
      }
      
      // Fallback to auto-detection if mappings not provided
      if (dateIdx === -1) {
        dateIdx = headers.findIndex(h => h.toLowerCase().includes(`rec date ${i}`));
      }
      if (numberIdx === -1) {
        numberIdx = headers.findIndex(h => h.toLowerCase().includes(`rec number ${i}`));
      }
      if (amountIdx === -1) {
        amountIdx = headers.findIndex(h => h.toLowerCase().includes(`rec amt ${i}`));
      }
      
      if (dateIdx !== -1 && numberIdx !== -1 && amountIdx !== -1) {
        paymentColumns.push({ dateIdx, numberIdx, amountIdx });
      }
    }

    if (paymentColumns.length === 0) {
      return json({ error: "Could not find any payment columns. Please map at least one set (Date, Number, Amount)." }, 400);
    }

    const results = {
      totalRows: rows.length,
      paymentsCreated: 0,
      paymentsSkipped: 0,
      policiesNotFound: [] as string[],
      duplicatesSkipped: [] as string[],
      errors: [] as string[],
    };

    // Process each row
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      const rowNum = rowIdx + 2; // +2 for header and 0-index
      
      // Skip completely empty rows (all cells blank)
      if (row.length === 0 || row.every((cell) => !cell || cell.trim() === "")) {
        continue; // Skip silently - empty rows are expected
      }

      const policyNumber = row[policyNumberIdx]?.trim();
      const accountNumber = row[accountNumberIdx]?.trim();

      // Skip rows without policy number (but don't error - blanks are OK)
      if (!policyNumber) {
        continue; // Skip silently - blank policy numbers just mean skip this row
      }

      // Find the policy
      let policy = await Policy.findOne({ policyNumber }).lean();
      
      if (!policy) {
        results.policiesNotFound.push(`${policyNumber} (Row ${rowNum})`);
        continue;
      }

      // Process each payment set for this policy
      for (const paymentCol of paymentColumns) {
        const dateStr = row[paymentCol.dateIdx]?.trim();
        const receiptNumber = row[paymentCol.numberIdx]?.trim();
        const amountStr = row[paymentCol.amountIdx]?.trim();

        // Skip if no date (means no payment for this column)
        if (!dateStr) continue;

        const paymentDate = parseDate(dateStr);
        const amount = parseAmount(amountStr);

        if (!paymentDate) {
          results.errors.push(`Row ${rowNum}: Invalid date '${dateStr}'`);
          continue;
        }

        if (!amount || amount <= 0) {
          results.errors.push(`Row ${rowNum}: Invalid amount '${amountStr}'`);
          continue;
        }

        if (!receiptNumber) {
          results.errors.push(`Row ${rowNum}: Missing receipt number for payment on ${dateStr}`);
          continue;
        }

        // Check for duplicate payment (same policy, date, and amount)
        const startOfDay = new Date(paymentDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(paymentDate);
        endOfDay.setHours(23, 59, 59, 999);

        const existingPayment = await Payment.findOne({
          policyId: policy._id,
          amount: amount,
          paymentDate: {
            $gte: startOfDay,
            $lt: endOfDay,
          },
        }).lean();

        if (existingPayment) {
          results.duplicatesSkipped.push(
            `Policy: ${policyNumber}, Date: ${paymentDate.toLocaleDateString()}, Amount: $${amount.toFixed(2)}, Receipt: ${receiptNumber}`
          );
          results.paymentsSkipped++;
          continue;
        }

        // Create the payment
        try {
          await Payment.create({
            policyId: policy._id,
            amount: amount,
            paymentDate: paymentDate,
            paymentMethod: "Cash",
            receiptNumber: receiptNumber,
            arrearsOverrideUsed: false,
          });

          results.paymentsCreated++;
        } catch (err: any) {
          results.errors.push(
            `Row ${rowNum}: Failed to create payment - ${err.message}`
          );
        }
      }
    }

    return json({
      success: true,
      ...results,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

