"use client";

import { useState } from "react";

type Props = {
  policyId: string;
  policyNumber: string;
  policyIdNumber?: string;
  customerName: string;
  customerContact?: string;
  customerIdNumber?: string;
  coverageStart: string;
  coverageEnd: string;
  outstanding: number;
  coverageType?: string;
  registrationNumber?: string;
  totalPremiumDue?: number;
  amountPaid?: number;
  customerEmail?: string;
  onSent?: (sentAt: string) => void;
};

export function SendNoticeEmailButton({
  policyId,
  policyNumber,
  policyIdNumber,
  customerName,
  customerContact,
  customerIdNumber,
  coverageStart,
  coverageEnd,
  outstanding,
  coverageType,
  registrationNumber,
  totalPremiumDue,
  amountPaid,
  customerEmail,
  onSent,
}: Props) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(customerEmail || "");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [rawError, setRawError] = useState<string | null>(null);

  const subject = "Message from CISL System";

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
                --border: #e2e8f0;
              }
              body { margin: 0; padding: 24px; background: var(--bg); font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif; color: var(--navy); }
              .card { max-width: 720px; margin: 0 auto; background: #fff; border-radius: 18px; box-shadow: 0 14px 50px rgba(15, 23, 42, 0.08); overflow: hidden; border: 1px solid var(--border); }
              .header { padding: 22px 24px; background: linear-gradient(120deg, #0ea5e9, #2563eb); color: #fff; display:flex; gap:12px; align-items:flex-start; }
              .title { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.01em; }
              .subtitle { margin: 4px 0 0; font-size: 13px; opacity: 0.95; }
              .body { padding: 24px; }
              .row { display: flex; gap: 16px; margin-bottom: 12px; }
              .label { width: 140px; font-size: 13px; color: var(--slate); text-transform: uppercase; letter-spacing: 0.08em; }
              .value { flex: 1; font-size: 16px; font-weight: 600; color: var(--navy); }
              .chip { display: inline-flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 12px; background: rgba(14, 165, 233, 0.08); color: #0ea5e9; font-weight: 700; }
              .note { margin-top: 18px; padding: 14px 16px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; color: var(--slate); line-height: 1.6; }
              .offices { margin-top: 18px; border-top: 1px solid var(--border); padding-top: 14px; color: var(--slate); font-size: 13px; line-height: 1.6; }
              .offices strong { color: var(--navy); }
              .footer { padding: 18px 24px 22px; background: #0f172a; color: #e2e8f0; font-size: 13px; text-align: center; }
              a { color: inherit; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="header">
                <div>
                  <p class="title">Combined Insurance Services Ltd.</p>
                  <p class="subtitle">Policy Renewal Notice – please review the details below.</p>
                </div>
              </div>
              <div class="body">
                <div class="row">
                  <div class="label">Policy</div>
                  <div class="value">${policyNumber}</div>
                </div>
                <div class="row">
                  <div class="label">Policy ID</div>
                  <div class="value">${policyIdNumber || "—"}</div>
                </div>
                <div class="row">
                  <div class="label">Customer</div>
                  <div class="value">${customerName}</div>
                </div>
                <div class="row">
                  <div class="label">Customer ID</div>
                  <div class="value">${customerIdNumber || "—"}</div>
                </div>
                <div class="row">
                  <div class="label">Contact</div>
                  <div class="value">${customerContact || "—"}</div>
                </div>
                <div class="row">
                  <div class="label">Coverage</div>
                  <div class="value">${coverageStart} → ${coverageEnd}</div>
                </div>
                <div class="row">
                  <div class="label">Coverage type</div>
                  <div class="value">${coverageType || "—"}</div>
                </div>
                <div class="row">
                  <div class="label">Registration</div>
                  <div class="value">${registrationNumber || "TBA"}</div>
                </div>
                <div class="row">
                  <div class="label">Premium</div>
                  <div class="value">$${(totalPremiumDue ?? 0).toFixed(2)}</div>
                </div>
                <div class="row">
                  <div class="label">Paid to date</div>
                  <div class="value">$${(amountPaid ?? 0).toFixed(2)}</div>
                </div>
                <div class="row">
                  <div class="label">Outstanding</div>
                  <div class="value"><span class="chip">$${outstanding.toFixed(2)}</span></div>
                </div>
                ${note ? `<div class="note"><strong>Message:</strong><br />${note}</div>` : ""}
                <div class="offices">
                  <strong>Our offices</strong><br/>
                  Castries: P.O. GM 636, Gablewoods Mall • Tel: 758 456-0700<br/>
                  Vieux Fort: Garvey Street • Tel: 454-5415<br/>
                  Soufriere: Bridge Street • Tel: 457-1500
                </div>
              </div>
              <div class="footer">
                Sent by CISL System • Please contact us if you have any questions.
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
      const sentAt = new Date().toISOString();
      await fetch("/api/renewals/notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyId }),
      }).catch(() => {});
      onSent?.(sentAt);
      setOpen(false);
    } catch (e: any) {
      setError(e.message || "Failed to send email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="btn btn-outline" onClick={() => setOpen(true)}>
        Email
      </button>

      {open && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-500)]">Send notice</p>
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
                <label className="text-sm font-medium text-[var(--ic-gray-700)]">Optional message</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="mt-1 w-full"
                  placeholder="Add a short note to include with the notice"
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


