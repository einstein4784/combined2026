import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { Policy } from "@/models/Policy";
import { Payment } from "@/models/Payment";
import { Receipt } from "@/models/Receipt";
import { User } from "@/models/User";
import { logAuditAction } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

function parseValue(value: string, type: "string" | "number" | "date"): any {
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
    default:
      return value.toString().trim();
  }
}

function generateReceiptNumber(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `RCP-${timestamp}-${random}`.toUpperCase();
}

async function findPolicyByIdentifier(identifier: string): Promise<any> {
  if (!identifier) return null;

  const policy = await Policy.findOne({
    $or: [
      { policyNumber: { $regex: new RegExp(`^${identifier}$`, 'i') } },
      { policyIdNumber: { $regex: new RegExp(`^${identifier}$`, 'i') } },
    ],
  });

  return policy;
}

function createProgressStream(
  csv: string,
  fieldMappings: Record<string, string>,
  adminUser: any,
): ReadableStream {
  let imported = 0;
  const errors: string[] = [];
  const warnings: string[] = [];
  let currentRow = 0;

  return new ReadableStream({
    async start(controller) {
      try {
        await connectDb();

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

        // Get user info
        const user = await User.findById(adminUser.id).select("fullName users_location").lean();
        const receivedByName = user?.fullName || "Admin";
        const userLocation = (user as any)?.users_location || null;

        const columnIndexMap: Record<string, number> = {};
        parsed.headers.forEach((header, idx) => {
          columnIndexMap[header] = idx;
        });

        const totalRows = parsed.rows.length;

        // Send initial progress
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ type: "progress", current: 0, total: totalRows, imported: 0, errors: 0, warnings: 0 })}\n\n`,
          ),
        );

        for (let rowIdx = 0; rowIdx < parsed.rows.length; rowIdx++) {
          const row = parsed.rows[rowIdx];
          currentRow = rowIdx + 1;

          if (row.length === 0 || row.every((cell) => !cell || cell.trim() === "")) {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ type: "progress", current: currentRow, total: totalRows, imported, errors: errors.length, warnings: warnings.length })}\n\n`,
              ),
            );
            continue;
          }

          try {
            const record: any = {};

            // Map fields
            for (const [dbField, csvColumn] of Object.entries(fieldMappings)) {
              const colIdx = columnIndexMap[csvColumn as string];
              if (colIdx === undefined || colIdx >= row.length) {
                record[dbField] = null;
                continue;
              }

              const value = row[colIdx];
              if (!value || value.trim() === "") {
                record[dbField] = null;
                continue;
              }

              let fieldType: "string" | "number" | "date" = "string";
              if (["amount", "refundAmount"].includes(dbField)) {
                fieldType = "number";
              } else if (dbField === "paymentDate") {
                fieldType = "date";
              }

              record[dbField] = parseValue(value, fieldType);
            }

            // Validate
            if (!record.policyIdentifier) {
              const error = `Row ${rowIdx + 2}: Policy identifier is required`;
              errors.push(error);
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", error, row: rowIdx + 2 })}\n\n`),
              );
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ type: "progress", current: currentRow, total: totalRows, imported, errors: errors.length, warnings: warnings.length })}\n\n`,
                ),
              );
              continue;
            }

            // Find policy
            const policy = await findPolicyByIdentifier(record.policyIdentifier);
            if (!policy) {
              const error = `Row ${rowIdx + 2}: Policy "${record.policyIdentifier}" not found`;
              errors.push(error);
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", error, row: rowIdx + 2 })}\n\n`),
              );
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ type: "progress", current: currentRow, total: totalRows, imported, errors: errors.length, warnings: warnings.length })}\n\n`,
                ),
              );
              continue;
            }

            const amount = Number(record.amount || 0);
            const refundAmount = Number(record.refundAmount || 0);

            if (amount === 0 && refundAmount === 0) {
              const warning = `Row ${rowIdx + 2}: Payment has zero amount, skipping`;
              warnings.push(warning);
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ type: "warning", error: warning, row: rowIdx + 2 })}\n\n`),
              );
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ type: "progress", current: currentRow, total: totalRows, imported, errors: errors.length, warnings: warnings.length })}\n\n`,
                ),
              );
              continue;
            }

            const paymentDate = record.paymentDate || new Date();

            // Check for duplicate
            const startOfDay = new Date(paymentDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(paymentDate);
            endOfDay.setHours(23, 59, 59, 999);

            const duplicatePayment = await Payment.findOne({
              policyId: policy._id,
              amount: amount,
              refundAmount: refundAmount,
              paymentDate: { $gte: startOfDay, $lte: endOfDay },
            }).lean();

            if (duplicatePayment) {
              const warning = `Row ${rowIdx + 2}: Duplicate payment detected for policy "${record.policyIdentifier}", skipping`;
              warnings.push(warning);
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ type: "warning", error: warning, row: rowIdx + 2 })}\n\n`),
              );
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ type: "progress", current: currentRow, total: totalRows, imported, errors: errors.length, warnings: warnings.length })}\n\n`,
                ),
              );
              continue;
            }

            // Update policy
            const totalPremiumDue = Number(policy.totalPremiumDue ?? 0);
            const amountPaidSoFar = Number(policy.amountPaid ?? 0);
            const appliedToOutstanding = amount + refundAmount;
            const newAmountPaid = Math.max(amountPaidSoFar + appliedToOutstanding, 0);

            policy.amountPaid = newAmountPaid;
            policy.outstandingBalance = Math.max(totalPremiumDue - newAmountPaid, 0);
            await policy.save();

            // Generate receipt number
            let receiptNumber = record.receiptNumber?.toString().trim();
            if (!receiptNumber) {
              receiptNumber = generateReceiptNumber();
            } else {
              const existingPayment = await Payment.findOne({ receiptNumber }).lean();
              if (existingPayment) {
                receiptNumber = `${receiptNumber}-${Date.now()}`;
              }
            }

            // Create payment
            const payment = await Payment.create({
              policyId: policy._id,
              amount: amount,
              refundAmount: refundAmount,
              paymentDate: paymentDate,
              paymentMethod: record.paymentMethod || "Cash",
              receiptNumber: receiptNumber,
              receivedBy: adminUser.id,
              notes: record.notes || null,
            });

            // Determine location
            let receiptLocation = userLocation || undefined;
            if (policy.policyIdNumber && policy.policyIdNumber.trim().toUpperCase().startsWith("VF")) {
              receiptLocation = "Vieux Fort";
            } else if (policy.policyIdNumber && policy.policyIdNumber.trim().toUpperCase().startsWith("SF")) {
              receiptLocation = "Soufriere";
            }

            // Create receipt
            const customerData = await policy.populate("customerId", "firstName lastName email contactNumber");

            await Receipt.create({
              receiptNumber: receiptNumber,
              paymentId: payment._id,
              policyId: policy._id,
              customerId: policy.customerId,
              amount: amount,
              paymentDate: payment.paymentDate,
              generatedBy: adminUser.id,
              generatedByName: receivedByName,
              paymentMethod: record.paymentMethod || "Cash",
              notes: record.notes || null,
              location: receiptLocation,
              registrationNumber: policy.registrationNumber || "TBA",
              policyNumberSnapshot: policy.policyNumber,
              policyIdNumberSnapshot: policy.policyIdNumber,
              customerNameSnapshot: `${(policy as any).customerId?.firstName ?? ""} ${
                (policy as any).customerId?.lastName ?? ""
              }`.trim(),
              customerEmailSnapshot: (policy as any).customerId?.email,
              customerContactSnapshot: (policy as any).customerId?.contactNumber,
              outstandingBalanceAfter: policy.outstandingBalance,
            });

            // Log audit
            await logAuditAction({
              userId: adminUser.id,
              action: "RECEIVE_PAYMENT",
              entityType: "Payment",
              entityId: payment._id.toString(),
              details: { policyId: policy._id, amount, receivedByName, source: "bulk_upload" },
            });

            imported++;
          } catch (err: any) {
            const error = `Row ${rowIdx + 2}: ${err.message || "Unknown error"}`;
            errors.push(error);
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", error, row: rowIdx + 2 })}\n\n`),
            );
          }

          // Send progress update
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ type: "progress", current: currentRow, total: totalRows, imported, errors: errors.length, warnings: warnings.length })}\n\n`,
            ),
          );
        }

        // Send final result
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ type: "complete", imported, errors, warnings, total: totalRows })}\n\n`,
          ),
        );
        controller.close();
      } catch (error: any) {
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ type: "error", error: error?.message || "Upload failed" })}\n\n`,
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
    const { csv, fieldMappings } = body;

    if (typeof csv !== "string" || !csv.trim()) {
      return new Response(JSON.stringify({ error: "CSV content is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await connectDb();

    const stream = createProgressStream(csv, fieldMappings, auth.session);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Upload failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

