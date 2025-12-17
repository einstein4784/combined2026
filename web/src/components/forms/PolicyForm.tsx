"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "./SearchableSelect";
import { InfoTooltip } from "../InfoTooltip";
import { showSuccessToast } from "../GlobalSuccessToast";

type CustomerOption = { id: string; name: string };

type Props = {
  customers: CustomerOption[];
};

export function PolicyForm({ customers: initialCustomers }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>(initialCustomers || []);
  const [coverageOptions, setCoverageOptions] = useState<string[]>([
    "Third Party",
    "Fully Comprehensive",
  ]);
  const [policyPrefix, setPolicyPrefix] = useState<"CA" | "VF" | "SF">("CA");
  const [form, setForm] = useState({
    customerIds: [""],
    policyNumber: "",
    policyIdNumber: "",
    coverageType: "Third Party",
    registrationNumber: "",
    coverageStartDate: "",
    coverageEndDate: "",
    totalPremiumDue: "",
    notes: "",
    status: "Active",
  });

  // Fetch customers dynamically to get the latest list
  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers");
      if (res.ok) {
        const data = await res.json();
        const customerList = Array.isArray(data) ? data : [];
        const customerOptions = customerList.map((c: any) => ({
          id: c._id.toString(),
          name: `${c.firstName} ${c.middleName || ""} ${c.lastName}`.trim(),
        }));
        setCustomers(customerOptions);
      }
    } catch (err) {
      // If fetch fails, keep using existing customers
      console.error("Failed to fetch customers:", err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const options = useMemo(() => customers || [], [customers]);

  useEffect(() => {
    const loadCoverageTypes = async () => {
      try {
        const res = await fetch("/api/coverage-types");
        if (!res.ok) return;
        const data = await res.json();
        const names = (data.items || []).map((i: any) => i.name).filter(Boolean);
        if (names.length) {
          setCoverageOptions(names);
          setForm((prev) => ({
            ...prev,
            coverageType: names.includes(prev.coverageType) ? prev.coverageType : names[0],
          }));
        }
      } catch {
        // swallow errors; fallback defaults remain
      }
    };
    loadCoverageTypes();
  }, []);

  const update = (key: string, value: string) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: value };
      // Auto-set prefix to VF if policy ID begins with VF
      if (key === "policyIdNumber") {
        const trimmedValue = value.trim().toUpperCase();
        if (trimmedValue.startsWith("VF-")) {
          setPolicyPrefix("VF");
          updated.policyIdNumber = trimmedValue.substring(3).trim();
        } else if (trimmedValue.startsWith("VF") && trimmedValue.length > 2) {
          setPolicyPrefix("VF");
          updated.policyIdNumber = trimmedValue.substring(2).trim();
        }
      }
      return updated;
    });
  };

  const updateCustomer = (idx: number, value: string) => {
    setForm((prev) => {
      const next = [...prev.customerIds];
      next[idx] = value;
      return { ...prev, customerIds: next };
    });
  };

  const addCustomerSlot = () => {
    setForm((prev) => {
      if (prev.customerIds.length >= 3) return prev;
      return { ...prev, customerIds: [...prev.customerIds, ""] };
    });
  };

  const removeCustomerSlot = (idx: number) => {
    setForm((prev) => {
      if (prev.customerIds.length <= 1) return prev;
      const next = prev.customerIds.filter((_, i) => i !== idx);
      return { ...prev, customerIds: next };
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const customers = form.customerIds.filter(Boolean);
    if (!customers.length) {
      setError("Select at least one customer (max 3).");
      setLoading(false);
      return;
    }
    const policyNumberValue = form.policyNumber ? `${policyPrefix}-${form.policyNumber}` : "";
    const policyIdValue = `${policyPrefix}-${form.policyIdNumber.trim()}`;
    const res = await fetch("/api/policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        customerIds: customers,
        policyNumber: policyNumberValue,
        policyIdNumber: policyIdValue,
        registrationNumber: form.registrationNumber.trim() || undefined,
        totalPremiumDue: Number(form.totalPremiumDue || 0),
        notes: form.notes.trim() || undefined,
        status: form.status,
      }),
    });
    if (res.ok) {
      router.refresh();
      setForm({
        customerIds: [""],
        policyNumber: "",
        policyIdNumber: "",
        coverageType: "Third Party",
        registrationNumber: "",
        coverageStartDate: "",
        coverageEndDate: "",
        totalPremiumDue: "",
        notes: "",
        status: "Active",
      });
      setPolicyPrefix("CA");
      showSuccessToast({
        title: "Policy created",
        message: "New policy saved successfully.",
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
        <div className="flex items-center justify-between">
        <label className="flex items-center gap-2">
            Customers <InfoTooltip content="Link up to 3 customers to this policy." />
        </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1 rounded-md bg-[var(--ic-gray-200)] px-2 py-1 text-xs font-semibold text-[var(--ic-gray-700)] shadow-sm transition hover:bg-[var(--ic-gray-300)]"
              onClick={fetchCustomers}
              title="Refresh customer list"
            >
              ↻
            </button>
            <button
              type="button"
              className="flex items-center gap-1 rounded-md bg-[var(--ic-teal)] px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--ic-navy)]"
              onClick={addCustomerSlot}
              disabled={form.customerIds.length >= 3}
            >
              <span className="text-lg leading-none">+</span> Add
            </button>
          </div>
        </div>
        <div className="mt-2 space-y-2">
          {form.customerIds.map((id, idx) => (
            <div key={idx} className="flex items-center gap-2">
        <SearchableSelect
                selectClassName="flex-1"
                value={id}
                onChange={(value) => updateCustomer(idx, value)}
          options={options.map((customer) => ({
            value: customer.id,
            label: customer.name,
          }))}
          placeholderOption="Select customer"
                required={idx === 0}
        />
              {form.customerIds.length > 1 && (
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline"
                  onClick={() => removeCustomerSlot(idx)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="flex items-center gap-2">
            Policy Number (optional){" "}
            <InfoTooltip content="Leave blank to auto-generate; otherwise enter a suffix to append to the selected prefix." />
          </label>
          <input
            className="mt-1"
            value={form.policyNumber}
            onChange={(e) => update("policyNumber", e.target.value)}
            placeholder="POL-12345"
          />
        </div>
        <div>
          <label className="flex items-center gap-2">
            Policy ID Number <InfoTooltip content="Internal identifier for this policy; required." />
          </label>
          <input
            className="mt-1"
            value={form.policyIdNumber}
            onChange={(e) => update("policyIdNumber", e.target.value)}
            placeholder="Internal ID"
            required
          />
        </div>
        <div>
          <label className="flex items-center gap-2">
            Registration Number <InfoTooltip content="Vehicle registration or plate number, if applicable." />
          </label>
          <input
            className="mt-1"
            value={form.registrationNumber}
            onChange={(e) => update("registrationNumber", e.target.value)}
            placeholder="Vehicle registration"
          />
        </div>
        <div>
          <label className="flex items-center gap-2">
            Policy Prefix <InfoTooltip content="Prefix applied before the policy number." />
          </label>
          <select
            className="mt-1 w-full"
            value={policyPrefix}
            onChange={(e) => setPolicyPrefix(e.target.value as "CA" | "VF" | "SF")}
          >
            <option value="CA">CA</option>
            <option value="VF">VF</option>
            <option value="SF">SF</option>
          </select>
        </div>
        <div>
          <label className="flex items-center gap-2">
            Coverage Type <InfoTooltip content="Select a coverage type; options come from Coverage Types." />
          </label>
          <select
            className="mt-1 w-full"
            value={form.coverageType}
            onChange={(e) => update("coverageType", e.target.value)}
          >
            {coverageOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Status</label>
          <select
            className="mt-1 w-full"
            value={form.status}
            onChange={(e) => update("status", e.target.value)}
          >
            <option value="Active">Active</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
        <div>
          <label className="flex items-center gap-2">
            Total Premium <InfoTooltip content="Gross premium due for this policy." />
          </label>
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
      <div>
        <label className="flex items-center gap-2">
          Notes (optional) <InfoTooltip content="Add any additional details about this policy." />
        </label>
        <textarea
          className="mt-1"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Additional details about the policy"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="flex items-center gap-2">
            Coverage Start <InfoTooltip content="Date the coverage begins." />
          </label>
          <input
            type="date"
            className="mt-1"
            value={form.coverageStartDate}
            onChange={(e) => update("coverageStartDate", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="flex items-center gap-2">
            Coverage End <InfoTooltip content="Date the coverage ends." />
          </label>
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

