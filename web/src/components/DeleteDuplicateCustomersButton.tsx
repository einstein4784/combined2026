"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccessToast } from "./GlobalSuccessToast";

type CustomerInfo = {
  id: string;
  name: string;
  email: string;
  contactNumber: string;
  createdAt: string;
};

type PolicyInfo = {
  policyId: string;
  policyNumber: string;
  policyIdNumber: string;
  coverageType: string;
  outstandingBalance: number;
  currentCustomerId: string;
};

type DuplicateGroup = {
  name: string;
  count: number;
  keep: CustomerInfo;
  delete: CustomerInfo[];
  policies: PolicyInfo[];
};

type PreviewData = {
  duplicatesFound: number;
  customersToDelete: number;
  groups: DuplicateGroup[];
};

export function DeleteDuplicateCustomersButton() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  // policyAssignments: { [policyId: string]: customerId: string }
  const [policyAssignments, setPolicyAssignments] = useState<Record<string, string>>({});

  const handlePreview = async () => {
    setBusy(true);
    setError(null);
    setPolicyAssignments({});

    try {
      const res = await fetch("/api/admin/delete-duplicate-customers", {
        method: "GET",
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setPreview(data);
        // Initialize policy assignments to kept customer by default
        const initialAssignments: Record<string, string> = {};
        if (data.groups) {
          for (const group of data.groups) {
            for (const policy of group.policies) {
              initialAssignments[policy.policyId] = group.keep.id;
            }
          }
        }
        setPolicyAssignments(initialAssignments);
      } else {
        setError(data.error || "Failed to preview duplicates");
      }
    } catch (err) {
      setError("An error occurred while previewing duplicates");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/delete-duplicate-customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyAssignments }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        showSuccessToast({
          title: "Duplicates deleted",
          message: `Successfully deleted ${data.deleted} duplicate customer(s). ${data.policiesReassigned} policies and ${data.receiptsReassigned} receipts were reassigned.`,
        });
        setShowConfirm(false);
        setPreview(null);
        setPolicyAssignments({});
        router.refresh();
      } else {
        setError(data.error || "Failed to delete duplicates");
      }
    } catch (err) {
      setError("An error occurred while deleting duplicates");
    } finally {
      setBusy(false);
    }
  };

  const updatePolicyAssignment = (policyId: string, customerId: string) => {
    setPolicyAssignments((prev) => ({
      ...prev,
      [policyId]: customerId,
    }));
  };

  const getAllCustomerOptions = (group: DuplicateGroup): CustomerInfo[] => {
    return [group.keep, ...group.delete];
  };

  return (
    <>
      <div className="card space-y-3 border-orange-200 bg-orange-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="section-heading text-orange-700">Data Cleanup</p>
            <h3 className="text-lg font-semibold text-orange-800">Delete Duplicate Customers</h3>
            <p className="text-sm text-orange-700">
              Find and delete duplicate customers that have the same name. Manually assign policies to the customer of your choice before deletion.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-300 bg-red-100 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        {preview && (
          <div className="space-y-4 rounded-md border border-orange-300 bg-white p-4">
            <div className="mb-4">
              <div className="mb-2 font-semibold text-orange-800">
                Preview: {preview.duplicatesFound} duplicate group(s) found
              </div>
              <div className="text-sm text-orange-700">
                {preview.customersToDelete} customer(s) will be deleted, {preview.groups.length} customer(s) will be kept
              </div>
            </div>

            <div className="max-h-[600px] space-y-6 overflow-y-auto">
              {preview.groups.map((group, groupIdx) => {
                const customerOptions = getAllCustomerOptions(group);
                const totalPolicies = group.policies.length;

                return (
                  <div key={groupIdx} className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                    <div className="mb-3 border-b border-orange-300 pb-2">
                      <div className="font-semibold text-orange-900">Name: {group.name}</div>
                      <div className="mt-1 text-sm text-orange-700">
                        {totalPolicies} policy/policies to reassign
                      </div>
                    </div>

                    <div className="mb-3 space-y-2">
                      <div className="text-sm font-semibold text-green-700">
                        ✓ Keep: {group.keep.name} ({group.keep.email || group.keep.contactNumber})
                      </div>
                      {group.delete.map((customer, idx) => (
                        <div key={idx} className="text-sm text-red-700">
                          ✗ Delete: {customer.name} ({customer.email || customer.contactNumber})
                        </div>
                      ))}
                    </div>

                    {totalPolicies > 0 && (
                      <div className="mt-4 space-y-3">
                        <div className="text-sm font-semibold text-orange-800">Policy Assignments:</div>
                        <div className="space-y-2">
                          {group.policies.map((policy) => (
                            <div
                              key={policy.policyId}
                              className="flex items-center gap-3 rounded-md border border-orange-200 bg-white p-2"
                            >
                              <div className="flex-1 text-sm">
                                <div className="font-semibold text-orange-900">
                                  {policy.policyNumber}
                                  {policy.policyIdNumber && ` (${policy.policyIdNumber})`}
                                </div>
                                <div className="text-xs text-orange-700">
                                  {policy.coverageType} · Outstanding: ${policy.outstandingBalance.toFixed(2)}
                                </div>
                              </div>
                              <select
                                className="rounded-md border border-orange-300 bg-white px-2 py-1 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                                value={policyAssignments[policy.policyId] || group.keep.id}
                                onChange={(e) => updatePolicyAssignment(policy.policyId, e.target.value)}
                                disabled={busy}
                              >
                                {customerOptions.map((customer) => (
                                  <option key={customer.id} value={customer.id}>
                                    {customer.name}
                                    {customer.id === group.keep.id ? " (Keep)" : " (Delete)"}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {totalPolicies === 0 && (
                      <div className="mt-2 text-sm text-orange-600">No policies to reassign for this group.</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          {!preview && (
            <button
              className="btn border-orange-300 bg-orange-600 text-white hover:bg-orange-700"
              onClick={handlePreview}
              disabled={busy}
            >
              {busy ? "Checking..." : "Preview Duplicates"}
            </button>
          )}
          {preview && (
            <>
              <button
                className="btn"
                onClick={() => {
                  setPreview(null);
                  setPolicyAssignments({});
                  setError(null);
                }}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="btn border-orange-300 bg-orange-600 text-white hover:bg-orange-700"
                onClick={() => setShowConfirm(true)}
                disabled={busy || preview.customersToDelete === 0}
              >
                Delete Duplicates
              </button>
            </>
          )}
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-500)]">
                  Confirm deletion
                </p>
                <h3 className="text-lg font-semibold text-orange-800">Delete Duplicate Customers?</h3>
              </div>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setError(null);
                }}
                className="text-[var(--ic-gray-500)] hover:text-[var(--ic-gray-700)]"
                disabled={busy}
              >
                ✕
              </button>
            </div>
            <p className="mt-3 text-sm text-[var(--ic-gray-700)]">
              This will permanently delete {preview?.customersToDelete || 0} duplicate customer(s) and reassign their policies and receipts according to your selections.
            </p>
            <p className="mt-3 text-sm font-semibold text-orange-700">
              Policies will be assigned to the customers you selected. Receipts will follow their associated policies. This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="btn"
                onClick={() => {
                  setShowConfirm(false);
                  setError(null);
                }}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="btn border-orange-300 bg-orange-600 text-white hover:bg-orange-700"
                onClick={handleDelete}
                disabled={busy}
              >
                {busy ? "Deleting…" : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
