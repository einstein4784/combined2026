"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState as useClientState } from "react";

type ReportType = "cash" | "outstanding" | "renewals" | "users";
type RangePreset = "day" | "week" | "month" | "custom";

type Prefix = "ALL" | "CA" | "VF" | "SF";

export function ReportsView() {
  const router = useRouter();
  const [reportType, setReportType] = useState<ReportType>("cash");
  const [policyPrefix, setPolicyPrefix] = useState<Prefix>("ALL");
  const [range, setRange] = useState<RangePreset>("day");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userOptions, setUserOptions] = useClientState<{ value: string; label: string }[]>([]);
  const [userLoadError, setUserLoadError] = useClientState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      if (reportType !== "users") return;
      try {
        setUserLoadError(null);
        const res = await fetch("/api/users?scope=dropdown");
        if (!res.ok) throw new Error("Failed to load users");
        const data = await res.json();
        const options =
          data?.users?.map((u: any) => ({ value: u.username, label: u.username })) || [];
        setUserOptions(options);
      } catch (e: any) {
        setUserLoadError(e?.message || "Failed to load users");
      }
    };
    loadUsers();
  }, [reportType]);

  const effectiveDates = useMemo(() => {
    if (range === "custom") {
      return { from, to };
    }
    const now = new Date();
    const toDate = now.toISOString().slice(0, 10);
    const fromDate = (() => {
      const d = new Date(now);
      if (range === "day") {
        // single calendar day (today)
        return toDate;
      }
      if (range === "week") d.setDate(d.getDate() - 7);
      if (range === "month") d.setMonth(d.getMonth() - 1);
      return d.toISOString().slice(0, 10);
    })();
    return { from: fromDate, to: toDate };
  }, [from, to, range]);

  const load = async () => {
    setLoading(true);
    setError(null);
    if (showCustomDates && (!from || !to)) {
      setError("Please pick both start and end dates.");
      setLoading(false);
      return;
    }
    if (reportType === "users" && !userQuery.trim()) {
      setError("Please select a username.");
      setLoading(false);
      return;
    }
    const isRenewalNotice = reportType === "renewals";
    const isUserReport = reportType === "users";
    const url = new URL(
      isRenewalNotice ? "/reports/renewal" : isUserReport ? "/reports/user" : "/reports/view",
      window.location.origin,
    );
    if (!isRenewalNotice && !isUserReport) {
      url.searchParams.set("type", reportType);
    }
    if (reportType === "cash" && policyPrefix) {
      url.searchParams.set("prefix", policyPrefix);
    }
    if (!isUserReport) {
      if (effectiveDates.from) url.searchParams.set("from", effectiveDates.from);
      if (effectiveDates.to) url.searchParams.set("to", effectiveDates.to);
      if (query.trim()) url.searchParams.set("q", query.trim());
    } else {
      url.searchParams.set("username", userQuery.trim());
    }
    router.push(url.toString());
    setLoading(false);
  };

  const showCustomDates = range === "custom";

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(["cash", "outstanding", "renewals", "users"] as ReportType[]).map((type) => (
              <button
                key={type}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition hover:border-[var(--ic-navy)] hover:text-[var(--ic-navy)] ${
                  reportType === type
                    ? "border-[var(--ic-navy)] bg-[var(--ic-navy)] text-white"
                    : "border-[var(--ic-gray-300)] text-[var(--ic-gray-700)]"
                }`}
                onClick={() => {
                  setReportType(type);
                }}
              >
                {type === "cash" && "Cash report"}
                {type === "outstanding" && "Outstanding balance"}
                {type === "renewals" && "Renewal listing"}
                {type === "users" && "User report"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--ic-gray-600)]">
            <span>Range:</span>
            <div className="flex gap-1">
              {(["day", "week", "month", "custom"] as RangePreset[]).map((r) => (
                <button
                  key={r}
                  className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
                    range === r
                      ? "bg-[var(--ic-navy)] text-white"
                      : "bg-[var(--ic-gray-100)] text-[var(--ic-gray-700)]"
                  }`}
                  onClick={() => setRange(r)}
                >
                  {r === "day" && "Day"}
                  {r === "week" && "Week"}
                  {r === "month" && "Month"}
                  {r === "custom" && "Custom"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5 md:items-end">
          <div>
            <label>From</label>
            <input
              type="date"
              value={showCustomDates ? from : effectiveDates.from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1"
              disabled={!showCustomDates}
            />
          </div>
          <div>
            <label>To</label>
            <input
              type="date"
              value={showCustomDates ? to : effectiveDates.to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1"
              disabled={!showCustomDates}
            />
          </div>
          <div>
            <label>Search (policy or customer)</label>
            <input
              placeholder="POL-123 or Jane Doe"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mt-1"
              disabled={reportType === "users"}
            />
          </div>
          {reportType === "users" && (
            <div>
              <label>Username</label>
              <select
                className="mt-1 w-full"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
              >
                <option value="">Select user</option>
                {userOptions.map((u: any) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {reportType === "cash" && (
            <div>
              <label>Policy Prefix</label>
              <select
                className="mt-1 w-full"
                value={policyPrefix}
                onChange={(e) => setPolicyPrefix(e.target.value as Prefix)}
              >
                <option value="ALL">All offices</option>
                <option value="CA">CA</option>
                <option value="VF">VF</option>
                <option value="SF">SF</option>
              </select>
            </div>
          )}
          <div className="flex gap-2 md:col-span-2">
            <button
              onClick={load}
              className="btn btn-primary disabled:opacity-60 w-full"
              disabled={loading}
            >
              {loading ? "Loading…" : "Run report"}
            </button>
            {error && (
              <span className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--ic-gray-600)]">
          <span className="rounded-full bg-[var(--ic-gray-100)] px-3 py-1">
            {effectiveDates.from} → {effectiveDates.to}
          </span>
          <span className="rounded-full bg-[var(--ic-gray-100)] px-3 py-1 capitalize">
            {reportType.replace("-", " ")}
          </span>
        </div>
      </div>

      {reportType === "cash" && (
        <div className="card">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--ic-navy)]">Cash report</h3>
            <div className="text-sm font-semibold text-[var(--ic-navy)]">Total: —</div>
          </div>
          <p className="mt-3 text-sm text-[var(--ic-gray-600)]">
            Click “Run report” to open in a new window.
          </p>
        </div>
      )}

      {reportType === "outstanding" && (
        <div className="card">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--ic-navy)]">
              Outstanding balance
            </h3>
            <div className="text-sm font-semibold text-[var(--ic-navy)]">Total outstanding: —</div>
          </div>
          <p className="mt-3 text-sm text-[var(--ic-gray-600)]">
            Click “Run report” to open in a new window.
          </p>
        </div>
      )}

      {reportType === "renewals" && (
        <div className="card">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--ic-navy)]">Renewal notices</h3>
            <div className="text-sm text-[var(--ic-gray-600)]">
              Coverage end between {effectiveDates.from} and {effectiveDates.to}
            </div>
          </div>
          <p className="mt-3 text-sm text-[var(--ic-gray-600)]">
            Set dates and optionally search by policy or customer, then click “Run report” to open
            printable renewal notices.
          </p>
        </div>
      )}
    </div>
  );
}

