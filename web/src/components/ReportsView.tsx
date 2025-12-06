"use client";

import { useMemo, useState } from "react";

type ReportType = "cash" | "outstanding" | "renewals";
type RangePreset = "day" | "week" | "month" | "custom";

export function ReportsView() {
  const [reportType, setReportType] = useState<ReportType>("cash");
  const [range, setRange] = useState<RangePreset>("day");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveDates = useMemo(() => {
    if (range === "custom") {
      return { from, to };
    }
    const now = new Date();
    const toDate = now.toISOString().slice(0, 10);
    const fromDate = (() => {
      const d = new Date(now);
      if (range === "day") d.setDate(d.getDate() - 1);
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
    const isRenewalNotice = reportType === "renewals";
    const url = new URL(
      isRenewalNotice ? "/reports/renewal" : "/reports/view",
      window.location.origin,
    );
    if (!isRenewalNotice) {
      url.searchParams.set("type", reportType);
    }
    if (effectiveDates.from) url.searchParams.set("from", effectiveDates.from);
    if (effectiveDates.to) url.searchParams.set("to", effectiveDates.to);
    if (query.trim()) url.searchParams.set("q", query.trim());
    window.open(url.toString(), "_blank", "noopener,noreferrer");
    setLoading(false);
  };

  const showCustomDates = range === "custom";

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(["cash", "outstanding", "renewals"] as ReportType[]).map((type) => (
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
            />
          </div>
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

