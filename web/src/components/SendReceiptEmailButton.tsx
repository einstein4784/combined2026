"use client";

import { useState } from "react";

type ReceiptEmailPayload = {
  receiptNumber: string;
  paymentDate: string;
  amount: number;
  paymentMethod?: string;
  policyNumber?: string;
  coverageType?: string;
  coverageStartDate?: string;
  coverageEndDate?: string;
  outstandingBalanceAfter?: number;
  customerName?: string;
  customerEmail?: string;
  customerContact?: string;
  notes?: string;
};

type Props = {
  receipt: ReceiptEmailPayload;
};

export function SendReceiptEmailButton({ receipt }: Props) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(receipt.customerEmail || "");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [rawError, setRawError] = useState<string | null>(null);

  const subject = `Receipt ${receipt.receiptNumber} from CISL System`;

  const onSend = async () => {
    if (!to) {
      setError("Recipient is required");
      return;
    }
    setLoading(true);
    setError(null);
    setRawError(null);
    setSent(false);
    try {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>
              :root {
                --navy: #0f172a;
                --sky: #0ea5e9;
                --slate: #475569;
                --bg: #f6f7fb;
              }
              body { margin: 0; padding: 24px; background: var(--bg); font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif; color: var(--navy); }
              .card { max-width: 640px; margin: 0 auto; background: #fff; border-radius: 18px; box-shadow: 0 14px 50px rgba(15, 23, 42, 0.1); overflow: hidden; }
              .header { padding: 22px 24px; background: linear-gradient(120deg, #0ea5e9, #2563eb); color: #fff; }
              .title { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.01em; }
              .subtitle { margin: 6px 0 0; font-size: 14px; opacity: 0.9; }
              .body { padding: 24px; }
              .row { display: flex; gap: 16px; margin-bottom: 12px; }
              .label { width: 140px; font-size: 13px; color: var(--slate); text-transform: uppercase; letter-spacing: 0.08em; }
              .value { flex: 1; font-size: 16px; font-weight: 600; color: var(--navy); }
              .chip { display: inline-flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 12px; background: rgba(14, 165, 233, 0.08); color: #0ea5e9; font-weight: 700; }
              .note { margin-top: 18px; padding: 14px 16px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; color: var(--slate); line-height: 1.6; }
              .footer { padding: 18px 24px 22px; background: #0f172a; color: #e2e8f0; font-size: 13px; text-align: center; }
              a { color: inherit; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="header">
                <p class="title">Payment Receipt</p>
                <p class="subtitle">Please find your receipt details below.</p>
              </div>
              <div class="body">
                <div class="row">
                  <div class="label">Receipt</div>
                  <div class="value">${receipt.receiptNumber}</div>
                </div>
                <div class="row">
                  <div class="label">Date</div>
                  <div class="value">${new Date(receipt.paymentDate).toLocaleString()}</div>
                </div>
                <div class="row">
                  <div class="label">Amount</div>
                  <div class="value"><span class="chip">$${receipt.amount.toFixed(2)}</span></div>
                </div>
                <div class="row">
                  <div class="label">Payment method</div>
                  <div class="value">${receipt.paymentMethod || "—"}</div>
                </div>
                <div class="row">
                  <div class="label">Policy</div>
                  <div class="value">${receipt.policyNumber || "—"}</div>
                </div>
                <div class="row">
                  <div class="label">Coverage</div>
                  <div class="value">${receipt.coverageType || "—"}</div>
                </div>
                <div class="row">
                  <div class="label">Coverage dates</div>
                  <div class="value">
                    ${receipt.coverageStartDate ? new Date(receipt.coverageStartDate).toLocaleDateString() : "—"}
                    →
                    ${receipt.coverageEndDate ? new Date(receipt.coverageEndDate).toLocaleDateString() : "—"}
                  </div>
                </div>
                <div class="row">
                  <div class="label">Outstanding</div>
                  <div class="value">${typeof receipt.outstandingBalanceAfter === "number" ? `$${receipt.outstandingBalanceAfter.toFixed(2)}` : "—"}</div>
                </div>
                <div class="row">
                  <div class="label">Customer</div>
                  <div class="value">${receipt.customerName || "—"}${receipt.customerEmail ? ` • ${receipt.customerEmail}` : ""}${receipt.customerContact ? ` • ${receipt.customerContact}` : ""}</div>
                </div>
                ${receipt.notes || note ? `<div class="note"><strong>Notes:</strong><br />${[receipt.notes, note].filter(Boolean).join("<br/>")}</div>` : ""}
              </div>
              <div class="footer">
                Sent by CISL System • Thank you for your payment.
              </div>
            </div>
          </body>
        </html>
      `;
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, html }),
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
        Email
      </button>

      {open && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-500)]">Send receipt</p>
                <h3 className="text-lg font-semibold text-[var(--ic-navy)]">{subject}</h3>
              </div>
              <button onClick={() => setOpen(false)} className="text-[var(--ic-gray-500)] hover:text-[var(--ic-gray-700)]">
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-[var(--ic-gray-700)]">Recipient</label>
                <input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 w-full"
                  placeholder="customer@example.com"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--ic-gray-700)]">Optional note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="mt-1 w-full"
                  placeholder="Add a short note to include with the receipt"
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


