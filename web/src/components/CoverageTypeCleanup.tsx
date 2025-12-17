"use client";

import { useState, useEffect } from "react";
import { showGlobalError, showSuccessToast } from "@/lib/ui-helpers";

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
  const [cleaning, setCleaning] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [defaultReplacement, setDefaultReplacement] = useState("Third Party");

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/cleanup-coverage-types");
      if (!res.ok) throw new Error("Failed to load coverage types");
      const result = await res.json();
      setData(result);
      
      // Auto-select all vehicle types
      const vehicleIds = new Set(result.vehicleTypes.map((vt: CoverageTypeItem) => vt._id));
      setSelectedIds(vehicleIds);
    } catch (err: any) {
      showGlobalError({ title: "Load failed", message: err.message || "Could not load coverage types" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = (items: CoverageTypeItem[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      items.forEach((item) => next.add(item._id));
      return next;
    });
  };

  const deselectAll = (items: CoverageTypeItem[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      items.forEach((item) => next.delete(item._id));
      return next;
    });
  };

  const cleanup = async () => {
    if (selectedIds.size === 0) {
      showGlobalError({ title: "No selection", message: "Please select at least one coverage type to delete" });
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete ${selectedIds.size} coverage type(s)?\n\nPolicies using these types will be updated to use "${defaultReplacement}".`
      )
    ) {
      return;
    }

    try {
      setCleaning(true);
      const res = await fetch("/api/admin/cleanup-coverage-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idsToDelete: Array.from(selectedIds),
          defaultReplacement,
        }),
      });

      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || "Failed to clean up coverage types");
      }

      if (result.errors && result.errors.length > 0) {
        showGlobalError({
          title: "Partial success",
          message: `Deleted ${result.deletedCount} types, updated ${result.updatedPoliciesCount} policies. ${result.errors.length} errors occurred.`,
        });
        console.error("Cleanup errors:", result.errors);
      } else {
        showSuccessToast({
          title: "Cleanup complete",
          message: `Deleted ${result.deletedCount} coverage types and updated ${result.updatedPoliciesCount} policies.`,
        });
      }

      // Reload data
      await load();
      setSelectedIds(new Set());
    } catch (err: any) {
      showGlobalError({ title: "Cleanup failed", message: err.message || "Could not clean up coverage types" });
    } finally {
      setCleaning(false);
    }
  };

  if (loading) {
    return <div className="card">Loading coverage types...</div>;
  }

  if (!data) {
    return <div className="card">Failed to load coverage types</div>;
  }

  const renderSection = (
    title: string,
    items: CoverageTypeItem[],
    description: string,
    bgColor: string
  ) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-[var(--ic-navy)]">{title}</h3>
            <p className="text-sm text-[var(--ic-gray-600)]">{description}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => selectAll(items)}
              className="px-3 py-1 text-xs font-medium text-[var(--ic-navy)] hover:underline"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => deselectAll(items)}
              className="px-3 py-1 text-xs font-medium text-[var(--ic-gray-600)] hover:underline"
            >
              Deselect All
            </button>
          </div>
        </div>
        <div className="space-y-1">
          {items.map((item) => (
            <label
              key={item._id}
              className={`flex items-center justify-between p-3 rounded border cursor-pointer transition-colors ${
                selectedIds.has(item._id)
                  ? "border-red-500 bg-red-50"
                  : `border-gray-200 ${bgColor} hover:border-gray-300`
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(item._id)}
                  onChange={() => toggleSelection(item._id)}
                  className="w-4 h-4"
                />
                <span className="font-medium text-[var(--ic-navy)]">{item.name}</span>
              </div>
              <span className="text-sm text-[var(--ic-gray-600)]">
                {item.policyCount} {item.policyCount === 1 ? "policy" : "policies"}
              </span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="card space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)]">
          Coverage Types Cleanup
        </p>
        <h2 className="text-lg font-semibold text-[var(--ic-navy)]">
          Remove Vehicle Types from Coverage Types
        </h2>
        <p className="text-sm text-[var(--ic-gray-600)] mt-1">
          During data import, vehicle types were incorrectly added as coverage types. Use this tool to
          identify and remove them.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-gray-50 rounded">
          <div className="text-2xl font-bold text-[var(--ic-navy)]">{data.summary.total}</div>
          <div className="text-xs text-[var(--ic-gray-600)]">Total Coverage Types</div>
        </div>
        <div className="p-4 bg-red-50 rounded">
          <div className="text-2xl font-bold text-red-600">{data.summary.vehicleTypes}</div>
          <div className="text-xs text-[var(--ic-gray-600)]">Vehicle Types (to remove)</div>
        </div>
        <div className="p-4 bg-green-50 rounded">
          <div className="text-2xl font-bold text-green-600">{data.summary.coverageTypes}</div>
          <div className="text-xs text-[var(--ic-gray-600)]">Valid Coverage Types</div>
        </div>
        <div className="p-4 bg-yellow-50 rounded">
          <div className="text-2xl font-bold text-yellow-600">{data.summary.uncertain}</div>
          <div className="text-xs text-[var(--ic-gray-600)]">Uncertain (review manually)</div>
        </div>
      </div>

      {/* Replacement selection */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <label className="block">
          <span className="text-sm font-medium text-[var(--ic-navy)]">
            Default Replacement Coverage Type
          </span>
          <p className="text-xs text-[var(--ic-gray-600)] mb-2">
            Policies using deleted coverage types will be updated to use this type.
          </p>
          <select
            value={defaultReplacement}
            onChange={(e) => setDefaultReplacement(e.target.value)}
            className="form-input w-full"
          >
            {data.coverageTypes.map((ct) => (
              <option key={ct._id} value={ct.name}>
                {ct.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Vehicle Types (should be removed) */}
      {renderSection(
        `🚗 Vehicle Types (${data.vehicleTypes.length})`,
        data.vehicleTypes,
        "These are vehicle types that should not be in coverage types. Recommended for deletion.",
        "bg-white"
      )}

      {/* Uncertain */}
      {renderSection(
        `❓ Uncertain (${data.uncertain.length})`,
        data.uncertain,
        "These types don't match known vehicle or coverage types. Review and decide whether to keep or delete.",
        "bg-yellow-50"
      )}

      {/* Legitimate Coverage Types (keep) */}
      {renderSection(
        `✅ Valid Coverage Types (${data.coverageTypes.length})`,
        data.coverageTypes,
        "These are legitimate coverage types and should be kept.",
        "bg-green-50"
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-[var(--ic-gray-600)]">
          {selectedIds.size} coverage type(s) selected for deletion
        </div>
        <button
          type="button"
          onClick={cleanup}
          disabled={cleaning || selectedIds.size === 0}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cleaning ? "Cleaning up..." : `Delete Selected (${selectedIds.size})`}
        </button>
      </div>
    </div>
  );
}

