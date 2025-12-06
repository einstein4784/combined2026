"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchableSelect } from "./SearchableSelect";

type PolicyOption = {
  id: string;
  policyNumber: string;
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
    amount: "",
    paymentMethod: "Cash",
    notes: "",
  });

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amount: Number(form.amount || 0),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setForm({ policyId: "", amount: "", paymentMethod: "Cash", notes: "" });
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
        <label>Policy</label>
        <SearchableSelect
          selectClassName="mt-1"
          value={form.policyId}
          onChange={(value) => update("policyId", value)}
          options={policies.map((policy) => ({
            value: policy.id,
            label: `${policy.policyNumber} · ${policy.customerName} · O/S ${policy.outstandingBalance}`,
          }))}
          placeholderOption="Select policy"
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label>Amount</label>
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
        <div>
          <label>Method</label>
          <SearchableSelect
            selectClassName="mt-1"
            value={form.paymentMethod}
            onChange={(value) => update("paymentMethod", value)}
            options={[
              { value: "Cash", label: "Cash" },
              { value: "Card", label: "Card" },
              { value: "Cheque", label: "Cheque" },
              { value: "Transfer", label: "Transfer" },
            ]}
          />
        </div>
      </div>
      <div>
        <label>Notes</label>
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
        {loading ? "Saving…" : "Record Payment"}
      </button>
    </form>
  );
}

