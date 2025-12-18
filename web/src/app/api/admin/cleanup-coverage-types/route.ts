import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { CoverageType } from "@/models/CoverageType";
import { Policy } from "@/models/Policy";
import { json, handleRouteError } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Common vehicle types that were likely added by mistake
const VEHICLE_TYPES = [
  "Sedan",
  "SUV",
  "Truck",
  "Van",
  "Motorcycle",
  "Coupe",
  "Hatchback",
  "Wagon",
  "Minivan",
  "Pickup",
  "Bus",
  "Convertible",
  "Sports Car",
  "Crossover",
  "Jeep",
  "Scooter",
  "ATV",
  "RV",
  "Trailer",
  "Commercial Vehicle",
  "Heavy Duty",
  "Light Truck",
  "Panel Van",
];

// Legitimate coverage types to keep
const LEGITIMATE_COVERAGE_TYPES = [
  "Third Party",
  "Fully Comprehensive",
  "Comprehensive",
  "Collision",
  "Fire and Theft",
  "Fire & Theft",
  "Third Party Fire and Theft",
  "Third Party Fire & Theft",
  "Liability",
  "Personal Injury",
  "Property Damage",
  "Uninsured Motorist",
  "Underinsured Motorist",
];

// GET endpoint to list all coverage types and identify vehicle types
export async function GET(req: NextRequest) {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;

    await connectDb();

    const allCoverageTypes = await CoverageType.find().sort({ name: 1 }).lean();
    
    // Categorize coverage types
    const vehicleTypes: any[] = [];
    const coverageTypes: any[] = [];
    const uncertain: any[] = [];

    for (const ct of allCoverageTypes) {
      const name = ct.name.trim();
      
      // Check if it's a known vehicle type (case-insensitive)
      const isVehicleType = VEHICLE_TYPES.some(
        (vt) => vt.toLowerCase() === name.toLowerCase()
      );
      
      // Check if it's a legitimate coverage type
      const isLegitimateCoverage = LEGITIMATE_COVERAGE_TYPES.some(
        (lct) => lct.toLowerCase() === name.toLowerCase()
      );
      
      // Count how many policies use this coverage type
      const policyCount = await Policy.countDocuments({ coverageType: name });
      
      const item = {
        _id: ct._id.toString(),
        name: ct.name,
        policyCount,
      };
      
      if (isVehicleType) {
        vehicleTypes.push(item);
      } else if (isLegitimateCoverage) {
        coverageTypes.push(item);
      } else {
        uncertain.push(item);
      }
    }

    return json({
      summary: {
        total: allCoverageTypes.length,
        vehicleTypes: vehicleTypes.length,
        coverageTypes: coverageTypes.length,
        uncertain: uncertain.length,
      },
      vehicleTypes,
      coverageTypes,
      uncertain,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

// POST endpoint to delete vehicle types
export async function POST(req: NextRequest) {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;

    const body = await req.json().catch(() => ({}));
    const { idsToDelete, defaultReplacement } = body;

    if (!Array.isArray(idsToDelete) || idsToDelete.length === 0) {
      return json({ error: "idsToDelete array is required" }, { status: 400 });
    }

    await connectDb();

    let deletedCount = 0;
    let updatedPoliciesCount = 0;
    const errors: string[] = [];

    for (const id of idsToDelete) {
      try {
        // Find the coverage type to get its name
        const coverageType = await CoverageType.findById(id);
        if (!coverageType) {
          errors.push(`Coverage type with ID ${id} not found`);
          continue;
        }

        const coverageTypeName = coverageType.name;

        // If a default replacement is provided, update all policies using this coverage type
        if (defaultReplacement && typeof defaultReplacement === "string") {
          const result = await Policy.updateMany(
            { coverageType: coverageTypeName },
            { $set: { coverageType: defaultReplacement } }
          );
          updatedPoliciesCount += result.modifiedCount;
        } else {
          // Check if any policies are using this coverage type
          const policyCount = await Policy.countDocuments({ coverageType: coverageTypeName });
          if (policyCount > 0) {
            errors.push(
              `Cannot delete "${coverageTypeName}" - ${policyCount} policies are using it. Provide a defaultReplacement or update policies first.`
            );
            continue;
          }
        }

        // Delete the coverage type
        await CoverageType.findByIdAndDelete(id);
        deletedCount++;
      } catch (err: any) {
        errors.push(`Error deleting ${id}: ${err?.message || "Unknown error"}`);
      }
    }

    return json({
      success: true,
      deletedCount,
      updatedPoliciesCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}


