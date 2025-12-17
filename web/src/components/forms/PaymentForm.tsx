"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SearchableSelect } from "./SearchableSelect";
import { InfoTooltip } from "../InfoTooltip";
import { showSuccessToast } from "../GlobalSuccessToast";

type PolicyOption = {
  id: string;
  policyNumber: string;
  policyIdNumber?: string;
  customerName: string;
  outstandingBalance: number;
};

type Props = {
  policies: PolicyOption[];
};

export function PaymentForm({ policies }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    policyId: "",
    amount: "0",
    paymentMethod: "Cash",
    notes: "",
  });

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const selectedPolicy = policies.find((p) => p.id === form.policyId);
  const outstandingBefore = selectedPolicy?.outstandingBalance ?? 0;
  const amountNumber = Number(form.amount || 0);
  const outstandingAfter =
    selectedPolicy && Number.isFinite(outstandingBefore)
      ? Math.max(outstandingBefore - amountNumber, 0)
      : undefined;

  // Prefill the amount with the full outstanding balance when a policy is chosen.
  useEffect(() => {
    if (!selectedPolicy) return;
    const nextAmount = Number.isFinite(selectedPolicy.outstandingBalance)
      ? String(selectedPolicy.outstandingBalance)
      : "0";
    setForm((prev) => ({ ...prev, amount: nextAmount }));
  }, [selectedPolicy?.id, selectedPolicy?.outstandingBalance]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const amountNumber = Number(form.amount || 0);

    if (selectedPolicy && Number.isFinite(outstandingBefore)) {
      const outstanding = Math.max(outstandingBefore, 0);
      const diff = Math.abs(amountNumber - outstanding);
      if (diff > 0.01) {
        setError(
          "Full payments only on this page. Use Advanced Payment Options for partial payments or refunds.",
        );
        setLoading(false);
        return;
      }
    }

    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amount: amountNumber,
        refundAmount: 0,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setForm({ policyId: "", amount: "", paymentMethod: "Cash", notes: "" });
      showSuccessToast({
        title: "Payment recorded",
        message: data?.receipt?._id ? "Payment saved and receipt created." : "Payment saved successfully.",
      });
      if (data?.receipt?._id) {
        router.push(`/receipts/${data.receipt._id}`);
      } else {
        router.refresh();
      }
    } else {
      setError(data.error || "Failed to record payment");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <div>
        <label className="flex items-center gap-2">
          Policy{" "}
          <InfoTooltip content="Choose the policy this full payment applies to. For partial payments or refunds, use Advanced Payment Options." />
        </label>
        <SearchableSelect
          selectClassName="mt-1"
          value={form.policyId}
          onChange={(value) => update("policyId", value)}
          options={policies.map((policy) => ({
            value: policy.id,
            label: `${policy.policyNumber} (${policy.policyIdNumber || "ID n/a"}) · ${policy.customerName} · O/S ${policy.outstandingBalance}`,
          }))}
          placeholderOption="Select policy"
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="flex items-center gap-2">
            Amount <InfoTooltip content="Amount being paid by the customer." />
          </label>
          <input
            type="number"
            className="mt-1"
            value={form.amount}
            onChange={(e) => update("amount", e.target.value)}
            required
            min={0}
            step="0.01"
          />
        </div>
        <div className="md:col-span-2 space-y-1 text-sm font-semibold">
          {selectedPolicy && (
            <div className="text-[var(--ic-gray-700)]">
              Outstanding before: ${outstandingBefore.toFixed(2)} · After full payment: $
              {(outstandingAfter ?? outstandingBefore).toFixed(2)}
            </div>
          )}
          {!selectedPolicy && (
            <div className="text-[var(--ic-gray-600)]">
              Full payments only. Use Advanced Payment Options for partial payments, refunds, or account
              adjustments.
            </div>
          )}
        </div>
        <div>
          <label className="flex items-center gap-2">
            Method <InfoTooltip content="Payment method used for this transaction." />
          </label>
          <select
            className="mt-1 w-full"
            value={form.paymentMethod}
            onChange={(e) => update("paymentMethod", e.target.value)}
          >
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Cheque">Cheque</option>
            <option value="Transfer">Transfer</option>
          </select>
        </div>
      </div>
      <div>
        <label className="flex items-center gap-2">
          Notes <InfoTooltip content="Optional comments for this payment or refund." />
        </label>
        <textarea
          className="mt-1"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary w-full disabled:opacity-50"
      >
        {loading ? "Saving…" : "Record Full Payment"}
      </button>
      <div className="mt-2 text-center text-xs text-[var(--ic-gray-600)]">
        Need partials or refunds?{" "}
        <a href="/payments/advanced" className="text-[var(--ic-navy)] underline">
          Advanced payment options
        </a>
      </div>
    </form>
  );
}

