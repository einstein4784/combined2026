"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { InfoTooltip } from "./InfoTooltip";

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
};

const PREFIXES = ["CA", "VF", "SF"];

function splitPrefix(value?: string) {
  if (!value) return { prefix: "CA", suffix: "" };
  const [first, ...rest] = value.split("-");
  return { prefix: first || "CA", suffix: rest.join("-") || "" };
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

  // Initialize form with all policy data
  const initializeForm = useMemo(() => {
    const idParts = splitPrefix(policy.policyIdNumber);
    const numberParts = splitPrefix(policy.policyNumber);
    return {
      policyPrefix: idParts.prefix,
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
    };
  }, [policy.policyIdNumber, policy.policyNumber, policy.coverageType, policy.registrationNumber, policy.engineNumber, policy.chassisNumber, policy.vehicleType, policy.coverageStartDate, policy.coverageEndDate, policy.totalPremiumDue, policy.status, policy.notes]);

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
    loadCoverageTypes();
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
      return updated;
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Policy number and Account number are read-only, keep the original values
    const policyNumber = policy.policyNumber || "";
    const policyIdNumber = policy.policyIdNumber || "";

    const res = await fetch(`/api/policies/${policy._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        policyNumber, // Keep original policy number (read-only)
        policyIdNumber, // Keep original account number (read-only)
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="flex items-center gap-2">
                    Policy Number <InfoTooltip content="The policy number cannot be edited." />
                  </label>
                  <input
                    className="mt-1 bg-[var(--ic-gray-50)] cursor-not-allowed"
                    value={policy.policyNumber || `${form.policyPrefix}${form.policyNumberSuffix ? `-${form.policyNumberSuffix}` : ""}`}
                    readOnly
                    disabled
                  />
                  <p className="mt-1 text-xs text-[var(--ic-gray-500)]">Policy number cannot be changed</p>
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    Account Number <InfoTooltip content="The account number cannot be edited." />
                  </label>
                  <input
                    className="mt-1 bg-[var(--ic-gray-50)] cursor-not-allowed"
                    value={policy.policyIdNumber || `${form.policyPrefix}-${form.policyIdSuffix}`}
                    readOnly
                    disabled
                  />
                  <p className="mt-1 text-xs text-[var(--ic-gray-500)]">Account number cannot be changed</p>
                </div>
                <div>
                  <label>Registration Number</label>
                  <input
                    className="mt-1"
                    value={form.registrationNumber}
                    onChange={(e) => update("registrationNumber", e.target.value)}
                  />
                </div>
                <div>
                  <label>Engine Number</label>
                  <input
                    className="mt-1"
                    value={form.engineNumber}
                    onChange={(e) => update("engineNumber", e.target.value)}
                    placeholder="Engine number"
                  />
                </div>
                <div>
                  <label>Chassis Number</label>
                  <input
                    className="mt-1"
                    value={form.chassisNumber}
                    onChange={(e) => update("chassisNumber", e.target.value)}
                    placeholder="Chassis number"
                  />
                </div>
                <div>
                  <label>Vehicle Type</label>
                  <input
                    className="mt-1"
                    value={form.vehicleType}
                    onChange={(e) => update("vehicleType", e.target.value)}
                    placeholder="Vehicle type (e.g., Sedan, SUV, Truck)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label>Coverage Type</label>
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
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label>Total Premium</label>
                  <input
                    type="number"
                    className="mt-1"
                    value={form.totalPremiumDue}
                    onChange={(e) => update("totalPremiumDue", e.target.value)}
                    min={0}
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label>Coverage Dates</label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={form.coverageStartDate}
                      onChange={(e) => update("coverageStartDate", e.target.value)}
                      required
                    />
                    <input
                      type="date"
                      value={form.coverageEndDate}
                      onChange={(e) => update("coverageEndDate", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label>Notes</label>
                <textarea
                  className="mt-1"
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  rows={3}
                  maxLength={2000}
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


