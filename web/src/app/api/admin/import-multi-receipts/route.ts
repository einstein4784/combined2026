import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { Policy } from "@/models/Policy";
import { Payment } from "@/models/Payment";
import { Receipt } from "@/models/Receipt";
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
    
    const adminUserId = auth.session.id;
    
    await connectDb();

    const body = await req.json();
    const { csvText } = body;

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

    // Find policy number column
    const policyNumberIdx = headers.findIndex(h => h.toLowerCase().replace(/\s+/g, "").includes("policynumber"));
    
    if (policyNumberIdx === -1) {
      return json({ error: "Could not find 'Policy Number' column" }, 400);
    }

    // Find receipt columns (REC_DATE_1-10, REC_NUMBER/REC_NUMBE2-10, REC_AMT_1-10)
    const receiptColumns: Array<{dateIdx: number, numberIdx: number, amountIdx: number}> = [];
    
    // Check for columns 1-10
    for (let i = 1; i <= 10; i++) {
      let dateIdx = -1;
      let numberIdx = -1;
      let amountIdx = -1;
      
      // For REC_DATE: handle REC_DATE_1, REC_DATE_2, ..., REC_DATE10 (no underscore for 10)
      if (i === 10) {
        dateIdx = headers.findIndex(h => {
          const normalized = h.toLowerCase().replace(/[_\s]+/g, "");
          return normalized === "recdate10";
        });
      } else {
        dateIdx = headers.findIndex(h => {
          const normalized = h.toLowerCase().replace(/[_\s]+/g, "");
          return normalized === `recdate${i}` || normalized === `recdate_${i}`;
        });
      }
      
      // For REC_NUMBER: handle REC_NUMBER (for 1), REC_NUMBE2-9, REC_NUMB10
      if (i === 1) {
        numberIdx = headers.findIndex(h => {
          const normalized = h.toLowerCase().replace(/[_\s]+/g, "");
          return normalized === "recnumber" || normalized === "recnumber1";
        });
      } else if (i === 10) {
        numberIdx = headers.findIndex(h => {
          const normalized = h.toLowerCase().replace(/[_\s]+/g, "");
          return normalized === "recnumb10";
        });
      } else {
        numberIdx = headers.findIndex(h => {
          const normalized = h.toLowerCase().replace(/[_\s]+/g, "");
          return normalized === `recnumbe${i}` || normalized === `recnumber${i}`;
        });
      }
      
      // For REC_AMT: handle REC_AMT_1-9, REC_AMT_10
      if (i === 10) {
        amountIdx = headers.findIndex(h => {
          const normalized = h.toLowerCase().replace(/[_\s]+/g, "");
          return normalized === "recamt10" || normalized === "recamt_10";
        });
      } else {
        amountIdx = headers.findIndex(h => {
          const normalized = h.toLowerCase().replace(/[_\s]+/g, "");
          return normalized === `recamt${i}` || normalized === `recamt_${i}`;
        });
      }
      
      if (dateIdx !== -1 && numberIdx !== -1 && amountIdx !== -1) {
        receiptColumns.push({ dateIdx, numberIdx, amountIdx });
      }
    }

    if (receiptColumns.length === 0) {
      return json({ error: "Could not find receipt columns (REC_DATE, REC_NUMBER, REC_AMT)" }, 400);
    }

    const results = {
      totalRows: rows.length,
      receiptsCreated: 0,
      receiptsSkipped: 0,
      policiesNotFound: [] as string[],
      duplicatesSkipped: [] as string[],
      errors: [] as string[],
    };

    // Process each row
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      const rowNum = rowIdx + 2; // +2 for header and 0-index
      
      if (row.length < headers.length) {
        results.errors.push(`Row ${rowNum}: Incomplete row`);
        continue;
      }

      const policyNumber = row[policyNumberIdx]?.trim();

      if (!policyNumber) {
        results.errors.push(`Row ${rowNum}: Missing policy number`);
        continue;
      }

      // Find the policy
      const policy = await Policy.findOne({ policyNumber })
        .populate("customerId", "_id firstName lastName")
        .lean();
      
      if (!policy) {
        results.policiesNotFound.push(`${policyNumber} (Row ${rowNum})`);
        continue;
      }

      // Process each receipt for this policy
      for (const receiptCol of receiptColumns) {
        const dateStr = row[receiptCol.dateIdx]?.trim();
        const receiptNumber = row[receiptCol.numberIdx]?.trim();
        const amountStr = row[receiptCol.amountIdx]?.trim();

        // Skip if no date or no receipt number (means no receipt for this column)
        if (!dateStr || !receiptNumber) continue;

        const paymentDate = parseDate(dateStr);
        const amount = parseAmount(amountStr);

        if (!paymentDate) {
          results.errors.push(`Row ${rowNum}: Invalid date '${dateStr}' for receipt ${receiptNumber}`);
          continue;
        }

        if (amount === null || amount < 0) {
          results.errors.push(`Row ${rowNum}: Invalid amount '${amountStr}' for receipt ${receiptNumber}`);
          continue;
        }

        // Check if receipt already exists
        const existingReceipt = await Receipt.findOne({ receiptNumber }).lean();
        if (existingReceipt) {
          results.duplicatesSkipped.push(
            `Receipt #${receiptNumber} already exists (Policy: ${policyNumber})`
          );
          results.receiptsSkipped++;
          continue;
        }

        // Check if payment with this receipt number exists
        const existingPayment = await Payment.findOne({ receiptNumber }).lean();
        
        let paymentId: any;
        
        if (existingPayment) {
          // Use existing payment
          paymentId = existingPayment._id;
        } else {
          // Create a payment for this receipt
          try {
            const newPayment = await Payment.create({
              policyId: policy._id,
              amount: amount,
              paymentDate: paymentDate,
              paymentMethod: "Cash",
              receiptNumber: receiptNumber,
              arrearsOverrideUsed: false,
              receivedBy: adminUserId,
            });
            paymentId = newPayment._id;
          } catch (err: any) {
            results.errors.push(
              `Row ${rowNum}: Failed to create payment for receipt ${receiptNumber} - ${err.message}`
            );
            continue;
          }
        }

        // Get customer info
        const customerId = policy.customerId;
        const customerName = (policy.customerId as any)?.firstName && (policy.customerId as any)?.lastName
          ? `${(policy.customerId as any).firstName} ${(policy.customerId as any).lastName}`
          : "Unknown";

        // Create the receipt
        try {
          await Receipt.create({
            receiptNumber: receiptNumber,
            paymentId: paymentId,
            policyId: policy._id,
            customerId: typeof customerId === 'object' ? (customerId as any)._id : customerId,
            amount: amount,
            paymentDate: paymentDate,
            paymentMethod: "Cash",
            policyNumberSnapshot: policyNumber,
            policyIdNumberSnapshot: policy.policyIdNumber,
            customerNameSnapshot: customerName,
            generatedAt: paymentDate,
            status: "active",
          });

          results.receiptsCreated++;
        } catch (err: any) {
          results.errors.push(
            `Row ${rowNum}: Failed to create receipt ${receiptNumber} - ${err.message}`
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

