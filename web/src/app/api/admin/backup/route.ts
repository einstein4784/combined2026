import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { Customer } from "@/models/Customer";
import { Policy } from "@/models/Policy";
import { Payment } from "@/models/Payment";
import { Receipt } from "@/models/Receipt";
import { User } from "@/models/User";
import { RolePermission } from "@/models/RolePermission";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

type CollectionName = "customers" | "policies" | "payments" | "receipts" | "users" | "rolePermissions";

const COLLECTIONS: Record<CollectionName, any> = {
  customers: Customer,
  policies: Policy,
  payments: Payment,
  receipts: Receipt,
  users: User,
  rolePermissions: RolePermission,
};

function serializeRow(collection: CollectionName, doc: any) {
  const plain = { ...doc };
  delete (plain as any).__v;
  return {
    collection,
    data: JSON.stringify(plain),
  };
}

function toCsv(rows: { collection: string; data: string }[]) {
  const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
  const lines = ["collection,data", ...rows.map((r) => `${escape(r.collection)},${escape(r.data)}`)];
  return lines.join("\n");
}

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
      result.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  result.push(current);
  return result;
}

function parseCsv(text: string): { collection: CollectionName; data: any }[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length < 2) return [];

  const headerCols = splitCsvRow(lines[0].trim()).map((h) => h.trim().toLowerCase());
  const colIdx = {
    collection: headerCols.findIndex((h) => h === "collection"),
    data: headerCols.findIndex((h) => h === "data"),
  };
  if (colIdx.collection === -1 || colIdx.data === -1) return [];

  const rows: { collection: CollectionName; data: any }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvRow(lines[i]);
    const collectionVal = cols[colIdx.collection]?.replace(/\r$/, "");
    const dataVal = cols[colIdx.data]?.replace(/\r$/, "");
    if (!collectionVal || !dataVal) continue;
    if (
      !["customers", "policies", "payments", "receipts", "users", "rolepermissions"].includes(
        collectionVal.toLowerCase(),
      )
    )
      continue;
    const collection = (collectionVal.toLowerCase() === "rolepermissions"
      ? "rolePermissions"
      : (collectionVal as CollectionName)) as CollectionName;
    try {
      const obj = JSON.parse(dataVal);
      rows.push({ collection, data: obj });
    } catch {
      // skip invalid rows
    }
  }
  return rows;
}

export async function GET() {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;

    await connectDb();
    const rows: { collection: string; data: string }[] = [];
    const entries = await Promise.all(
      (Object.keys(COLLECTIONS) as CollectionName[]).map(async (name) => {
        const docs = await COLLECTIONS[name].find().lean();
        return docs.map((d: any) => serializeRow(name, d));
      }),
    );
    entries.forEach((arr) => rows.push(...arr));

    const csv = toCsv(rows);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=backup.csv",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;

    const { csv, mode } = await req.json().catch(() => ({}));
    if (typeof csv !== "string" || !csv.trim()) {
      return json({ error: "csv is required" }, { status: 400 });
    }
    if (!["merge", "replace"].includes(mode)) {
      return json({ error: "mode must be merge or replace" }, { status: 400 });
    }

    await connectDb();

    if (mode === "replace") {
      await Promise.all(
        (Object.keys(COLLECTIONS) as CollectionName[]).map((name) => COLLECTIONS[name].deleteMany({})),
      );
    }

    const rows = parseCsv(csv);
    if (!rows.length) {
      return json(
        {
          error:
            "No valid rows found in CSV. Ensure headers include 'collection' and 'data' with JSON payload.",
        },
        { status: 400 },
      );
    }

    let imported = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const Model = COLLECTIONS[row.collection];
      if (!Model) continue;
      try {
        const payload = { ...(row.data || {}) };
        const hasId = payload && payload._id;
        const validId = hasId && mongoose.Types.ObjectId.isValid(payload._id);
        if (!validId) {
          delete (payload as any)._id;
        }

        if (validId) {
          await Model.findOneAndUpdate({ _id: payload._id }, payload, { upsert: true, new: true });
        } else {
          await Model.create(payload);
        }
        imported += 1;
      } catch (e: any) {
        errors.push(`${row.collection}: ${e?.message || "import failed"}`);
      }
    }

    return json({ success: true, imported, errors: errors.length ? errors : undefined });
  } catch (error) {
    return handleRouteError(error);
  }
}

