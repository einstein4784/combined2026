import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { CoverageType } from "@/models/CoverageType";
import { Policy } from "@/models/Policy";
import { json, handleRouteError } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Keep only these coverage types
const KEEP_TYPES = ["Third Party", "Comprehensive"];

export async function POST(req: NextRequest) {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;

    await connectDb();

    // Get all coverage types
    const allCoverageTypes = await CoverageType.find().lean();
    
    // Identify types to delete (case-insensitive comparison)
    const typesToDelete = allCoverageTypes.filter(
      (ct) => !KEEP_TYPES.some((keep) => keep.toLowerCase() === ct.name.toLowerCase())
    );

    let deletedCount = 0;
    let updatedPoliciesCount = 0;

    // For each type to delete, update policies and then delete
    for (const coverageType of typesToDelete) {
      // Update all policies using this coverage type to use "Third Party"
      const result = await Policy.updateMany(
        { coverageType: coverageType.name },
        { $set: { coverageType: "Third Party" } }
      );
      
      updatedPoliciesCount += result.modifiedCount;

      // Delete the coverage type
      await CoverageType.findByIdAndDelete(coverageType._id);
      deletedCount++;
    }

    // Ensure the two required types exist
    for (const typeName of KEEP_TYPES) {
      const exists = await CoverageType.findOne({ 
        name: { $regex: new RegExp(`^${typeName}$`, 'i') } 
      });
      
      if (!exists) {
        await CoverageType.create({ name: typeName });
      }
    }

    return json({
      success: true,
      deletedCount,
      updatedPoliciesCount,
      remaining: KEEP_TYPES,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}


