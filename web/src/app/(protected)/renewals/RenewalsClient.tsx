"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SendNoticeEmailButton } from "@/components/SendNoticeEmailButton";

type PolicyRow = {
  id: string;
  policyNumber: string;
  policyIdNumber?: string;
  coverageStartDate: string | null;
  coverageEndDate: string | null;
  outstandingBalance: number;
  totalPremiumDue: number;
  amountPaid: number;
  coverageType?: string;
  registrationNumber?: string | null;
  customerName: string;
  customerEmail?: string;
  customerContact?: string;
  customerIdNumber?: string;
  renewalNoticeSentAt?: string | null;
};

type Props = {
  policies: PolicyRow[];
  totalCount: number;
  searchParams?: {
    q?: string;
    from?: string;
    to?: string;
  };
};

export default function RenewalsClient({ policies, totalCount, searchParams = {} }: Props) {
  const [rows, setRows] = useState<PolicyRow[]>(policies);
  const [noteAll, setNoteAll] = useState("");
  const [sendingAll, setSendingAll] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const policiesWithEmail = useMemo(
    () => rows.filter((p) => (p.customerEmail || "").trim().length > 0),
    [rows],
  );

  const markSent = (id: string, sentAt: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, renewalNoticeSentAt: sentAt } : r)));
  };

  const buildHtml = (row: PolicyRow, note?: string) => {
    const coverageStart = row.coverageStartDate
      ? new Date(row.coverageStartDate).toLocaleDateString()
      : "TBA";
    const coverageEnd = row.coverageEndDate ? new Date(row.coverageEndDate).toLocaleDateString() : "TBA";
    const coverageType = row.coverageType || "—";
    const reg = row.registrationNumber || "TBA";
    const contact = row.customerContact || "—";
    const idNum = row.customerIdNumber || "—";
    const premium = row.totalPremiumDue ?? 0;
    const paid = row.amountPaid ?? 0;
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            :root { --navy:#0f172a; --sky:#0ea5e9; --slate:#475569; --bg:#f6f7fb; }
            body { margin:0; padding:24px; background:var(--bg); font-family:"Inter","Segoe UI",system-ui,-apple-system,sans-serif; color:var(--navy); }
            .card { max-width:640px; margin:0 auto; background:#fff; border-radius:18px; box-shadow:0 14px 50px rgba(15,23,42,0.1); overflow:hidden; }
            .header { padding:22px 24px; background:linear-gradient(120deg,#0ea5e9,#2563eb); color:#fff; }
            .title { margin:0; font-size:22px; font-weight:700; letter-spacing:0.01em; }
            .subtitle { margin:6px 0 0; font-size:14px; opacity:0.9; }
            .body { padding:24px; }
            .row { display:flex; gap:16px; margin-bottom:12px; }
            .label { width:140px; font-size:13px; color:var(--slate); text-transform:uppercase; letter-spacing:0.08em; }
            .value { flex:1; font-size:16px; font-weight:600; color:var(--navy); }
            .chip { display:inline-flex; align-items:center; gap:8px; padding:10px 14px; border-radius:12px; background:rgba(14,165,233,0.08); color:#0ea5e9; font-weight:700; }
            .note { margin-top:18px; padding:14px 16px; border-radius:12px; background:#f8fafc; border:1px solid #e2e8f0; color:var(--slate); line-height:1.6; }
            .footer { padding:18px 24px 22px; background:#0f172a; color:#e2e8f0; font-size:13px; text-align:center; }
            a { color: inherit; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <p class="title">Policy Renewal Notice</p>
              <p class="subtitle">Please review the policy details below.</p>
            </div>
            <div class="body">
                <div class="row"><div class="label">Policy</div><div class="value">${row.policyNumber}</div></div>
                <div class="row"><div class="label">Policy ID</div><div class="value">${row.policyIdNumber || "—"}</div></div>
              <div class="row"><div class="label">Customer</div><div class="value">${row.customerName}</div></div>
                <div class="row"><div class="label">Customer ID</div><div class="value">${idNum}</div></div>
                <div class="row"><div class="label">Contact</div><div class="value">${contact}</div></div>
              <div class="row"><div class="label">Coverage</div><div class="value">${coverageStart} → ${coverageEnd}</div></div>
                <div class="row"><div class="label">Coverage type</div><div class="value">${coverageType}</div></div>
                <div class="row"><div class="label">Registration</div><div class="value">${reg}</div></div>
                <div class="row"><div class="label">Premium</div><div class="value">$${premium.toFixed(2)}</div></div>
                <div class="row"><div class="label">Paid to date</div><div class="value">$${paid.toFixed(2)}</div></div>
              <div class="row"><div class="label">Outstanding</div><div class="value"><span class="chip">$${(row.outstandingBalance ?? 0).toFixed(2)}</span></div></div>
              ${note ? `<div class="note"><strong>Message:</strong><br />${note}</div>` : ""}
            </div>
            <div class="footer">Sent by CISL System • Please contact us if you have any questions.</div>
          </div>
        </body>
      </html>
    `;
  };

  const sendEmail = async (row: PolicyRow, note?: string) => {
    if (!row.customerEmail) throw new Error("No recipient email");
    const html = buildHtml(row, note);
    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: row.customerEmail, subject: "Policy Renewal Notice", html }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to send email");
    }
    const sentAt = new Date().toISOString();
    await fetch("/api/renewals/notice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policyId: row.id }),
    }).catch(() => {});
    markSent(row.id, sentAt);
  };

  const sendAll = async () => {
    setSendingAll(true);
    setBulkError(null);
    setBulkResult(null);
    try {
      let sent = 0;
      let skipped = 0;
      let failed = 0;
      for (const row of policiesWithEmail) {
        try {
          await sendEmail(row, noteAll.trim() || undefined);
          sent += 1;
        } catch (err) {
          failed += 1;
        }
      }
      skipped = policies.length - policiesWithEmail.length;
      setBulkResult(`Sent ${sent}, failed ${failed}, skipped (no email) ${skipped}.`);
    } catch (e: any) {
      setBulkError(e?.message || "Failed to send");
    } finally {
      setSendingAll(false);
    }
  };

  // Build report URL with current filters
  const buildReportUrl = () => {
    const params = new URLSearchParams();
    
    if (searchParams.q) params.set("q", searchParams.q);
    if (searchParams.from) params.set("from", searchParams.from);
    if (searchParams.to) params.set("to", searchParams.to);
    
    return `/reports/renewal?${params.toString()}`;
  };

  return (
    <div className="card">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--ic-navy)]">Results</h3>
          <p className="text-sm text-[var(--ic-gray-600)]">
            {rows.length} record{rows.length === 1 ? "" : "s"} · Email individually or send all.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge success">{rows.length} records</span>
          {rows.length > 0 && (
            <Link
              href={buildReportUrl()}
              className="btn btn-secondary"
              target="_blank"
            >
              Generate Report
            </Link>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-lg border border-[var(--ic-gray-200)] bg-[var(--ic-gray-50)] p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-sm font-semibold text-[var(--ic-gray-700)]">Bulk note (optional)</label>
            <textarea
              value={noteAll}
              onChange={(e) => setNoteAll(e.target.value)}
              className="w-full"
              rows={2}
              placeholder="Add a note to include in all emails for this result set"
            />
          </div>
          <button
            className="btn btn-primary self-start sm:self-end"
            onClick={sendAll}
            disabled={sendingAll || !policiesWithEmail.length}
            title={!policiesWithEmail.length ? "No emails available in results" : "Send notices to all results"}
          >
            {sendingAll ? "Sending…" : `Email all (${policiesWithEmail.length})`}
          </button>
        </div>
        {bulkResult && <div className="text-sm text-[var(--ic-navy)] font-semibold">{bulkResult}</div>}
        {bulkError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{bulkError}</div>
        )}
      </div>

      <table className="mt-4">
        <thead>
          <tr>
            <th>Policy</th>
            <th>Policy ID</th>
            <th>Customer</th>
            <th>Coverage</th>
            <th>Outstanding</th>
            <th>Notice sent</th>
            <th>Notice</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td className="font-semibold text-[var(--ic-navy)]">
                {p.policyNumber}
              </td>
              <td className="text-xs text-[var(--ic-gray-700)]">{p.policyIdNumber || "—"}</td>
              <td>{p.customerName || "—"}</td>
              <td>
                {(p.coverageStartDate ? new Date(p.coverageStartDate).toLocaleDateString() : "TBA") +
                  " → " +
                  (p.coverageEndDate ? new Date(p.coverageEndDate).toLocaleDateString() : "TBA")}
              </td>
              <td>${(p.outstandingBalance || 0).toFixed(2)}</td>
            <td className="text-xs text-[var(--ic-gray-700)]">
              {p.renewalNoticeSentAt
                ? new Date(p.renewalNoticeSentAt).toLocaleString()
                : "Not sent"}
            </td>
              <td>
                <Link
                  href={`/policies/notice?policyId=${p.id}&policyNumber=${encodeURIComponent(p.policyNumber || "")}`}
                  target="_blank"
                  className="text-[var(--ic-navy)] underline"
                >
                  Open notice
                </Link>
              </td>
              <td>
                {p.customerEmail ? (
                  <SendNoticeEmailButton
                    policyId={p.id}
                    policyNumber={p.policyNumber}
                    policyIdNumber={p.policyIdNumber}
                    customerName={p.customerName || "Valued Customer"}
                    customerContact={p.customerContact}
                    customerIdNumber={p.customerIdNumber}
                    coverageStart={
                      p.coverageStartDate ? new Date(p.coverageStartDate).toLocaleDateString() : "TBA"
                    }
                    coverageEnd={p.coverageEndDate ? new Date(p.coverageEndDate).toLocaleDateString() : "TBA"}
                    outstanding={p.outstandingBalance || 0}
                    coverageType={p.coverageType}
                    registrationNumber={p.registrationNumber || undefined}
                    totalPremiumDue={p.totalPremiumDue}
                    amountPaid={p.amountPaid}
                    customerEmail={p.customerEmail}
                    onSent={(sentAt) => markSent(p.id, sentAt)}
                  />
                ) : (
                  <span className="text-xs text-[var(--ic-gray-500)]">No email on file</span>
                )}
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={6} className="py-4 text-center text-sm text-slate-500">
                No renewals in range.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}


