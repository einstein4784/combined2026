import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { Customer } from "@/models/Customer";
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

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = splitCsvRow(lines[0]);
  const rows = lines.slice(1).map(splitCsvRow);

  return { headers, rows };
}

function parseValue(value: string, type: "string" | "number" | "date" | "boolean"): any {
  if (!value || value.trim() === "") return null;

  switch (type) {
    case "number":
      // Remove currency symbols, commas, spaces, and other non-numeric characters except decimal point and minus sign
      const cleaned = value.toString().replace(/[^\d.-]/g, "");
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    case "date":
      // Handle various date formats including M/D/YYYY (e.g., "7/10/2018", "10/8/2024")
      const dateStr = value.toString().trim();
      // Try parsing M/D/YYYY format first
      const mdyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (mdyMatch) {
        const [, month, day, year] = mdyMatch;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) return date;
      }
      // Fall back to standard Date parsing
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    case "boolean":
      const lower = value.toLowerCase().trim();
      return lower === "true" || lower === "yes" || lower === "1";
    default:
      // For string fields, preserve the original value exactly (including leading zeros, spaces, etc.)
      // This is important for receipt numbers which might be numeric strings like "27409"
      return value.toString();
  }
}

async function findCustomerByIdentifier(identifier: string): Promise<string | null> {
  if (!identifier) return null;

  // Try as ObjectId first
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const customer = await Customer.findById(identifier).lean();
    if (customer) return customer._id.toString();
  }

  // Try by email
  const byEmail = await Customer.findOne({ email: identifier }).lean();
  if (byEmail) return byEmail._id.toString();

  // Try by idNumber
  const byIdNumber = await Customer.findOne({ idNumber: identifier }).lean();
  if (byIdNumber) return byIdNumber._id.toString();

  return null;
}

async function findPolicyByIdentifier(identifier: string): Promise<string | null> {
  if (!identifier) return null;

  // Try as ObjectId first
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const policy = await Policy.findById(identifier).lean();
    if (policy) return policy._id.toString();
  }

  // Try by policyNumber
  const byPolicyNumber = await Policy.findOne({ policyNumber: identifier }).lean();
  if (byPolicyNumber) return byPolicyNumber._id.toString();

  return null;
}

async function findPaymentByIdentifier(identifier: string): Promise<string | null> {
  if (!identifier) return null;

  // Try as ObjectId first
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const payment = await Payment.findById(identifier).lean();
    if (payment) return payment._id.toString();
  }

  // Try by receiptNumber
  const byReceiptNumber = await Payment.findOne({ receiptNumber: identifier }).lean();
  if (byReceiptNumber) return byReceiptNumber._id.toString();

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;
    
    // Get admin user ID for receivedBy field in payments
    const adminUser = auth.session;

    const body = await req.json().catch(() => ({}));
    const { csv, collectionType, fieldMappings } = body;

    if (typeof csv !== "string" || !csv.trim()) {
      return json({ error: "CSV content is required" }, { status: 400 });
    }

    if (!["customers", "policies", "payments", "receipts"].includes(collectionType)) {
      return json({ error: "Invalid collection type" }, { status: 400 });
    }

    if (!fieldMappings || typeof fieldMappings !== "object") {
      return json({ error: "Field mappings are required" }, { status: 400 });
    }

    await connectDb();

    // Drop unique indexes to allow duplicates
    try {
      await Policy.collection.dropIndex("policyNumber_1").catch(() => {
        // Index might not exist, ignore error
      });
      await Receipt.collection.dropIndex("receiptNumber_1").catch(() => {
        // Index might not exist, ignore error
      });
    } catch (e) {
      // Ignore if index doesn't exist or can't be dropped
    }

    const parsed = parseCsv(csv);
    if (parsed.headers.length === 0) {
      return json({ error: "CSV file is empty or invalid" }, { status: 400 });
    }

    let imported = 0;
    const errors: string[] = [];

    // Create column index map
    const columnIndexMap: Record<string, number> = {};
    parsed.headers.forEach((header, idx) => {
      columnIndexMap[header] = idx;
    });

    for (let rowIdx = 0; rowIdx < parsed.rows.length; rowIdx++) {
      const row = parsed.rows[rowIdx];
      // Skip completely empty rows (no cells at all)
      if (row.length === 0 || row.every((cell) => !cell || cell.trim() === "")) continue;

      try {
        const record: any = {};

        // Map fields based on mappings
        for (const [dbField, csvColumn] of Object.entries(fieldMappings)) {
          const colIdx = columnIndexMap[csvColumn as string];
          if (colIdx === undefined || colIdx >= row.length) continue;

          const value = row[colIdx];
          // Allow blank fields - they will be set to null or default values
          // For receiptNumber, preserve empty string as empty string (not null) so we can check for it
          if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
            // For receiptNumber, allow empty string; for others, set to null
            if (dbField === "receiptNumber") {
              record[dbField] = "";
            } else {
              // Set to null for optional fields, will be handled by defaults later
              // For payments, blank amount fields should be null so we can skip rows without payments
              record[dbField] = null;
            }
            continue;
          }

          // Determine field type based on collection
          let fieldType: "string" | "number" | "date" | "boolean" = "string";
          if (collectionType === "customers") {
            if (dbField === "sex") fieldType = "string";
            else fieldType = "string";
          } else if (collectionType === "policies") {
            if (["totalPremiumDue", "amountPaid", "outstandingBalance"].includes(dbField)) {
              fieldType = "number";
            } else if (dbField.includes("Date")) {
              fieldType = "date";
            }
          } else if (collectionType === "payments") {
            if (["amount", "refundAmount"].includes(dbField)) {
              fieldType = "number";
            } else if (dbField === "paymentDate") {
              fieldType = "date";
            } else if (dbField === "arrearsOverrideUsed") {
              fieldType = "boolean";
            } else if (dbField === "receiptNumber") {
              // Always treat receiptNumber as string, even if it looks like a number
              fieldType = "string";
            }
          } else if (collectionType === "receipts") {
            if (["amount", "outstandingBalanceAfter"].includes(dbField)) {
              fieldType = "number";
            } else if (dbField.includes("Date") || dbField === "paymentDate") {
              fieldType = "date";
            }
          }

          record[dbField] = parseValue(value, fieldType);
        }

        // Handle special cases
        if (collectionType === "customers") {
          // Use defaults for blank required fields where possible
          if (!record.firstName || record.firstName === null) record.firstName = "Unknown";
          if (!record.lastName || record.lastName === null) record.lastName = "Customer";
          if (!record.address || record.address === null) record.address = "Not provided";
          if (!record.contactNumber || record.contactNumber === null) record.contactNumber = "000-0000";
          if (!record.idNumber || record.idNumber === null) {
            // Generate a temporary ID if blank
            record.idNumber = `TEMP-${Date.now()}-${rowIdx}`;
          }
          // Default email if not provided or blank
          if (!record.email || record.email === null) {
            record.email = "na@none.com";
          }
          
          // Handle duplicate idNumber - append suffix if duplicate exists
          if (record.idNumber) {
            const existingCustomer = await Customer.findOne({ idNumber: record.idNumber }).lean();
            if (existingCustomer) {
              // Duplicate found - append suffix to make it unique
              record.idNumber = `${record.idNumber}-${Date.now()}-${rowIdx}`;
            }
          }
          
          // Keep optional fields even if blank - allow null values to be stored
          // Mongoose will handle null/undefined values appropriately based on schema
          // Create customer
          await Customer.create(record);
          imported++;
        } else if (collectionType === "policies") {
          // Resolve customerId - required but allow blank and skip row
          if (record.customerId && record.customerId !== null) {
            const customerId = await findCustomerByIdentifier(record.customerId);
            if (!customerId) {
              errors.push(`Row ${rowIdx + 2}: Customer not found: ${record.customerId}`);
              continue;
            }
            record.customerId = customerId;
          } else {
            // Skip rows with blank customerId (don't error, just skip)
            continue;
          }

                // Use defaults for blank required fields
                // Allow duplicate policy numbers - no checking needed
                if (!record.policyNumber || record.policyNumber === null) {
                  record.policyNumber = `POL-${Date.now()}-${rowIdx}`;
                }
                if (!record.policyIdNumber || record.policyIdNumber === null) {
                  record.policyIdNumber = `PID-${Date.now()}-${rowIdx}`;
                }
          if (record.totalPremiumDue === undefined || record.totalPremiumDue === null) {
            record.totalPremiumDue = 0;
          }

          // Set defaults for blank/optional fields
          if (record.amountPaid === undefined || record.amountPaid === null) record.amountPaid = 0;
          
          // Handle outstanding balance: if blank, calculate it; if negative, set to 0
          if (record.outstandingBalance === undefined || record.outstandingBalance === null || record.outstandingBalance === "") {
            // Calculate outstanding balance if blank
            record.outstandingBalance = Math.max(record.totalPremiumDue - (record.amountPaid || 0), 0);
          } else {
            // Convert to number and check if negative
            const outstandingBalanceNum = Number(record.outstandingBalance);
            // If outstanding balance is negative (e.g., negative value of amount due), set it to 0
            if (isNaN(outstandingBalanceNum) || outstandingBalanceNum < 0) {
              record.outstandingBalance = 0;
            } else {
              record.outstandingBalance = outstandingBalanceNum;
            }
          }
          if (!record.status || record.status === null) record.status = "Active";
          if (!record.coverageType || record.coverageType === null) record.coverageType = "Third Party";
          
          // Keep optional fields even if blank - allow null values to be stored
          // Don't delete them - Mongoose will handle null values appropriately
          // Allow duplicate policy numbers - no checking needed

          try {
            await Policy.create(record);
            imported++;
          } catch (err: any) {
            // Handle duplicate key errors - append suffix if duplicate exists (fallback if index drop failed)
            if (err?.code === 11000 || err?.message?.includes("duplicate key") || err?.message?.includes("E11000")) {
              // Duplicate policy number - append suffix and retry
              const originalPolicyNumber = record.policyNumber;
              record.policyNumber = `${originalPolicyNumber}-${Date.now()}-${rowIdx}`;
              try {
                await Policy.create(record);
                imported++;
              } catch (retryErr: any) {
                errors.push(`Row ${rowIdx + 2}: ${retryErr?.message || "Failed to create policy (duplicate)"}`);
              }
            } else {
              errors.push(`Row ${rowIdx + 2}: ${err?.message || "Failed to create policy"}`);
            }
          }
        } else if (collectionType === "payments") {
          // Resolve policyId - required field, skip if blank
          const rowData = row.slice(0, Math.min(10, row.length)).join(" | "); // First 10 columns for context
          if (record.policyId && record.policyId !== null && record.policyId !== "") {
            const policyId = await findPolicyByIdentifier(record.policyId);
            if (!policyId) {
              errors.push(`Row ${rowIdx + 2}: Policy not found: "${record.policyId}". Record preview: ${rowData.substring(0, 100)}...`);
              continue;
            }
            record.policyId = policyId;
          } else {
            // Report blank policyId as error instead of silently skipping
            errors.push(`Row ${rowIdx + 2}: Policy ID is blank/required. Record preview: ${rowData.substring(0, 100)}...`);
            continue;
          }

          // Load policy to update balances
          const policy = await Policy.findById(record.policyId);
          if (!policy) {
            errors.push(`Row ${rowIdx + 2}: Policy with ID "${record.policyId}" not found in database. Record preview: ${rowData.substring(0, 100)}...`);
            continue;
          }

          // Parse amounts - allow blank values, set to 0 if blank
          // parseValue already handles currency symbols, so use the parsed value directly
          let amount = 0;
          if (record.amount !== null && record.amount !== undefined && record.amount !== "") {
            const amountNum = typeof record.amount === "number" ? record.amount : Number(record.amount);
            if (!isNaN(amountNum) && amountNum >= 0) { // Allow 0 amounts
              amount = amountNum;
            } else {
              errors.push(`Row ${rowIdx + 2}: Invalid amount value "${record.amount}". Record preview: ${rowData.substring(0, 100)}...`);
              continue;
            }
          }
          
          let refundAmount = 0;
          if (record.refundAmount !== null && record.refundAmount !== undefined && record.refundAmount !== "") {
            const refundNum = typeof record.refundAmount === "number" ? record.refundAmount : Number(record.refundAmount);
            if (!isNaN(refundNum) && refundNum >= 0) { // Allow 0 refund amounts
              refundAmount = refundNum;
            }
          }
          
          // Allow blank amounts - upload the payment even if amount is 0
          // This allows uploading payment records with other data even if amount is blank

          // Allow blank receipt numbers - generate one only if truly missing
          // Ensure receiptNumber is always stored as string (not converted to number)
          // Allow duplicates by appending suffix if duplicate exists
          let receiptNumber = "";
          if (!record.receiptNumber || record.receiptNumber === null || record.receiptNumber === "") {
            // Generate unique receipt number using timestamp, row index, and random string
            receiptNumber = `RCP-${Date.now()}-${rowIdx}-${Math.random().toString(36).substring(2, 8)}`;
          } else {
            // Ensure receiptNumber is stored as string (preserve numeric strings like "27409" as text)
            receiptNumber = String(record.receiptNumber);
          }
          
          // Check for duplicates and append suffix if needed (allow duplicates)
          const existingPayment = await Payment.findOne({ receiptNumber }).lean();
          if (existingPayment) {
            // Duplicate found - append suffix to make it unique
            receiptNumber = `${receiptNumber}-${Date.now()}-${rowIdx}`;
          }
          record.receiptNumber = receiptNumber;

          // Only update policy balances if there's an actual payment amount
          // If amount is 0, still create the payment record but don't update policy balances
          // Allow payments to exceed outstanding balance - no validation needed
          if (amount > 0 || refundAmount > 0) {
            const totalPremiumDue = Number(policy.totalPremiumDue ?? 0);
            const amountPaidSoFar = Number((policy as any).amountPaid ?? 0);
            const appliedToOutstanding = amount + refundAmount;

            // Update policy balances - allow payments to exceed outstanding balance
            const newAmountPaid = Math.max(amountPaidSoFar + appliedToOutstanding, 0);
            policy.amountPaid = newAmountPaid;
            policy.outstandingBalance = Math.max(totalPremiumDue - newAmountPaid, 0);
            await policy.save();
          }

          // Set defaults for blank/optional fields
          if (!record.paymentDate || record.paymentDate === null) record.paymentDate = new Date();
          if (!record.paymentMethod || record.paymentMethod === null) record.paymentMethod = "Cash";
          if (record.arrearsOverrideUsed === undefined || record.arrearsOverrideUsed === null) {
            record.arrearsOverrideUsed = false;
          }
          
          // Set receivedBy to admin user
          record.receivedBy = adminUser.id;
          record.amount = amount;
          record.refundAmount = refundAmount;
          
          // Keep optional fields even if blank - allow null values to be stored
          // Mongoose will handle null/undefined values appropriately based on schema

          try {
            await Payment.create(record);
            imported++;
          } catch (err: any) {
            const errorMsg = err?.message || "Unknown error";
            const receiptNum = record.receiptNumber || "N/A";
            errors.push(`Row ${rowIdx + 2}: Failed to create payment - ${errorMsg}. Policy: "${record.policyId}", Amount: $${amount.toFixed(2)}, Receipt: "${receiptNum}". Record preview: ${rowData.substring(0, 100)}...`);
          }
        } else if (collectionType === "receipts") {
          // Resolve paymentId
          if (record.paymentId && record.paymentId !== null) {
            const paymentId = await findPaymentByIdentifier(record.paymentId);
            if (!paymentId) {
              errors.push(`Row ${rowIdx + 2}: Payment not found: ${record.paymentId}`);
              continue;
            }
            record.paymentId = paymentId;
          } else {
            // Skip rows with blank paymentId
            continue;
          }

          // Resolve policyId
          if (record.policyId && record.policyId !== null) {
            const policyId = await findPolicyByIdentifier(record.policyId);
            if (!policyId) {
              errors.push(`Row ${rowIdx + 2}: Policy not found: ${record.policyId}`);
              continue;
            }
            record.policyId = policyId;
          } else {
            // Skip rows with blank policyId
            continue;
          }

          // Resolve customerId
          if (record.customerId && record.customerId !== null) {
            const customerId = await findCustomerByIdentifier(record.customerId);
            if (!customerId) {
              errors.push(`Row ${rowIdx + 2}: Customer not found: ${record.customerId}`);
              continue;
            }
            record.customerId = customerId;
          } else {
            // Skip rows with blank customerId
            continue;
          }

          // Use defaults for blank required fields
          if (!record.receiptNumber || record.receiptNumber === null || record.receiptNumber === "") {
            record.receiptNumber = `RCP-${Date.now()}-${rowIdx}`;
          } else {
            // Ensure receiptNumber is stored as string
            record.receiptNumber = String(record.receiptNumber);
          }
          
          // Handle duplicate receipt numbers - append suffix if duplicate exists
          const existingReceipt = await Receipt.findOne({ receiptNumber: record.receiptNumber }).lean();
          const existingPayment = await Payment.findOne({ receiptNumber: record.receiptNumber }).lean();
          if (existingReceipt || existingPayment) {
            // Duplicate found - append suffix to make it unique
            record.receiptNumber = `${record.receiptNumber}-${Date.now()}-${rowIdx}`;
          }
          
          if (!record.amount || record.amount === null) {
            record.amount = 0;
          }
          if (!record.paymentDate || record.paymentDate === null) {
            record.paymentDate = new Date();
          }
          if (!record.status || record.status === null) {
            record.status = "active";
          }
          if (!record.generatedAt) {
            record.generatedAt = new Date();
          }

          // Set location based on policy ID prefix (VF = Vieux Fort)
          if (!record.location && record.policyId) {
            const policy = await Policy.findById(record.policyId).select("policyIdNumber").lean();
            if (policy?.policyIdNumber && policy.policyIdNumber.trim().toUpperCase().startsWith("VF")) {
              record.location = "Vieux Fort";
            }
          }

          // Keep optional fields even if blank - allow null values to be stored
          // Mongoose will handle null/undefined values appropriately based on schema

          try {
            await Receipt.create(record);
            imported++;
          } catch (err: any) {
            // Handle duplicate key errors - append suffix if duplicate exists (fallback if check failed)
            if (err?.code === 11000 || err?.message?.includes("duplicate key") || err?.message?.includes("E11000")) {
              // Duplicate receipt number - append suffix and retry
              const originalReceiptNumber = record.receiptNumber;
              record.receiptNumber = `${originalReceiptNumber}-${Date.now()}-${rowIdx}`;
              try {
                await Receipt.create(record);
                imported++;
              } catch (retryErr: any) {
                errors.push(`Row ${rowIdx + 2}: ${retryErr?.message || "Failed to create receipt (duplicate)"}`);
              }
            } else {
              errors.push(`Row ${rowIdx + 2}: ${err?.message || "Failed to create receipt"}`);
            }
          }
        }
      } catch (err: any) {
        const errorMsg = err?.message || "Unknown error";
        errors.push(`Row ${rowIdx + 2}: ${errorMsg}`);
      }
    }

    if (imported === 0 && errors.length === 0) {
      return json({ error: "No valid rows found to import" }, { status: 400 });
    }

    return json({
      success: true,
      imported,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

