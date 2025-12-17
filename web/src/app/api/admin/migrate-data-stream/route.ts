import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { Customer } from "@/models/Customer";
import { Policy } from "@/models/Policy";
import { Payment } from "@/models/Payment";
import { Receipt } from "@/models/Receipt";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Reuse the same helper functions from migrate-data route
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
      const cleaned = value.toString().replace(/[^\d.-]/g, "");
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    case "date":
      const dateStr = value.toString().trim();
      const mdyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (mdyMatch) {
        const [, month, day, year] = mdyMatch;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) return date;
      }
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    case "boolean":
      const lower = value.toLowerCase().trim();
      return lower === "true" || lower === "yes" || lower === "1";
    default:
      return value.toString();
  }
}

async function findCustomerByIdentifier(identifier: string): Promise<string | null> {
  if (!identifier) return null;
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const customer = await Customer.findById(identifier).lean();
    if (customer) return customer._id.toString();
  }
  const byEmail = await Customer.findOne({ email: identifier }).lean();
  if (byEmail) return byEmail._id.toString();
  const byIdNumber = await Customer.findOne({ idNumber: identifier }).lean();
  if (byIdNumber) return byIdNumber._id.toString();
  return null;
}

async function findPolicyByIdentifier(identifier: string): Promise<string | null> {
  if (!identifier) return null;
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const policy = await Policy.findById(identifier).lean();
    if (policy) return policy._id.toString();
  }
  const byPolicyNumber = await Policy.findOne({ policyNumber: identifier }).lean();
  if (byPolicyNumber) return byPolicyNumber._id.toString();
  return null;
}

async function findPaymentByIdentifier(identifier: string): Promise<string | null> {
  if (!identifier) return null;
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const payment = await Payment.findById(identifier).lean();
    if (payment) return payment._id.toString();
  }
  const byReceiptNumber = await Payment.findOne({ receiptNumber: identifier }).lean();
  if (byReceiptNumber) return byReceiptNumber._id.toString();
  return null;
}

// Create a readable stream for Server-Sent Events
function createProgressStream(
  csv: string,
  collectionType: string,
  fieldMappings: Record<string, string>,
  adminUser: any,
): ReadableStream {
  let imported = 0;
  const errors: string[] = [];
  let currentRow = 0;

    return new ReadableStream({
      async start(controller) {
        try {
          // Auth already checked in POST handler
          
          // Drop unique indexes to allow duplicates
          try {
            // Drop policy number unique index (if exists)
            await Policy.collection.dropIndex("policyNumber_1").catch(() => {
              // Index might not exist, ignore error
            });
            // Drop receipt number unique index (if exists)
            await Receipt.collection.dropIndex("receiptNumber_1").catch(() => {
              // Index might not exist, ignore error
            });
            // Drop customer idNumber unique index to allow duplicates
            await Customer.collection.dropIndex("idNumber_1").catch(() => {
              // Index might not exist, ignore error
            });
            // Drop payment receiptNumber unique index to allow duplicates
            await Payment.collection.dropIndex("receiptNumber_1").catch(() => {
              // Index might not exist, ignore error
            });
          } catch (e) {
            // Ignore if index doesn't exist or can't be dropped
          }

          const parsed = parseCsv(csv);
          if (parsed.headers.length === 0) {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ type: "error", error: "CSV file is empty or invalid" })}\n\n`,
              ),
            );
            controller.close();
            return;
          }

          const columnIndexMap: Record<string, number> = {};
          parsed.headers.forEach((header, idx) => {
            columnIndexMap[header] = idx;
          });

          const totalRows = parsed.rows.length;

          // Send initial progress
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ type: "progress", current: 0, total: totalRows, imported: 0, errors: 0 })}\n\n`,
            ),
          );

          for (let rowIdx = 0; rowIdx < parsed.rows.length; rowIdx++) {
            const row = parsed.rows[rowIdx];
            currentRow = rowIdx + 1;

            if (row.length === 0 || row.every((cell) => !cell || cell.trim() === "")) {
              // Send progress update for skipped row
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ type: "progress", current: currentRow, total: totalRows, imported, errors: errors.length })}\n\n`,
                ),
              );
              continue;
            }

            try {
              const record: any = {};

              // Map fields based on mappings
              for (const [dbField, csvColumn] of Object.entries(fieldMappings)) {
                const colIdx = columnIndexMap[csvColumn as string];
                if (colIdx === undefined || colIdx >= row.length) {
                  if (dbField === "receiptNumber") {
                    record[dbField] = "";
                  } else {
                    record[dbField] = null;
                  }
                  continue;
                }

                const value = row[colIdx];
                if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
                  if (dbField === "receiptNumber") {
                    record[dbField] = "";
                  } else {
                    record[dbField] = null;
                  }
                  continue;
                }

                let fieldType: "string" | "number" | "date" | "boolean" = "string";
                if (collectionType === "customers") {
                  fieldType = "string";
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

              // Process based on collection type
              if (collectionType === "customers") {
                // Handle customers import
                if (!record.firstName || record.firstName === null) record.firstName = "Unknown";
                if (!record.lastName || record.lastName === null) record.lastName = "Customer";
                if (!record.address || record.address === null) record.address = "Not provided";
                if (!record.contactNumber || record.contactNumber === null) record.contactNumber = "000-0000";
                if (!record.idNumber || record.idNumber === null) {
                  record.idNumber = `TEMP-${Date.now()}-${rowIdx}`;
                }
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
                
                // Handle optional fields - trim and set to null if empty
                if (record.middleName && typeof record.middleName === "string") {
                  record.middleName = record.middleName.trim() || null;
                }
                if (record.contactNumber2 && typeof record.contactNumber2 === "string") {
                  record.contactNumber2 = record.contactNumber2.trim() || null;
                }
                if (record.sex && typeof record.sex === "string") {
                  record.sex = record.sex.trim() || null;
                }
                
                try {
                  await Customer.create(record);
                  imported++;
                } catch (err: any) {
                  const error = `Row ${rowIdx + 2}: ${err?.message || "Failed to create customer"}`;
                  errors.push(error);
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", error, row: rowIdx + 2 })}\n\n`),
                  );
                }
                // Send progress update after each customer row
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({ type: "progress", current: currentRow, total: totalRows, imported, errors: errors.length })}\n\n`,
                  ),
                );
              } else if (collectionType === "policies") {
                // Handle policies import
                if (record.customerId && record.customerId !== null && record.customerId !== "") {
                  const customerId = await findCustomerByIdentifier(record.customerId);
                  if (!customerId) {
                    const error = `Row ${rowIdx + 2}: Customer not found: ${record.customerId}`;
                    errors.push(error);
                    controller.enqueue(
                      new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", error, row: rowIdx + 2 })}\n\n`),
                    );
                    // Send progress update even on error
                    controller.enqueue(
                      new TextEncoder().encode(
                        `data: ${JSON.stringify({ type: "progress", current: currentRow, total: totalRows, imported, errors: errors.length })}\n\n`,
                      ),
                    );
                    continue;
                  }
                  record.customerId = customerId;
                } else {
                  // Send progress update even when skipping
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({ type: "progress", current: currentRow, total: totalRows, imported, errors: errors.length })}\n\n`,
                    ),
                  );
                  continue;
                }
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
                if (record.amountPaid === undefined || record.amountPaid === null) record.amountPaid = 0;
                if (record.outstandingBalance === undefined || record.outstandingBalance === null || record.outstandingBalance === "") {
                  record.outstandingBalance = Math.max(record.totalPremiumDue - (record.amountPaid || 0), 0);
                } else {
                  const outstandingBalanceNum = Number(record.outstandingBalance);
                  if (isNaN(outstandingBalanceNum) || outstandingBalanceNum < 0) {
                    record.outstandingBalance = 0;
                  } else {
                    record.outstandingBalance = outstandingBalanceNum;
                  }
                }
                if (!record.status || record.status === null) record.status = "Active";
                if (!record.coverageType || record.coverageType === null) record.coverageType = "Third Party";
                
                // Handle optional string fields - trim and set to null if empty
                if (record.registrationNumber && typeof record.registrationNumber === "string") {
                  record.registrationNumber = record.registrationNumber.trim() || null;
                }
                if (record.engineNumber && typeof record.engineNumber === "string") {
                  record.engineNumber = record.engineNumber.trim() || null;
                }
                if (record.chassisNumber && typeof record.chassisNumber === "string") {
                  record.chassisNumber = record.chassisNumber.trim() || null;
                }
                if (record.vehicleType && typeof record.vehicleType === "string") {
                  record.vehicleType = record.vehicleType.trim() || null;
                }
                if (record.notes && typeof record.notes === "string") {
                  record.notes = record.notes.trim() || null;
                }
                
                try {
                  await Policy.create(record);
                  imported++;
                } catch (err: any) {
                  // Handle duplicate key errors - append suffix if duplicate exists
                  if (err?.code === 11000 || err?.message?.includes("duplicate key") || err?.message?.includes("E11000")) {
                    // Duplicate policy number - append suffix and retry
                    const originalPolicyNumber = record.policyNumber;
                    record.policyNumber = `${originalPolicyNumber}-${Date.now()}-${rowIdx}`;
                    try {
                      await Policy.create(record);
                      imported++;
                    } catch (retryErr: any) {
                      const error = `Row ${rowIdx + 2}: ${retryErr?.message || "Failed to create policy (duplicate)"}`;
                      errors.push(error);
                      controller.enqueue(
                        new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", error, row: rowIdx + 2 })}\n\n`),
                      );
                    }
                  } else {
                    const error = `Row ${rowIdx + 2}: ${err?.message || "Failed to create policy"}`;
                    errors.push(error);
                    controller.enqueue(
                      new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", error, row: rowIdx + 2 })}\n\n`),
                    );
                  }
                }
                // Send progress update after each policy row
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({ type: "progress", current: currentRow, total: totalRows, imported, errors: errors.length })}\n\n`,
                  ),
                );
              } else if (collectionType === "payments") {
                const rowData = row.slice(0, Math.min(10, row.length)).join(" | ");
                if (record.policyId && record.policyId !== null && record.policyId !== "") {
                  const policyId = await findPolicyByIdentifier(record.policyId);
                  if (!policyId) {
                    const error = `Row ${rowIdx + 2}: Policy not found: "${record.policyId}". Record preview: ${rowData.substring(0, 100)}...`;
                    errors.push(error);
                    controller.enqueue(
                      new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", error, row: rowIdx + 2 })}\n\n`),
                    );
                    continue;
                  }
                  record.policyId = policyId;
                } else {
                  const error = `Row ${rowIdx + 2}: Policy ID is blank/required. Record preview: ${rowData.substring(0, 100)}...`;
                  errors.push(error);
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", error, row: rowIdx + 2 })}\n\n`),
                  );
                  // Send progress update even on error
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({ type: "progress", current: currentRow, total: totalRows, imported, errors: errors.length })}\n\n`,
                    ),
                  );
                  continue;
                }

                const policy = await Policy.findById(record.policyId);
                if (!policy) {
                  const error = `Row ${rowIdx + 2}: Policy with ID "${record.policyId}" not found in database.`;
                  errors.push(error);
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", error, row: rowIdx + 2 })}\n\n`),
                  );
                  // Send progress update even on error
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({ type: "progress", current: currentRow, total: totalRows, imported, errors: errors.length })}\n\n`,
                    ),
                  );
                  continue;
                }

                let amount = 0;
                if (record.amount !== null && record.amount !== undefined && record.amount !== "") {
                  const amountNum = typeof record.amount === "number" ? record.amount : Number(record.amount);
                  if (!isNaN(amountNum) && amountNum >= 0) {
                    amount = amountNum;
                  }
                }

                let refundAmount = 0;
                if (record.refundAmount !== null && record.refundAmount !== undefined && record.refundAmount !== "") {
                  const refundNum = typeof record.refundAmount === "number" ? record.refundAmount : Number(record.refundAmount);
                  if (!isNaN(refundNum) && refundNum >= 0) {
                    refundAmount = refundNum;
                  }
                }

                let receiptNumber = "";
                if (!record.receiptNumber || record.receiptNumber === null || record.receiptNumber === "") {
                  receiptNumber = `RCP-${Date.now()}-${rowIdx}-${Math.random().toString(36).substring(2, 8)}`;
                } else {
                  receiptNumber = String(record.receiptNumber);
                }

                // Check for duplicates and append suffix if needed
                const existingPayment = await Payment.findOne({ receiptNumber }).lean();
                if (existingPayment) {
                  receiptNumber = `${receiptNumber}-${Date.now()}-${rowIdx}`;
                }
                record.receiptNumber = receiptNumber;

                if (amount > 0 || refundAmount > 0) {
                  const totalPremiumDue = Number(policy.totalPremiumDue ?? 0);
                  const amountPaidSoFar = Number((policy as any).amountPaid ?? 0);
                  const appliedToOutstanding = amount + refundAmount;

                  // Allow payments to exceed outstanding balance - no validation needed
                  const newAmountPaid = Math.max(amountPaidSoFar + appliedToOutstanding, 0);
                  policy.amountPaid = newAmountPaid;
                  policy.outstandingBalance = Math.max(totalPremiumDue - newAmountPaid, 0);
                  await policy.save();
                }

                if (!record.paymentDate || record.paymentDate === null) record.paymentDate = new Date();
                if (!record.paymentMethod || record.paymentMethod === null) record.paymentMethod = "Cash";
                if (record.arrearsOverrideUsed === undefined || record.arrearsOverrideUsed === null) {
                  record.arrearsOverrideUsed = false;
                }

                record.receivedBy = adminUser.id;
                record.amount = amount;
                record.refundAmount = refundAmount;

                try {
                  await Payment.create(record);
                  imported++;
                } catch (err: any) {
                  const error = `Row ${rowIdx + 2}: Failed to create payment - ${err?.message || "Unknown error"}. Policy: "${record.policyId}", Amount: $${amount.toFixed(2)}, Receipt: "${receiptNumber}".`;
                  errors.push(error);
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", error, row: rowIdx + 2 })}\n\n`),
                  );
                }
                
                // Send progress update after each payment row
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({ type: "progress", current: currentRow, total: totalRows, imported, errors: errors.length })}\n\n`,
                  ),
                );
              } else if (collectionType === "receipts") {
                // Resolve paymentId
                const rowData = row.slice(0, Math.min(10, row.length)).join(" | ");
                if (record.paymentId && record.paymentId !== null && record.paymentId !== "") {
                  const paymentId = await findPaymentByIdentifier(record.paymentId);
                  if (!paymentId) {
                    const error = `Row ${rowIdx + 2}: Payment not found: ${record.paymentId}. Record preview: ${rowData.substring(0, 100)}...`;
                    errors.push(error);
                    controller.enqueue(
                      new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", error, row: rowIdx + 2 })}\n\n`),
                    );
                    // Send progress update even on error
                    controller.enqueue(
                      new TextEncoder().encode(
                        `data: ${JSON.stringify({ type: "progress", current: currentRow, total: totalRows, imported, errors: errors.length })}\n\n`,
                      ),
                    );
                    continue;
                  }
                  record.paymentId = paymentId;
                } else {
                  const error = `Row ${rowIdx + 2}: Payment ID is blank/required. Record preview: ${rowData.substring(0, 100)}...`;
                  errors.push(error);
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", error, row: rowIdx + 2 })}\n\n`),
                  );
                  // Send progress update even on error
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({ type: "progress", current: currentRow, total: totalRows, imported, errors: errors.length })}\n\n`,
                    ),
                  );
                  continue;
                }

                // Resolve policyId
                if (record.policyId && record.policyId !== null && record.policyId !== "") {
                  const policyId = await findPolicyByIdentifier(record.policyId);
                  if (!policyId) {
                    const error = `Row ${rowIdx + 2}: Policy not found: ${record.policyId}. Record preview: ${rowData.substring(0, 100)}...`;
                    errors.push(error);
                    controller.enqueue(
                      new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", error, row: rowIdx + 2 })}\n\n`),
                    );
                    // Send progress update even on error
                    controller.enqueue(
                      new TextEncoder().encode(
                        `data: ${JSON.stringify({ type: "progress", current: currentRow, total: totalRows, imported, errors: errors.length })}\n\n`,
                      ),
                    );
                    continue;
                  }
                  record.policyId = policyId;
                } else {
                  const error = `Row ${rowIdx + 2}: Policy ID is blank/required. Record preview: ${rowData.substring(0, 100)}...`;
                  errors.push(error);
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", error, row: rowIdx + 2 })}\n\n`),
                  );
                  // Send progress update even on error
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({ type: "progress", current: currentRow, total: totalRows, imported, errors: errors.length })}\n\n`,
                    ),
                  );
                  continue;
                }

                // Resolve customerId
                if (record.customerId && record.customerId !== null && record.customerId !== "") {
                  const customerId = await findCustomerByIdentifier(record.customerId);
                  if (!customerId) {
                    const error = `Row ${rowIdx + 2}: Customer not found: ${record.customerId}. Record preview: ${rowData.substring(0, 100)}...`;
                    errors.push(error);
                    controller.enqueue(
                      new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", error, row: rowIdx + 2 })}\n\n`),
                    );
                    // Send progress update even on error
                    controller.enqueue(
                      new TextEncoder().encode(
                        `data: ${JSON.stringify({ type: "progress", current: currentRow, total: totalRows, imported, errors: errors.length })}\n\n`,
                      ),
                    );
                    continue;
                  }
                  record.customerId = customerId;
                } else {
                  const error = `Row ${rowIdx + 2}: Customer ID is blank/required. Record preview: ${rowData.substring(0, 100)}...`;
                  errors.push(error);
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", error, row: rowIdx + 2 })}\n\n`),
                  );
                  // Send progress update even on error
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({ type: "progress", current: currentRow, total: totalRows, imported, errors: errors.length })}\n\n`,
                    ),
                  );
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
                
                // Handle optional fields - trim and set to null if empty
                if (record.location && typeof record.location === "string") {
                  record.location = record.location.trim() || null;
                }
                if (record.registrationNumber && typeof record.registrationNumber === "string") {
                  record.registrationNumber = record.registrationNumber.trim() || null;
                }
                if (record.paymentMethod && typeof record.paymentMethod === "string") {
                  record.paymentMethod = record.paymentMethod.trim() || null;
                }
                if (record.policyNumberSnapshot && typeof record.policyNumberSnapshot === "string") {
                  record.policyNumberSnapshot = record.policyNumberSnapshot.trim() || null;
                }
                if (record.policyIdNumberSnapshot && typeof record.policyIdNumberSnapshot === "string") {
                  record.policyIdNumberSnapshot = record.policyIdNumberSnapshot.trim() || null;
                }
                if (record.customerNameSnapshot && typeof record.customerNameSnapshot === "string") {
                  record.customerNameSnapshot = record.customerNameSnapshot.trim() || null;
                }
                if (record.customerEmailSnapshot && typeof record.customerEmailSnapshot === "string") {
                  record.customerEmailSnapshot = record.customerEmailSnapshot.trim() || null;
                }
                if (record.customerContactSnapshot && typeof record.customerContactSnapshot === "string") {
                  record.customerContactSnapshot = record.customerContactSnapshot.trim() || null;
                }
                if (record.generatedByName && typeof record.generatedByName === "string") {
                  record.generatedByName = record.generatedByName.trim() || null;
                }
                if (record.notes && typeof record.notes === "string") {
                  record.notes = record.notes.trim() || null;
                }

                try {
                  await Receipt.create(record);
                  imported++;
                } catch (err: any) {
                  // Handle duplicate key errors - append suffix if duplicate exists
                  if (err?.code === 11000 || err?.message?.includes("duplicate key") || err?.message?.includes("E11000")) {
                    // Duplicate receipt number - append suffix and retry
                    const originalReceiptNumber = record.receiptNumber;
                    record.receiptNumber = `${originalReceiptNumber}-${Date.now()}-${rowIdx}`;
                    try {
                      await Receipt.create(record);
                      imported++;
                    } catch (retryErr: any) {
                      const error = `Row ${rowIdx + 2}: ${retryErr?.message || "Failed to create receipt (duplicate)"}`;
                      errors.push(error);
                      controller.enqueue(
                        new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", error, row: rowIdx + 2 })}\n\n`),
                      );
                    }
                  } else {
                    const error = `Row ${rowIdx + 2}: ${err?.message || "Failed to create receipt"}`;
                    errors.push(error);
                    controller.enqueue(
                      new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", error, row: rowIdx + 2 })}\n\n`),
                    );
                  }
                }
                
                // Send progress update after each receipt row
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({ type: "progress", current: currentRow, total: totalRows, imported, errors: errors.length })}\n\n`,
                  ),
                );
              }
            } catch (err: any) {
              const error = `Row ${rowIdx + 2}: ${err?.message || "Unknown error"}`;
              errors.push(error);
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", error, row: rowIdx + 2 })}\n\n`),
              );
            }
          }

          // Send final result
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ type: "complete", imported, errors, total: totalRows })}\n\n`,
            ),
          );
          controller.close();
        } catch (error: any) {
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ type: "error", error: error?.message || "Migration failed" })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) {
      return auth.response;
    }

    const body = await req.json().catch(() => ({}));
    const { csv, collectionType, fieldMappings } = body;

    if (typeof csv !== "string" || !csv.trim()) {
      return new Response(JSON.stringify({ error: "CSV content is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!["customers", "policies", "payments", "receipts"].includes(collectionType)) {
      return new Response(JSON.stringify({ error: "Invalid collection type" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await connectDb();

    const stream = createProgressStream(csv, collectionType, fieldMappings, auth.session);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Migration failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

