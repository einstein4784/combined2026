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

  const idParts = useMemo(() => splitPrefix(policy.policyIdNumber), [policy.policyIdNumber]);
  const numberParts = useMemo(() => splitPrefix(policy.policyNumber), [policy.policyNumber]);

  const [form, setForm] = useState({
    policyPrefix: idParts.prefix,
    policyNumberSuffix: numberParts.suffix,
    policyIdSuffix: idParts.suffix,
    coverageType: policy.coverageType,
    registrationNumber: policy.registrationNumber || "",
    coverageStartDate: policy.coverageStartDate
      ? policy.coverageStartDate.slice(0, 10)
      : "",
    coverageEndDate: policy.coverageEndDate ? policy.coverageEndDate.slice(0, 10) : "",
    totalPremiumDue: policy.totalPremiumDue.toString(),
    status: policy.status || "Active",
    notes: policy.notes || "",
  });

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

    const policyNumber = form.policyNumberSuffix
      ? `${form.policyPrefix}-${form.policyNumberSuffix}`
      : `${form.policyPrefix}`;
    const policyIdNumber = `${form.policyPrefix}-${form.policyIdSuffix}`.trim();

    const res = await fetch(`/api/policies/${policy._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        policyNumber,
        policyIdNumber,
        coverageType: form.coverageType,
        registrationNumber: form.registrationNumber || undefined,
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
                    Policy prefix <InfoTooltip content="Prefix applied before policy numbers and IDs." />
                  </label>
                  <select
                    className="mt-1 w-full"
                    value={form.policyPrefix}
                    onChange={(e) => update("policyPrefix", e.target.value)}
                  >
                    {PREFIXES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Policy number suffix</label>
                  <input
                    className="mt-1"
                    value={form.policyNumberSuffix}
                    onChange={(e) => update("policyNumberSuffix", e.target.value)}
                    placeholder="12345"
                  />
                </div>
                <div>
                  <label>Policy ID suffix</label>
                  <input
                    className="mt-1"
                    value={form.policyIdSuffix}
                    onChange={(e) => update("policyIdSuffix", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label>Registration Number</label>
                  <input
                    className="mt-1"
                    value={form.registrationNumber}
                    onChange={(e) => update("registrationNumber", e.target.value)}
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


