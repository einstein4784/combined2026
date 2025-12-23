"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { InfoTooltip } from "./InfoTooltip";
import { SearchableSelect } from "./forms/SearchableSelect";

type PolicyEdit = {
  _id: string;
  policyNumber?: string;
  policyIdNumber: string;
  coverageType: string;
  registrationNumber?: string | null;
  engineNumber?: string | null;
  chassisNumber?: string | null;
  vehicleType?: string | null;
  coverageStartDate?: string;
  coverageEndDate?: string;
  totalPremiumDue: number;
  status: "Active" | "Cancelled" | "Suspended";
  notes?: string | null;
  customerIds?: string[];
};

type CustomerOption = { id: string; name: string };

const PREFIXES = ["CA", "VF", "SF"];

function splitPrefix(value?: string) {
  if (!value) return { prefix: "", suffix: "" };
  const [first, ...rest] = value.split("-");
  // If the value doesn't start with a known prefix, treat the whole thing as suffix
  if (first && !["CA", "VF", "SF"].includes(first)) {
    return { prefix: "", suffix: value };
  }
  return { prefix: first || "", suffix: rest.join("-") || "" };
}

export function EditPolicyButton({ policy }: { policy: PolicyEdit }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverageOptions, setCoverageOptions] = useState<string[]>([
    "Third Party",
    "Fully Comprehensive",
  ]);
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);

  // Initialize form with all policy data
  const initializeForm = useMemo(() => {
    const idParts = splitPrefix(policy.policyIdNumber);
    const numberParts = splitPrefix(policy.policyNumber);
    const initialCustomerIds = policy.customerIds && policy.customerIds.length > 0 
      ? policy.customerIds.map((id: any) => id?.toString?.() || id)
      : [""];
    return {
      policyPrefix: numberParts.prefix || "",
      policyNumberSuffix: numberParts.suffix,
      policyIdSuffix: idParts.suffix,
      coverageType: policy.coverageType || "",
      registrationNumber: policy.registrationNumber || "",
      engineNumber: policy.engineNumber || "",
      chassisNumber: policy.chassisNumber || "",
      vehicleType: policy.vehicleType || "",
      coverageStartDate: policy.coverageStartDate
        ? (typeof policy.coverageStartDate === "string" 
          ? policy.coverageStartDate.slice(0, 10) 
          : new Date(policy.coverageStartDate).toISOString().slice(0, 10))
        : "",
      coverageEndDate: policy.coverageEndDate
        ? (typeof policy.coverageEndDate === "string"
          ? policy.coverageEndDate.slice(0, 10)
          : new Date(policy.coverageEndDate).toISOString().slice(0, 10))
        : "",
      totalPremiumDue: policy.totalPremiumDue?.toString() || "0",
      status: policy.status || "Active",
      notes: policy.notes || "",
      customerIds: initialCustomerIds,
    };
  }, [policy.policyIdNumber, policy.policyNumber, policy.coverageType, policy.registrationNumber, policy.engineNumber, policy.chassisNumber, policy.vehicleType, policy.coverageStartDate, policy.coverageEndDate, policy.totalPremiumDue, policy.status, policy.notes, policy.customerIds]);

  const [form, setForm] = useState(initializeForm);

  // Reset form when modal opens to ensure latest policy data is shown
  useEffect(() => {
    if (open) {
      setForm(initializeForm);
    }
  }, [open, initializeForm]);

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
        // ignore
      }
    };
    
    const loadCustomers = async () => {
      try {
        const res = await fetch("/api/customers");
        if (res.ok) {
          const customersData = await res.json();
          const formatted = customersData.map((c: any) => ({
            id: c._id.toString(),
            name: `${c.firstName} ${c.middleName || ""} ${c.lastName}`.trim(),
          }));
          setCustomerOptions(formatted);
        }
      } catch {
        // ignore
      }
    };
    
    loadCoverageTypes();
    loadCustomers();
  }, []);

  const update = (key: string, value: string) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: value };
      // Auto-set prefix to VF if policy ID suffix begins with VF
      if (key === "policyIdSuffix") {
        const trimmedValue = value.trim().toUpperCase();
        if (trimmedValue.startsWith("VF-")) {
          updated.policyPrefix = "VF";
          updated.policyIdSuffix = trimmedValue.substring(3).trim();
        } else if (trimmedValue.startsWith("VF") && trimmedValue.length > 2) {
          updated.policyPrefix = "VF";
          updated.policyIdSuffix = trimmedValue.substring(2).trim();
        }
      }
      // Auto-set prefix for policy number if it begins with a prefix
      if (key === "policyNumberSuffix") {
        const trimmedValue = value.trim().toUpperCase();
        if (trimmedValue.startsWith("CA-")) {
          updated.policyPrefix = "CA";
          updated.policyNumberSuffix = trimmedValue.substring(3).trim();
        } else if (trimmedValue.startsWith("VF-")) {
          updated.policyPrefix = "VF";
          updated.policyNumberSuffix = trimmedValue.substring(3).trim();
        } else if (trimmedValue.startsWith("SF-")) {
          updated.policyPrefix = "SF";
          updated.policyNumberSuffix = trimmedValue.substring(3).trim();
        } else if (trimmedValue.startsWith("CA") && trimmedValue.length > 2 && !trimmedValue.includes("-")) {
          updated.policyPrefix = "CA";
          updated.policyNumberSuffix = trimmedValue.substring(2).trim();
        } else if (trimmedValue.startsWith("VF") && trimmedValue.length > 2 && !trimmedValue.includes("-")) {
          updated.policyPrefix = "VF";
          updated.policyNumberSuffix = trimmedValue.substring(2).trim();
        } else if (trimmedValue.startsWith("SF") && trimmedValue.length > 2 && !trimmedValue.includes("-")) {
          updated.policyPrefix = "SF";
          updated.policyNumberSuffix = trimmedValue.substring(2).trim();
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

    // Build policy number from prefix and suffix
    const policyNumber = form.policyNumberSuffix 
      ? (form.policyPrefix ? `${form.policyPrefix}-${form.policyNumberSuffix}` : form.policyNumberSuffix)
      : (form.policyPrefix || "");
    
    // Account number is read-only, keep the original value
    const policyIdNumber = policy.policyIdNumber || "";

    const customers = form.customerIds.filter(Boolean);
    if (!customers.length) {
      setError("Select at least one customer (max 3).");
      setLoading(false);
      return;
    }

    const res = await fetch(`/api/policies/${policy._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        policyNumber, // Use edited policy number
        policyIdNumber, // Keep original account number (read-only)
        customerIds: customers, // Include customer IDs
        coverageType: form.coverageType,
        registrationNumber: form.registrationNumber || undefined,
        engineNumber: form.engineNumber || undefined,
        chassisNumber: form.chassisNumber || undefined,
        vehicleType: form.vehicleType || undefined,
        coverageStartDate: form.coverageStartDate,
        coverageEndDate: form.coverageEndDate,
        totalPremiumDue: Number(form.totalPremiumDue || 0),
        status: form.status,
        notes: form.notes || null,
      }),
    });

    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Update failed.");
    }
    setLoading(false);
  };

  return (
    <>
      <button className="btn btn-ghost text-sm" onClick={() => setOpen(true)}>
        Edit policy
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-500)]">
                  Edit
                </p>
                <h3 className="text-lg font-semibold text-[var(--ic-navy)]">
                  Edit policy details
                </h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-[var(--ic-gray-500)] hover:text-[var(--ic-gray-700)]"
              >
                ✕
              </button>
            </div>

            <form className="mt-4 space-y-4" onSubmit={onSubmit}>
              {/* Customer Selection */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2">
                    Customers <InfoTooltip content="Link up to 3 customers to this policy." />
                  </label>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-md bg-[var(--ic-teal)] px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--ic-navy)]"
                    onClick={addCustomerSlot}
                    disabled={form.customerIds.length >= 3}
                  >
                    <span className="text-lg leading-none">+</span> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {form.customerIds.map((id, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <SearchableSelect
                        selectClassName="flex-1"
                        value={id}
                        onChange={(value) => updateCustomer(idx, value)}
                        onFocus={async () => {
                          // Refresh customer list when user focuses on the select
                          try {
                            const res = await fetch("/api/customers");
                            if (res.ok) {
                              const customersData = await res.json();
                              const formatted = customersData.map((c: any) => ({
                                id: c._id.toString(),
                                name: `${c.firstName} ${c.middleName || ""} ${c.lastName}`.trim(),
                              }));
                              setCustomerOptions(formatted);
                            }
                          } catch {
                            // Ignore errors, keep existing list
                          }
                        }}
                        options={customerOptions.map((customer) => ({
                          value: customer.id,
                          label: customer.name,
                        }))}
                        placeholderOption="Select customer"
                        required={idx === 0}
                      />
                      {form.customerIds.length > 1 && (
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:underline whitespace-nowrap"
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
                <div className="flex flex-col">
                  <label className="flex items-center gap-2 mb-1">
                    Policy Number <InfoTooltip content="Edit the policy number. Prefix will be applied automatically." />
                  </label>
                  <div className="flex items-center gap-3">
                    <select
                      className="w-24 rounded-md border-2 border-[var(--ic-gray-300)] bg-white px-3 py-2.5 text-sm font-semibold shadow-sm focus:border-[var(--ic-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--ic-navy)] focus:ring-opacity-20"
                      value={form.policyPrefix}
                      onChange={(e) => update("policyPrefix", e.target.value)}
                    >
                      <option value="">(None)</option>
                      <option value="CA">CA</option>
                      <option value="VF">VF</option>
                      <option value="SF">SF</option>
                    </select>
                    {form.policyPrefix && (
                      <span className="text-[var(--ic-gray-600)] font-bold text-xl">-</span>
                    )}
                    <input
                      className="min-w-[250px] flex-1 rounded-md border-2 border-[var(--ic-gray-400)] bg-white px-4 py-2.5 text-base font-semibold text-[var(--ic-navy)] shadow-md focus:border-[var(--ic-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--ic-navy)] focus:ring-opacity-30"
                      value={form.policyNumberSuffix}
                      onChange={(e) => update("policyNumberSuffix", e.target.value)}
                      placeholder="Enter policy number"
                    />
                  </div>
                  <p className="mt-1 text-xs text-[var(--ic-gray-500)]">
                    Full policy number: {form.policyPrefix ? `${form.policyPrefix}${form.policyNumberSuffix ? `-${form.policyNumberSuffix}` : ""}` : (form.policyNumberSuffix || "(empty)")}
                  </p>
                </div>
                <div className="flex flex-col">
                  <label className="flex items-center gap-2 mb-1">
                    Account Number <InfoTooltip content="The account number cannot be edited." />
                  </label>
                  <input
                    className="rounded-md border border-[var(--ic-gray-200)] bg-[var(--ic-gray-50)] px-3 py-2 text-sm shadow-sm cursor-not-allowed"
                    value={policy.policyIdNumber || `${form.policyPrefix}-${form.policyIdSuffix}`}
                    readOnly
                    disabled
                  />
                  <p className="mt-1 text-xs text-[var(--ic-gray-500)]">Account number cannot be changed</p>
                </div>
                <div className="flex flex-col">
                  <label className="mb-1">Registration Number</label>
                  <input
                    className="rounded-md border border-[var(--ic-gray-200)] px-3 py-2 text-sm shadow-sm focus:border-[var(--ic-navy)] focus:outline-none"
                    value={form.registrationNumber}
                    onChange={(e) => update("registrationNumber", e.target.value)}
                    placeholder="Vehicle registration"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="mb-1">Engine Number</label>
                  <input
                    className="rounded-md border border-[var(--ic-gray-200)] px-3 py-2 text-sm shadow-sm focus:border-[var(--ic-navy)] focus:outline-none"
                    value={form.engineNumber}
                    onChange={(e) => update("engineNumber", e.target.value)}
                    placeholder="Engine number"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="mb-1">Chassis Number</label>
                  <input
                    className="rounded-md border border-[var(--ic-gray-200)] px-3 py-2 text-sm shadow-sm focus:border-[var(--ic-navy)] focus:outline-none"
                    value={form.chassisNumber}
                    onChange={(e) => update("chassisNumber", e.target.value)}
                    placeholder="Chassis number"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="mb-1">Vehicle Type</label>
                  <input
                    className="rounded-md border border-[var(--ic-gray-200)] px-3 py-2 text-sm shadow-sm focus:border-[var(--ic-navy)] focus:outline-none"
                    value={form.vehicleType}
                    onChange={(e) => update("vehicleType", e.target.value)}
                    placeholder="Vehicle type (e.g., Sedan, SUV, Truck)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col">
                  <label className="mb-1">Coverage Type</label>
                  <select
                    className="rounded-md border border-[var(--ic-gray-200)] px-3 py-2 text-sm shadow-sm focus:border-[var(--ic-navy)] focus:outline-none"
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
                <div className="flex flex-col">
                  <label className="mb-1">Status</label>
                  <select
                    className="rounded-md border border-[var(--ic-gray-200)] px-3 py-2 text-sm shadow-sm focus:border-[var(--ic-navy)] focus:outline-none"
                    value={form.status}
                    onChange={(e) => update("status", e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col">
                  <label className="mb-1">Total Premium</label>
                  <input
                    type="number"
                    className="rounded-md border border-[var(--ic-gray-200)] px-3 py-2 text-sm shadow-sm focus:border-[var(--ic-navy)] focus:outline-none"
                    value={form.totalPremiumDue}
                    onChange={(e) => update("totalPremiumDue", e.target.value)}
                    min={0}
                    step="0.01"
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="mb-1">Coverage Dates</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className="rounded-md border border-[var(--ic-gray-200)] px-3 py-2 text-sm shadow-sm focus:border-[var(--ic-navy)] focus:outline-none"
                      value={form.coverageStartDate}
                      onChange={(e) => update("coverageStartDate", e.target.value)}
                      required
                    />
                    <input
                      type="date"
                      className="rounded-md border border-[var(--ic-gray-200)] px-3 py-2 text-sm shadow-sm focus:border-[var(--ic-navy)] focus:outline-none"
                      value={form.coverageEndDate}
                      onChange={(e) => update("coverageEndDate", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col">
                <label className="mb-1">Notes</label>
                <textarea
                  className="rounded-md border border-[var(--ic-gray-200)] px-3 py-2 text-sm shadow-sm focus:border-[var(--ic-navy)] focus:outline-none"
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Additional notes about the policy"
                />
              </div>

              {error && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button type="button" className="btn" onClick={() => setOpen(false)} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}


