"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccessToast } from "./GlobalSuccessToast";

type Props = {
  paymentId: string;
  label?: string;
};

export function DeletePaymentButton({ paymentId, label }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDelete = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/delete-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: "payment",
        entityId: paymentId,
        entityLabel: label || paymentId,
      }),
    });
    if (res.ok) {
      router.refresh();
      setOpen(false);
      showSuccessToast({
        title: "Delete requested",
        message: "Awaiting manager approval",
      });
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to submit delete request.");
    }
    setLoading(false);
  };

  return (
    <>
      <button
        className="flex h-8 w-8 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-60"
        onClick={() => setOpen(true)}
        disabled={loading}
        title="Delete payment"
        aria-label="Delete payment"
      >
        🗑️
      </button>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-[var(--ic-navy)]">Delete payment?</h3>
            <p className="mt-2 text-sm text-[var(--ic-gray-700)]">
              This payment and any linked receipt will be removed.
            </p>
            {error && (
              <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={onDelete} disabled={loading}>
                {loading ? "Sending…" : "Request delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


