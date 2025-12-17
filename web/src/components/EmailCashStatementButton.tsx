"use client";

import { useState } from "react";

type CashRow = {
  receiptNumber?: string;
  policyNumber?: string;
  policyIdNumber?: string;
  customerName?: string;
  coverageStartDate?: string | null;
  coverageEndDate?: string | null;
  amount?: number; // payment amount recorded (net)
  refundAmount?: number;
  netAmount?: number;
  paymentMethod?: string;
  paymentDate?: string;
  receiptStatus?: string;
};

type Props = {
  rows: CashRow[];
  total: number;
  totalCash?: number;
  totalCard?: number;
  totalTransfer?: number;
  from: string;
  to: string;
  recipients?: { email: string; name?: string }[];
};

const DEFAULT_RECIPIENTS = ["ilouis@combinedinsuranceslu.com", "clouis@combinedinsuranceslu.com"];

export function EmailCashStatementButton({
  rows,
  total,
  totalCash,
  totalCard,
  totalTransfer,
  from,
  to,
  recipients,
}: Props) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [rawError, setRawError] = useState<string | null>(null);

  const subject = `Cash Statement • ${from.slice(0, 10)} → ${to.slice(0, 10)}`;

  const onSend = async () => {
    setLoading(true);
    setError(null);
    setRawError(null);
    setSent(false);
    try {
      const limitedRows = rows.slice(0, 100); // safety cap
      const tableRows = limitedRows
        .map(
          (r) => `
            <tr>
              <td>${r.customerName || "—"}</td>
              <td>${r.policyNumber || "—"}</td>
              <td>${r.policyIdNumber || "—"}</td>
              <td>${r.receiptNumber || "—"}</td>
              <td>${r.receiptStatus === "void" ? "VOID" : "ACTIVE"}</td>
              <td>${r.amount != null ? `$${r.amount.toFixed(2)}` : "—"}</td>
              <td>${r.refundAmount != null ? `$${r.refundAmount.toFixed(2)}` : "—"}</td>
              <td>${r.netAmount != null ? `$${r.netAmount.toFixed(2)}` : "—"}</td>
              <td>${r.paymentMethod || "—"}</td>
              <td>${r.paymentDate ? new Date(r.paymentDate).toLocaleString() : "—"}</td>
            </tr>
          `,
        )
        .join("");

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>
              :root { --navy:#0f172a; --sky:#0ea5e9; --slate:#475569; --bg:#f6f7fb; }
              body { margin:0; padding:24px; background:var(--bg); font-family:"Inter","Segoe UI",system-ui,-apple-system,sans-serif; color:var(--navy); }
              .card { max-width:720px; margin:0 auto; background:#fff; border-radius:18px; box-shadow:0 14px 50px rgba(15,23,42,0.1); overflow:hidden; }
              .header { padding:22px 24px; background:linear-gradient(120deg,#0ea5e9,#2563eb); color:#fff; }
              .title { margin:0; font-size:22px; font-weight:700; letter-spacing:0.01em; }
              .subtitle { margin:6px 0 0; font-size:14px; opacity:0.9; }
              .body { padding:24px; }
              .summary { display:flex; gap:12px; flex-wrap:wrap; margin:18px 0; }
              .pill { padding:10px 14px; border-radius:12px; background:rgba(14,165,233,0.08); color:#0ea5e9; font-weight:700; }
              table { width:100%; border-collapse:collapse; margin-top:12px; }
              th, td { padding:10px 8px; text-align:left; font-size:13px; color:var(--navy); }
              th { text-transform:uppercase; letter-spacing:0.05em; font-size:12px; color:var(--slate); border-bottom:1px solid #e2e8f0; }
              tr:nth-child(even) td { background:#f8fafc; }
              .footer { padding:18px 24px 22px; background:#0f172a; color:#e2e8f0; font-size:13px; text-align:center; }
              .note { margin-top:18px; padding:14px 16px; border-radius:12px; background:#f8fafc; border:1px solid #e2e8f0; color:var(--slate); line-height:1.6; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="header">
                <p class="title">Cash Statement</p>
                <p class="subtitle">${from.slice(0,10)} → ${to.slice(0,10)}</p>
              </div>
              <div class="body">
                <div class="summary">
                  <span class="pill">Cash: $${(totalCash ?? total).toFixed(2)}</span>
                  <span class="pill">Card: $${(totalCard ?? 0).toFixed(2)}</span>
                  <span class="pill">Transfer (not in cash total): $${(totalTransfer ?? 0).toFixed(2)}</span>
                  <span class="pill">Receipts: ${rows.length}</span>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Policy</th>
                      <th>Policy ID</th>
                      <th>Receipt #</th>
                      <th>Status</th>
                      <th>Amount</th>
                      <th>Refund</th>
                      <th>Net</th>
                      <th>Method</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${tableRows || '<tr><td colspan="9">No payments found.</td></tr>'}
                  </tbody>
                </table>
                ${
                  rows.length > limitedRows.length
                    ? `<div class="note">Showing first ${limitedRows.length} of ${rows.length} rows.</div>`
                    : ""
                }
                ${
                  note
                    ? `<div class="note"><strong>Note:</strong><br/>${note}</div>`
                    : ""
                }
              </div>
              <div class="footer">
                Sent by CISL System • Cash Statement
              </div>
            </div>
          </body>
        </html>
      `;

      const finalRecipients = [
        ...DEFAULT_RECIPIENTS,
        ...(recipients || []).map((r) => r.email).filter(Boolean),
      ];

      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: finalRecipients.join(","), subject, html }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRawError(JSON.stringify(data));
        throw new Error(data.error || "Failed to send email");
      }
      setSent(true);
      setOpen(false);
    } catch (e: any) {
      setError(e.message || "Failed to send email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="btn" onClick={() => setOpen(true)}>
        Email to Ian & Crystal
      </button>

      {open && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-500)]">Send cash statement</p>
                <h3 className="text-lg font-semibold text-[var(--ic-navy)]">{subject}</h3>
              </div>
              <button onClick={() => setOpen(false)} className="text-[var(--ic-gray-500)] hover:text-[var(--ic-gray-700)]">
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-[var(--ic-gray-700)]">Recipients</label>
                <input
                  type="text"
                  value={[
                    ...DEFAULT_RECIPIENTS,
                    ...(recipients || []).map((r) => r.email),
                  ].join(", ")}
                  readOnly
                  className="mt-1 w-full bg-[var(--ic-gray-50)]"
                />
                <p className="text-xs text-[var(--ic-gray-500)]">
                  Recipients include the required addresses plus any added in Admin.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--ic-gray-700)]">Optional note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="mt-1 w-full"
                  placeholder="Add a short note to include with the report"
                />
              </div>
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              {rawError && (
                <pre className="max-h-32 overflow-auto rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 whitespace-pre-wrap">
                  {rawError}
                </pre>
              )}
              {sent && (
                <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  Email sent successfully.
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={loading}>
                Close
              </button>
              <button className="btn btn-primary" onClick={onSend} disabled={loading}>
                {loading ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


