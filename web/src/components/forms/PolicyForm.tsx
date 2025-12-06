"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SearchableSelect } from "./SearchableSelect";

type CustomerOption = { id: string; name: string };

type Props = {
  customers: CustomerOption[];
};

export function PolicyForm({ customers }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    customerId: "",
    policyNumber: "",
    coverageType: "Third Party",
    coverageStartDate: "",
    coverageEndDate: "",
    totalPremiumDue: "",
  });

  const options = useMemo(() => customers || [], [customers]);

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        totalPremiumDue: Number(form.totalPremiumDue || 0),
      }),
    });
    if (res.ok) {
      router.refresh();
      setForm({
        customerId: "",
        policyNumber: "",
        coverageType: "Third Party",
        coverageStartDate: "",
        coverageEndDate: "",
        totalPremiumDue: "",
      });
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to create policy");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <div>
        <label>Customer</label>
        <SearchableSelect
          selectClassName="mt-1"
          value={form.customerId}
          onChange={(value) => update("customerId", value)}
          options={options.map((customer) => ({
            value: customer.id,
            label: customer.name,
          }))}
          placeholderOption="Select customer"
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label>Policy Number (optional)</label>
          <input
            className="mt-1"
            value={form.policyNumber}
            onChange={(e) => update("policyNumber", e.target.value)}
            placeholder="POL-12345"
          />
        </div>
        <div>
          <label>Coverage Type</label>
          <SearchableSelect
            selectClassName="mt-1"
            value={form.coverageType}
            onChange={(value) => update("coverageType", value)}
            options={[
              { value: "Third Party", label: "Third Party" },
              { value: "Fully Comprehensive", label: "Fully Comprehensive" },
            ]}
          />
        </div>
        <div>
          <label>Total Premium</label>
          <input
            type="number"
            className="mt-1"
            value={form.totalPremiumDue}
            onChange={(e) => update("totalPremiumDue", e.target.value)}
            required
            min={0}
            step="0.01"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label>Coverage Start</label>
          <input
            type="date"
            className="mt-1"
            value={form.coverageStartDate}
            onChange={(e) => update("coverageStartDate", e.target.value)}
            required
          />
        </div>
        <div>
          <label>Coverage End</label>
          <input
            type="date"
            className="mt-1"
            value={form.coverageEndDate}
            onChange={(e) => update("coverageEndDate", e.target.value)}
            required
          />
        </div>
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
        {loading ? "Saving…" : "Create Policy"}
      </button>
    </form>
  );
}

