"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DATA_TIERS, PROTECTED_DATA, DataTier } from "@/lib/data-tiers";
import { showGlobalError } from "@/components/GlobalErrorPopup";
import { showSuccessToast } from "@/components/GlobalSuccessToast";

type PreviewData = {
  counts: {
    transactional: Record<string, number>;
    workflow: Record<string, number>;
    financial: Record<string, number>;
  };
  totals: {
    transactional: number;
    workflow: number;
    financial: number;
    grandTotal: number;
  };
  warnings: string[];
  metadata: {
    activePolicies: number;
    outstandingBalance: number;
  };
};

export default function DataWipePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [selectedTiers, setSelectedTiers] = useState<DataTier[]>(["TRANSACTIONAL", "WORKFLOW"]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    loadPreview();
  }, []);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/wipe-data/preview");
      if (!res.ok) throw new Error("Failed to load preview");
      const data = await res.json();
      setPreview(data);
    } catch (err: any) {
      showGlobalError({
        title: "Failed to load preview",
        message: err.message || "Could not retrieve data counts",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTierToggle = (tier: DataTier) => {
    setSelectedTiers((prev) =>
      prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier]
    );
  };

  const handleDryRun = async () => {
    if (selectedTiers.length === 0) {
      showGlobalError({
        title: "No selection",
        message: "Please select at least one data tier to preview",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/wipe-data/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedTiers,
          dryRun: true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const totalRecords = Object.values(data.wouldDelete).reduce<number>(
          (sum: number, count) => sum + (typeof count === 'number' ? count : 0),
          0
        );
        showSuccessToast({
          title: "Dry Run Complete",
          message: `Would delete ${totalRecords} records`,
        });
      } else {
        throw new Error(data.error || "Dry run failed");
      }
    } catch (err: any) {
      showGlobalError({
        title: "Dry run failed",
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (confirmationText.trim().toUpperCase() !== "PERMANENTLY DELETE ALL DATA") {
      showGlobalError({
        title: "Invalid confirmation",
        message: "Please type the exact phrase to confirm",
      });
      return;
    }

    setExecuting(true);
    try {
      const res = await fetch("/api/admin/wipe-data/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedTiers,
          confirmation: confirmationText,
          dryRun: false,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showSuccessToast({
          title: "Data Deleted",
          message: `Successfully deleted ${data.totalDeleted} records`,
        });
        setShowConfirmation(false);
        setConfirmationText("");
        router.push("/admin");
      } else {
        throw new Error(data.error || "Deletion failed");
      }
    } catch (err: any) {
      showGlobalError({
        title: "Deletion failed",
        message: err.message,
      });
    } finally {
      setExecuting(false);
    }
  };

  const getTotalForTier = (tier: DataTier): number => {
    if (!preview) return 0;
    const tierKey = tier.toLowerCase() as keyof typeof preview.totals;
    return preview.totals[tierKey] || 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-title-box">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-[var(--ic-gray-600)] hover:text-[var(--ic-navy)]">
            ← Admin
          </Link>
        </div>
        <p className="section-heading text-red-600">Danger Zone</p>
        <h4 className="text-red-700">🗑️ Clear Transactional Data</h4>
        <p className="page-subtitle">
          Permanently delete business data with granular control. System configuration and user
          accounts are protected.
        </p>
      </div>

      {/* Preview Card */}
      {loading && !preview ? (
        <div className="card">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--ic-navy)] mx-auto"></div>
              <p className="mt-4 text-sm text-[var(--ic-gray-600)]">Loading data preview...</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Data Overview */}
          <div className="card bg-blue-50 border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">📊 Current Data Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                <div className="text-3xl font-bold text-blue-600">
                  {preview?.counts.transactional.customers || 0}
                </div>
                <div className="text-sm text-blue-700 mt-1">Customers</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                <div className="text-3xl font-bold text-blue-600">
                  {preview?.counts.transactional.policies || 0}
                </div>
                <div className="text-sm text-blue-700 mt-1">Policies</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                <div className="text-3xl font-bold text-blue-600">
                  {preview?.counts.transactional.payments || 0}
                </div>
                <div className="text-sm text-blue-700 mt-1">Payments</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                <div className="text-3xl font-bold text-blue-600">
                  {preview?.counts.transactional.receipts || 0}
                </div>
                <div className="text-sm text-blue-700 mt-1">Receipts</div>
              </div>
            </div>

            {preview && preview.warnings.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="font-semibold text-yellow-800 mb-2">⚠️ Warnings:</div>
                <ul className="space-y-1">
                  {preview.warnings.map((warning, i) => (
                    <li key={i} className="text-sm text-yellow-700">
                      • {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Data Tier Selection */}
          <div className="card">
            <h3 className="text-lg font-semibold text-[var(--ic-navy)] mb-4">
              Select Data to Delete
            </h3>

            <div className="space-y-4">
              {(Object.keys(DATA_TIERS) as DataTier[]).map((tierKey) => {
                const tier = DATA_TIERS[tierKey];
                const isSelected = selectedTiers.includes(tierKey);
                const count = getTotalForTier(tierKey);

                return (
                  <div
                    key={tierKey}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      isSelected
                        ? "border-red-500 bg-red-50"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                    }`}
                    onClick={() => handleTierToggle(tierKey)}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleTierToggle(tierKey)}
                        className="mt-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-[var(--ic-navy)]">{tier.label}</div>
                          <span
                            className={`badge ${isSelected ? "error" : "info"}`}
                          >
                            {count} records
                          </span>
                        </div>
                        <p className="text-sm text-[var(--ic-gray-600)] mt-1">
                          {tier.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {tier.collections.map((col) => (
                            <span
                              key={col.model}
                              className="text-xs px-2 py-1 bg-white rounded border border-gray-200"
                            >
                              {col.icon} {col.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Protected Data Info */}
          <div className="card bg-green-50 border-green-200">
            <h3 className="text-lg font-semibold text-green-900 mb-4">
              🛡️ Protected Data (NOT Deleted)
            </h3>
            <p className="text-sm text-green-700 mb-3">
              The following data will remain intact and will NOT be affected:
            </p>
            <div className="space-y-2">
              {Object.values(PROTECTED_DATA).map((category, i) => (
                <div key={i} className="p-3 bg-white rounded-lg border border-green-200">
                  <div className="font-semibold text-green-900">{category.label}</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {category.collections.map((col) => (
                      <span
                        key={col.model}
                        className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded"
                      >
                        {col.icon} {col.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="card">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
              <div className="text-sm text-[var(--ic-gray-600)]">
                {selectedTiers.length === 0 ? (
                  "Select at least one data tier to proceed"
                ) : (
                  <>
                    Selected: <strong>{selectedTiers.length}</strong> tier(s) •{" "}
                    <strong>
                      {selectedTiers.reduce((sum, tier) => sum + getTotalForTier(tier), 0)}
                    </strong>{" "}
                    total records
                  </>
                )}
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={handleDryRun}
                  disabled={loading || selectedTiers.length === 0}
                  className="btn flex-1 sm:flex-none"
                >
                  🔍 Preview (Dry Run)
                </button>
                <button
                  onClick={() => setShowConfirmation(true)}
                  disabled={loading || selectedTiers.length === 0}
                  className="btn btn-danger flex-1 sm:flex-none"
                >
                  🗑️ Delete Data
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-red-500">
                  ⚠️ FINAL CONFIRMATION
                </p>
                <h3 className="text-xl font-bold text-red-700">Permanently Delete Data?</h3>
              </div>
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setConfirmationText("");
                }}
                className="text-[var(--ic-gray-500)] hover:text-[var(--ic-gray-700)]"
                disabled={executing}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-900 mb-2">You are about to delete:</p>
                <ul className="space-y-1 text-sm text-red-700">
                  {selectedTiers.map((tier) => (
                    <li key={tier}>
                      • <strong>{DATA_TIERS[tier].label}</strong>: {getTotalForTier(tier)} records
                    </li>
                  ))}
                </ul>
                <div className="mt-3 pt-3 border-t border-red-300">
                  <p className="text-sm font-bold text-red-900">
                    Total: {selectedTiers.reduce((sum, tier) => sum + getTotalForTier(tier), 0)}{" "}
                    records will be permanently deleted
                  </p>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                <p className="text-sm font-semibold text-yellow-900">⚠️ This action cannot be undone!</p>
                <p className="text-sm text-yellow-800 mt-1">
                  Make sure you have a backup before proceeding.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--ic-navy)] mb-2">
                  Type{" "}
                  <code className="bg-red-100 px-2 py-1 rounded text-red-700">
                    PERMANENTLY DELETE ALL DATA
                  </code>{" "}
                  to confirm:
                </label>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="Type here..."
                  disabled={executing}
                  className="form-input w-full"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowConfirmation(false);
                    setConfirmationText("");
                  }}
                  disabled={executing}
                  className="btn flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecute}
                  disabled={
                    executing ||
                    confirmationText.trim().toUpperCase() !== "PERMANENTLY DELETE ALL DATA"
                  }
                  className="btn btn-danger flex-1"
                >
                  {executing ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

