"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccessToast } from "./GlobalSuccessToast";

type Props = {
  customerId: string;
  name: string;
};

export function DeleteCustomerButton({ customerId, name }: Props) {
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
        entityType: "customer",
        entityId: customerId,
        entityLabel: name,
      }),
    });
    if (res.ok) {
      setOpen(false);
      showSuccessToast({
        title: "Delete requested",
        message: "Awaiting manager approval",
      });
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to submit delete request.");
    }
    setLoading(false);
  };

  return (
    <>
      <button
        className="text-red-600 hover:text-red-700 text-sm"
        title="Delete customer"
        onClick={() => setOpen(true)}
      >
        🗑
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--ic-navy)]">Delete customer</h3>
              <button onClick={() => setOpen(false)} className="text-sm text-[var(--ic-gray-600)]">
                ✕
              </button>
            </div>
            <p className="mt-3 text-sm text-[var(--ic-gray-700)]">
              Are you sure you want to delete <strong>{name}</strong>? This action cannot be undone.
            </p>
            {error && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="btn btn-ghost border-[var(--ic-gray-200)]"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary bg-red-600 text-white hover:bg-red-700"
                onClick={onDelete}
                disabled={loading}
              >
                {loading ? "Sending…" : "Request delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


