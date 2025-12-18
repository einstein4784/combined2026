"use client";

import { useState } from "react";
import { showGlobalError } from "@/components/GlobalErrorPopup";
import { showSuccessToast } from "@/components/GlobalSuccessToast";

type DuplicateGroup = {
  policyId: string;
  policyNumber: string;
  policyIdNumber: string;
  amount: number;
  paymentDate: string;
  count: number;
  payments: Array<{
    _id: string;
    receiptNumber: string;
    amount: number;
    paymentDate: string;
    createdAt: string;
  }>;
  keepId: string;
  deleteIds: string[];
};

export function DuplicatePaymentCleaner() {
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [totalGroups, setTotalGroups] = useState(0);
  const [totalDuplicates, setTotalDuplicates] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const findDuplicates = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/find-duplicate-payments");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to find duplicates");
      }

      setDuplicates(data.duplicates || []);
      setTotalGroups(data.totalDuplicateGroups || 0);
      setTotalDuplicates(data.totalDuplicatePayments || 0);

      if (data.totalDuplicatePayments === 0) {
        showSuccessToast({
          title: "No Duplicates",
          message: "No duplicate payments found in the database",
        });
      }
    } catch (err: any) {
      showGlobalError({
        title: "Error",
        message: err.message || "Failed to find duplicates",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteDuplicates = async () => {
    if (!confirm(
      `This will delete ${totalDuplicates} duplicate payment${totalDuplicates !== 1 ? "s" : ""} from ${totalGroups} group${totalGroups !== 1 ? "s" : ""}.\n\n` +
      `The oldest payment in each group will be kept.\n\n` +
      `Are you sure you want to continue?`
    )) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch("/api/admin/find-duplicate-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete duplicates");
      }

      showSuccessToast({
        title: "Duplicates Removed",
        message: `Successfully deleted ${data.paymentsDeleted} duplicate payment${data.paymentsDeleted !== 1 ? "s" : ""}`,
      });

      // Refresh the list
      setDuplicates([]);
      setTotalGroups(0);
      setTotalDuplicates(0);
    } catch (err: any) {
      showGlobalError({
        title: "Error",
        message: err.message || "Failed to delete duplicates",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[var(--ic-navy)]">
          Duplicate Payment Cleaner
        </h2>
        <p className="text-sm text-[var(--ic-gray-600)] mt-1">
          Find and remove duplicate payments (same policy, date, and amount). The oldest payment in each group will be kept.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={findDuplicates}
          disabled={loading || deleting}
          className="btn btn-primary"
        >
          {loading ? "Scanning..." : "Find Duplicates"}
        </button>

        {totalDuplicates > 0 && (
          <button
            onClick={deleteDuplicates}
            disabled={loading || deleting}
            className="btn btn-danger"
          >
            {deleting ? "Deleting..." : `Delete ${totalDuplicates} Duplicate${totalDuplicates !== 1 ? "s" : ""}`}
          </button>
        )}
      </div>

      {totalGroups > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
              <div className="text-sm text-yellow-600 font-medium">Duplicate Groups</div>
              <div className="text-2xl font-bold text-yellow-900">{totalGroups}</div>
            </div>
            
            <div className="p-3 bg-red-50 rounded border border-red-200">
              <div className="text-sm text-red-600 font-medium">Duplicate Payments</div>
              <div className="text-2xl font-bold text-red-900">{totalDuplicates}</div>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h3 className="font-semibold text-[var(--ic-navy)]">Duplicate Groups</h3>
            {duplicates.map((group, idx) => (
              <details key={idx} className="bg-red-50 border border-red-200 rounded p-3">
                <summary className="cursor-pointer font-medium text-red-900">
                  Policy {group.policyIdNumber} {group.policyNumber} - ${group.amount.toFixed(2)} on{" "}
                  {new Date(group.paymentDate).toLocaleDateString()} ({group.count} payments)
                </summary>
                <div className="mt-3 space-y-2">
                  {group.payments.map((payment, paymentIdx) => (
                    <div
                      key={payment._id}
                      className={`p-2 rounded text-sm ${
                        payment._id === group.keepId
                          ? "bg-green-100 border border-green-300"
                          : "bg-white border border-red-300"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            Receipt #{payment.receiptNumber}
                            {payment._id === group.keepId && (
                              <span className="ml-2 text-xs px-2 py-0.5 bg-green-600 text-white rounded">
                                KEEP
                              </span>
                            )}
                            {group.deleteIds.includes(payment._id) && (
                              <span className="ml-2 text-xs px-2 py-0.5 bg-red-600 text-white rounded">
                                DELETE
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Amount: ${payment.amount.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-600">
                            Date: {new Date(payment.paymentDate).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-600">
                            Created: {new Date(payment.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {!loading && totalGroups === 0 && duplicates.length === 0 && (
        <p className="text-sm text-[var(--ic-gray-600)]">
          Click "Find Duplicates" to scan for duplicate payments in the database.
        </p>
      )}
    </div>
  );
}

