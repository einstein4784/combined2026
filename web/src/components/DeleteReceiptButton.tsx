"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccessToast } from "./GlobalSuccessToast";

type Props = {
  receiptId: string;
  receiptNumber?: string;
};

export function DeleteReceiptButton({ receiptId, receiptNumber }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/delete-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: "receipt",
        entityId: receiptId,
        entityLabel: receiptNumber || receiptId,
      }),
    });
    if (res.ok) {
      router.refresh();
      showSuccessToast({
        title: "Delete requested",
        message: "Awaiting manager approval",
      });
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to submit delete request.");
    }
    setLoading(false);
    setConfirming(false);
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button
        className="flex h-8 w-8 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-60"
        onClick={() => setConfirming(true)}
        disabled={loading}
        title="Delete receipt"
        aria-label="Delete receipt"
      >
        🗑️
      </button>
      {confirming && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-[var(--ic-navy)]">Delete receipt?</h3>
            <p className="mt-2 text-sm text-[var(--ic-gray-700)]">
              {receiptNumber ? `Receipt ${receiptNumber}` : "This receipt"} will be permanently deleted.
            </p>
            {error && (
              <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn" onClick={() => setConfirming(false)} disabled={loading}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleDelete} disabled={loading}>
                {loading ? "Sending…" : "Request delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


