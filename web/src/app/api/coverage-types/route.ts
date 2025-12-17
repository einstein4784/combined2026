import { connectDb } from "@/lib/db";
import { guardPermission, guardSession } from "@/lib/api-auth";
import { CoverageType } from "@/models/CoverageType";
import { json } from "@/lib/utils";
import { handleRouteError } from "@/lib/utils";

// Seed defaults if empty
async function ensureDefaults() {
  const count = await CoverageType.countDocuments();
  if (count === 0) {
    await CoverageType.insertMany([
      { name: "Third Party" },
      { name: "Fully Comprehensive" },
    ]);
  }
}

export async function GET() {
  try {
    // Any authenticated user should be able to view available coverage types
    const auth = await guardSession();
    if ("response" in auth) return auth.response;

    await connectDb();
    await ensureDefaults();

    const items = await CoverageType.find().sort({ name: 1 }).lean();
    return json({ items });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;

    const { name } = await req.json().catch(() => ({}));
    if (!name || typeof name !== "string" || !name.trim()) {
      return json({ error: "name is required" }, { status: 400 });
    }

    await connectDb();
    const trimmed = name.trim();
    const existing = await CoverageType.findOne({ name: trimmed });
    if (existing) {
      return json({ error: "Coverage type already exists" }, { status: 409 });
    }
    const created = await CoverageType.create({ name: trimmed });
    return json({ item: { _id: created._id.toString(), name: created.name } });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;

    const { id, name } = await req.json().catch(() => ({}));
    if (!id || typeof id !== "string") {
      return json({ error: "id is required" }, { status: 400 });
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      return json({ error: "name is required" }, { status: 400 });
    }

    await connectDb();
    const trimmed = name.trim();
    
    // Check if another coverage type already has this name
    const existing = await CoverageType.findOne({ name: trimmed, _id: { $ne: id } });
    if (existing) {
      return json({ error: "Coverage type with this name already exists" }, { status: 409 });
    }
    
    const updated = await CoverageType.findByIdAndUpdate(
      id,
      { name: trimmed },
      { new: true }
    );
    
    if (!updated) {
      return json({ error: "Coverage type not found" }, { status: 404 });
    }
    
    return json({ item: { _id: updated._id.toString(), name: updated.name } });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return json({ error: "id is required" }, { status: 400 });

    await connectDb();
    await CoverageType.findByIdAndDelete(id);
    return json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}


