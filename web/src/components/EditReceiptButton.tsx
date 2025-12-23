"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { InfoTooltip } from "./InfoTooltip";

type ReceiptEdit = {
  _id: string;
  receiptNumber: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  notes?: string | null;
  location?: string | null;
  registrationNumber?: string | null;
};

export function EditReceiptButton({ receipt }: { receipt: ReceiptEdit }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [form, setForm] = useState({
    amount: receipt.amount.toString(),
    paymentDate: formatDateForInput(receipt.paymentDate),
    paymentMethod: receipt.paymentMethod || "Cash",
    notes: receipt.notes || "",
    location: receipt.location || "",
    registrationNumber: receipt.registrationNumber || "",
  });

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/receipts/${receipt._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(form.amount || 0),
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod || "Cash",
        notes: form.notes || null,
        location: form.location || null,
        registrationNumber: form.registrationNumber || null,
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
      <button 
        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--ic-gray-200)] bg-white text-[var(--ic-navy)] shadow-sm hover:bg-[var(--ic-gray-50)]"
        onClick={() => setOpen(true)}
        title="Edit receipt"
        aria-label="Edit receipt"
      >
        ✏️
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-500)]">
                  Edit
                </p>
                <h3 className="text-lg font-semibold text-[var(--ic-navy)]">
                  Edit receipt {receipt.receiptNumber}
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
                    Amount <InfoTooltip content="Payment amount for this receipt." />
                  </label>
                  <input
                    type="number"
                    className="mt-1"
                    value={form.amount}
                    onChange={(e) => update("amount", e.target.value)}
                    required
                    min={0}
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    Payment Date <InfoTooltip content="Date when the payment was received." />
                  </label>
                  <input
                    type="date"
                    className="mt-1"
                    value={form.paymentDate}
                    onChange={(e) => update("paymentDate", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    Payment Method <InfoTooltip content="Method used for this payment." />
                  </label>
                  <select
                    className="mt-1 w-full"
                    value={form.paymentMethod}
                    onChange={(e) => update("paymentMethod", e.target.value)}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Transfer">Transfer</option>
                  </select>
                </div>
                <div>
                  <label>Location</label>
                  <input
                    className="mt-1"
                    value={form.location}
                    onChange={(e) => update("location", e.target.value)}
                    placeholder="e.g., Castries, Vieux Fort"
                  />
                </div>
                <div>
                  <label>Registration Number</label>
                  <input
                    className="mt-1"
                    value={form.registrationNumber}
                    onChange={(e) => update("registrationNumber", e.target.value)}
                    placeholder="Vehicle registration"
                  />
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
                  placeholder="Additional notes about this receipt"
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




