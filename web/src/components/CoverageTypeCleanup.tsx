"use client";

import { useState, useEffect } from "react";
import { showGlobalError } from "@/components/GlobalErrorPopup";
import { showSuccessToast } from "@/components/GlobalSuccessToast";

type CoverageTypeItem = {
  _id: string;
  name: string;
  policyCount: number;
};

type CleanupData = {
  summary: {
    total: number;
    vehicleTypes: number;
    coverageTypes: number;
    uncertain: number;
  };
  vehicleTypes: CoverageTypeItem[];
  coverageTypes: CoverageTypeItem[];
  uncertain: CoverageTypeItem[];
};

export function CoverageTypeCleanup() {
  const [data, setData] = useState<CleanupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/cleanup-coverage-types");
      if (!res.ok) throw new Error("Failed to load coverage types");
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      showGlobalError({ title: "Load failed", message: err.message || "Could not load coverage types" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const deleteItem = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?\n\nPolicies using this type will be updated to "Third Party".`)) {
      return;
    }

    try {
      setDeleting(id);
      const res = await fetch("/api/admin/cleanup-coverage-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idsToDelete: [id],
          defaultReplacement: "Third Party",
        }),
      });

      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || "Failed to delete coverage type");
      }

      showSuccessToast({
        title: "Deleted",
        message: `"${name}" has been deleted. ${result.updatedPoliciesCount} policies updated.`,
      });

      // Reload data
      await load();
    } catch (err: any) {
      showGlobalError({ title: "Delete failed", message: err.message || "Could not delete coverage type" });
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <div className="card">Loading...</div>;
  }

  if (!data) {
    return <div className="card">Failed to load coverage types</div>;
  }

  return (
    <div className="card space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)]">
          Coverage Types Cleanup
        </p>
        <h2 className="text-lg font-semibold text-[var(--ic-navy)]">
          Remove Vehicle Types
        </h2>
        <p className="text-sm text-[var(--ic-gray-600)] mt-1">
          Vehicle types that were incorrectly added as coverage types. Delete them below.
        </p>
      </div>

      {data.vehicleTypes.length === 0 ? (
        <p className="text-sm text-[var(--ic-gray-600)]">No vehicle types found. All clean!</p>
      ) : (
        <div className="rounded-lg border border-[var(--ic-gray-200)] bg-white">
          <ul className="divide-y divide-[var(--ic-gray-200)]">
            {data.vehicleTypes.map((item) => (
              <li 
                key={item._id} 
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--ic-gray-50)] transition-colors"
              >
                <div>
                  <span className="text-sm font-medium text-[var(--ic-navy)]">{item.name}</span>
                  <span className="text-xs text-[var(--ic-gray-500)] ml-2">
                    ({item.policyCount} {item.policyCount === 1 ? "policy" : "policies"})
                  </span>
                </div>
                <button
                  className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  onClick={() => deleteItem(item._id, item.name)}
                  disabled={deleting === item._id}
                >
                  {deleting === item._id ? "Deleting..." : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

