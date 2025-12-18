"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccessToast } from "./GlobalSuccessToast";
import { showGlobalError } from "./GlobalErrorPopup";

type Props = {
  policyId: string;
  policyNumber: string;
  coverageType?: string;
  totalPremiumDue?: number;
  coverageEndDate?: string | null;
  customerId?: string;
};

export function PolicyRenewButton({ 
  policyId, 
  policyNumber, 
  coverageType = "Third Party",
  totalPremiumDue = 0,
  coverageEndDate,
  customerId
}: Props) {
  const router = useRouter();
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Renewal form state
  const [renewalData, setRenewalData] = useState({
    coverageStartDate: "",
    coverageEndDate: "",
    totalPremiumDue: totalPremiumDue.toString(),
  });
  
  // Confirmation data
  const [newPolicyId, setNewPolicyId] = useState<string | null>(null);

  const handleRenewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Pre-populate dates (1 year from current end date if available)
    const currentEnd = coverageEndDate ? new Date(coverageEndDate) : new Date();
    const newStart = new Date(currentEnd);
    newStart.setDate(newStart.getDate() + 1); // Day after current ends
    const newEnd = new Date(newStart);
    newEnd.setFullYear(newEnd.getFullYear() + 1); // 1 year coverage
    
    setRenewalData({
      coverageStartDate: newStart.toISOString().split('T')[0],
      coverageEndDate: newEnd.toISOString().split('T')[0],
      totalPremiumDue: totalPremiumDue.toString(),
    });
    
    setShowRenewalModal(true);
  };

  const handleRenewalSubmit = async () => {
    if (!renewalData.coverageStartDate || !renewalData.coverageEndDate || !renewalData.totalPremiumDue) {
      showGlobalError({ title: "Validation Error", message: "Please fill in all fields" });
      return;
    }

    if (parseFloat(renewalData.totalPremiumDue) <= 0) {
      showGlobalError({ title: "Validation Error", message: "Premium must be greater than 0" });
      return;
    }

    if (!customerId) {
      showGlobalError({ title: "Error", message: "Customer ID is required for renewal" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/policies/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalPolicyId: policyId,
          customerId: customerId,
          coverageStartDate: renewalData.coverageStartDate,
          coverageEndDate: renewalData.coverageEndDate,
          totalPremiumDue: parseFloat(renewalData.totalPremiumDue),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create renewal");
      }

      setNewPolicyId(data.policyId);
      setShowRenewalModal(false);
      setShowConfirmModal(true);
    } catch (error: any) {
      showGlobalError({ title: "Renewal Error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToPayment = () => {
    // Redirect to payment page with the new policy
    router.push(`/payments/advanced?policyId=${newPolicyId}`);
  };

  const handleSkipPayment = () => {
    showSuccessToast({ title: "Renewal Created", message: "Policy renewed successfully" });
    setShowConfirmModal(false);
    router.refresh(); // Refresh to show new policy
  };

  return (
    <>
      <button
        onClick={handleRenewClick}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--ic-gray-200)] bg-white text-[var(--ic-gray-700)] shadow-sm hover:border-green-500 hover:bg-green-500 hover:text-white transition"
        title="Renew policy"
        aria-label="Renew policy"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>

      {/* Renewal Modal */}
      {showRenewalModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--ic-navy)]">Renew Policy</h3>
                <p className="text-sm text-[var(--ic-gray-600)]">{policyNumber}</p>
              </div>
              <button
                onClick={() => setShowRenewalModal(false)}
                className="text-[var(--ic-gray-500)] hover:text-[var(--ic-gray-700)]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--ic-gray-700)]">
                  Coverage Start Date
                </label>
                <input
                  type="date"
                  value={renewalData.coverageStartDate}
                  onChange={(e) => setRenewalData({ ...renewalData, coverageStartDate: e.target.value })}
                  className="w-full"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--ic-gray-700)]">
                  Coverage End Date
                </label>
                <input
                  type="date"
                  value={renewalData.coverageEndDate}
                  onChange={(e) => setRenewalData({ ...renewalData, coverageEndDate: e.target.value })}
                  className="w-full"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--ic-gray-700)]">
                  Total Premium Due ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={renewalData.totalPremiumDue}
                  onChange={(e) => setRenewalData({ ...renewalData, totalPremiumDue: e.target.value })}
                  className="w-full"
                  required
                />
              </div>

              <div className="rounded-lg bg-[var(--ic-gray-50)] p-3 text-sm">
                <p className="font-semibold text-[var(--ic-navy)]">Current Policy Details:</p>
                <p className="text-[var(--ic-gray-700)]">Coverage: {coverageType}</p>
                <p className="text-[var(--ic-gray-700)]">Current Premium: ${totalPremiumDue.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRenewalModal(false)}
                className="btn"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenewalSubmit}
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Creating..." : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && newPolicyId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[var(--ic-navy)]">Renewal Created Successfully!</h3>
              <p className="text-sm text-[var(--ic-gray-600)]">Policy {policyNumber} has been renewed.</p>
            </div>

            <div className="rounded-lg border border-[var(--ic-gray-200)] bg-[var(--ic-gray-50)] p-4">
              <p className="mb-2 text-sm font-semibold text-[var(--ic-navy)]">New Policy Details:</p>
              <div className="space-y-1 text-sm text-[var(--ic-gray-700)]">
                <p>Coverage: {renewalData.coverageStartDate} to {renewalData.coverageEndDate}</p>
                <p>Premium: ${parseFloat(renewalData.totalPremiumDue).toFixed(2)}</p>
                <p>Outstanding Balance: ${parseFloat(renewalData.totalPremiumDue).toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={handleProceedToPayment}
                className="btn btn-primary w-full"
              >
                Proceed to Payment
              </button>
              <button
                type="button"
                onClick={handleSkipPayment}
                className="btn w-full"
              >
                Skip Payment (Record Later)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

