"use client";

import { useState } from "react";
import { showGlobalError } from "./GlobalErrorPopup";
import { showSuccessToast } from "./GlobalSuccessToast";

export function ResetCoverageTypesButton() {
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (
      !confirm(
        "⚠️ WARNING: This will delete ALL coverage types except 'Third Party' and 'Comprehensive'.\n\n" +
        "All policies using other coverage types will be updated to use 'Third Party'.\n\n" +
        "This action cannot be undone. Are you sure you want to continue?"
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/admin/reset-coverage-types", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset coverage types");
      }

      showSuccessToast({
        title: "Coverage types reset",
        message: `Deleted ${data.deletedCount} coverage types and updated ${data.updatedPoliciesCount} policies. Remaining: ${data.remaining.join(", ")}`,
      });

      // Reload the page to refresh the coverage types list
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      showGlobalError({
        title: "Reset failed",
        message: err.message || "Could not reset coverage types",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)]">
            Quick Reset
          </p>
          <h2 className="text-lg font-semibold text-[var(--ic-navy)]">
            Reset Coverage Types
          </h2>
          <p className="text-sm text-[var(--ic-gray-600)] mt-1">
            Delete all coverage types except <strong>Third Party</strong> and{" "}
            <strong>Comprehensive</strong>. All policies using other coverage types will be
            updated to use "Third Party".
          </p>
        </div>

        <button
          onClick={handleReset}
          disabled={loading}
          className="btn bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Resetting..." : "Reset to Default Coverage Types"}
        </button>
      </div>
    </div>
  );
}


