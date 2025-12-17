"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccessToast } from "@/components/GlobalSuccessToast";
import { SearchableSelect } from "@/components/forms/SearchableSelect";

type PolicyOption = {
  id: string;
  policyNumber: string;
  policyIdNumber?: string;
  customerName: string;
  totalPremiumDue: number;
  amountPaid: number;
  outstandingBalance: number;
};

type PaymentEntry = {
  id: string;
  policyId: string;
  policyNumber?: string;
  amount: number;
  refundAmount: number;
  paymentMethod: string;
  paymentDate: string | Date;
  notes?: string;
};

type Props = {
  policies: PolicyOption[];
  payments: PaymentEntry[];
};

export default function AdvancedPaymentPortal({ policies, payments }: Props) {
  const router = useRouter();
  const [selectedPolicyId, setSelectedPolicyId] = useState(policies[0]?.id ?? "");
  const [form, setForm] = useState({
    amount: "",
    refundAmount: "",
    paymentMethod: "Cash",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPolicy = useMemo(
    () => policies.find((p) => p.id === selectedPolicyId),
    [policies, selectedPolicyId],
  );

  const policyPayments = useMemo(
    () => payments.filter((p) => p.policyId === selectedPolicyId),
    [payments, selectedPolicyId],
  );

  const amountNumber = Number(form.amount || 0);
  const refundNumber = Number(form.refundAmount || 0);
  const applied = amountNumber + refundNumber; // both reduce outstanding directly
  const outstandingBefore = selectedPolicy?.outstandingBalance ?? 0;
  const outstandingAfter =
    selectedPolicy && Number.isFinite(outstandingBefore)
      ? Math.max(outstandingBefore - applied, 0)
      : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!selectedPolicyId) {
      setError("Select a policy.");
      setLoading(false);
      return;
    }
    if (amountNumber <= 0 && refundNumber <= 0) {
      setError("Enter a payment or refund amount.");
      setLoading(false);
      return;
    }
    // Refunds reduce outstanding directly; allow as long as total applied isn't zero.

    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        policyId: selectedPolicyId,
        amount: amountNumber,
        refundAmount: refundNumber,
        paymentMethod: form.paymentMethod,
        notes: form.notes,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      showSuccessToast({
        title: "Payment saved",
        message: data?.receipt?._id
          ? "Transaction saved and receipt generated."
          : "Transaction saved successfully.",
      });
      setForm({ amount: "", refundAmount: "", paymentMethod: "Cash", notes: "" });
      router.refresh();
    } else {
      setError(data.error || "Failed to save payment");
    }
    setLoading(false);
  };

  if (!policies.length) {
    return (
      <div className="card">
        <p className="text-sm text-[var(--ic-gray-600)]">
          No policies available. Create a policy first to manage payments.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <div className="card space-y-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Policy overview</h2>
            <p className="text-sm text-[var(--ic-gray-600)]">
              Outstanding balances are tracked per policy. Use this workspace to capture partial payments,
              refunds, and adjustments against a single policy.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="flex items-center justify-between gap-2 text-sm font-semibold text-[var(--ic-gray-700)]">
                Select policy
                <span className="text-xs font-normal text-[var(--ic-gray-600)]">All users can access</span>
              </label>
              <SearchableSelect
                selectClassName="mt-1"
                value={selectedPolicyId}
                onChange={(value) => setSelectedPolicyId(value)}
                options={policies.map((p) => ({
                  value: p.id,
                  label: `${p.policyNumber} (${p.policyIdNumber || "ID n/a"}) · ${p.customerName} · O/S $${p.outstandingBalance.toFixed(2)}`,
                }))}
                placeholderOption="Search policy"
                required
              />
            </div>
            {selectedPolicy && (
              <div className="rounded-md border border-[var(--ic-gray-200)] bg-[var(--ic-gray-50)] p-4 text-sm">
                <div className="font-semibold text-[var(--ic-navy)]">{selectedPolicy.policyNumber}</div>
                <div className="text-[var(--ic-gray-700)]">Policy ID: {selectedPolicy.policyIdNumber || "—"}</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <span className="text-[var(--ic-gray-600)]">Total due</span>
                  <span className="text-right font-semibold">
                    ${selectedPolicy.totalPremiumDue.toFixed(2)}
                  </span>
                  <span className="text-[var(--ic-gray-600)]">Paid to date</span>
                  <span className="text-right font-semibold">
                    ${selectedPolicy.amountPaid.toFixed(2)}
                  </span>
                  <span className="text-[var(--ic-gray-600)]">Outstanding</span>
                  <span className="text-right font-semibold text-[var(--ic-teal)]">
                    ${selectedPolicy.outstandingBalance.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card space-y-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Advanced payment entry</h2>
            <p className="text-sm text-[var(--ic-gray-600)]">
              Capture partial payments, refunds (manually calculated), and notes for this policy. Applied to
              balance = payment + refund.
            </p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-[var(--ic-gray-700)]">Payment amount</label>
                <input
                  type="number"
                  className="mt-1"
                  min={0}
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-[var(--ic-gray-700)]">
                  Refund amount (manual)
                </label>
                <input
                  type="number"
                  className="mt-1"
                  min={0}
                  step="0.01"
                  value={form.refundAmount}
                  onChange={(e) => setForm((prev) => ({ ...prev, refundAmount: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-[var(--ic-gray-700)]">Method</label>
                <select
                  className="mt-1 w-full"
                  value={form.paymentMethod}
                  onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Transfer">Transfer</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--ic-gray-700)]">Notes</label>
              <textarea
                className="mt-1"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Add context for this payment or refund"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-sm font-semibold">
              <div className="text-[var(--ic-gray-700)]">
                Applied to outstanding: <span className="text-[var(--ic-navy)]">${applied.toFixed(2)}</span>
              </div>
              {selectedPolicy && (
                <>
                  <div className="text-[var(--ic-gray-700)]">
                    Outstanding before: ${outstandingBefore.toFixed(2)}
                  </div>
                  <div className="text-[var(--ic-gray-700)]">
                    Projected after: ${(outstandingAfter ?? outstandingBefore).toFixed(2)}
                  </div>
                </>
              )}
            </div>
            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-[var(--ic-gray-600)]">
                Need full payments only? Use the main Payments page. Outstanding balances remain per policy, not
                per customer.
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full sm:w-auto disabled:opacity-50"
              >
                {loading ? "Saving…" : "Save payment / refund"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Policy payments</h2>
            <p className="text-sm text-[var(--ic-gray-600)]">
              Manage payments on this account and view history for the selected policy.
            </p>
          </div>
          <span className="badge success">{policyPayments.length} records</span>
        </div>
        <div className="mt-2 max-h-[480px] overflow-y-auto rounded-md border border-[var(--ic-gray-100)]">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Amount</th>
                <th className="px-3 py-2 text-left">Refund</th>
                <th className="px-3 py-2 text-left">Net</th>
                <th className="px-3 py-2 text-left">Method</th>
                <th className="px-3 py-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {policyPayments.map((p) => {
                const date = new Date(p.paymentDate);
                const netRow = (p.amount ?? 0) - (p.refundAmount ?? 0);
                return (
                  <tr key={p.id} className="border-t border-[var(--ic-gray-100)]">
                    <td className="px-3 py-2">{date.toLocaleDateString()}</td>
                    <td className="px-3 py-2">${(p.amount ?? 0).toFixed(2)}</td>
                    <td className="px-3 py-2">${(p.refundAmount ?? 0).toFixed(2)}</td>
                    <td className="px-3 py-2 font-semibold text-[var(--ic-navy)]">${netRow.toFixed(2)}</td>
                    <td className="px-3 py-2">{p.paymentMethod}</td>
                    <td className="px-3 py-2 text-[var(--ic-gray-700)]">
                      {p.notes ? p.notes : "—"}
                    </td>
                  </tr>
                );
              })}
              {!policyPayments.length && (
                <tr>
                  <td className="px-3 py-3 text-center text-[var(--ic-gray-600)]" colSpan={6}>
                    No payments recorded for this policy yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-[var(--ic-gray-600)]">
          Payments and refunds here are policy-specific; they do not aggregate at the customer level.
        </div>
      </div>
    </div>
  );
}


