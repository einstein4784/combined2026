"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccessToast } from "./GlobalSuccessToast";

export function DeleteAllDataButton() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmText.trim().toUpperCase() !== "DELETE ALL DATA") {
      setError("Confirmation text must be exactly 'DELETE ALL DATA'");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/delete-all-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        showSuccessToast({
          title: "Data deleted",
          message: "All customer, policy, and payment data has been deleted successfully.",
        });
        setShowConfirm(false);
        setConfirmText("");
        router.refresh();
      } else {
        setError(data.error || "Failed to delete data");
      }
    } catch (err) {
      setError("An error occurred while deleting data");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="card space-y-3 border-red-200 bg-red-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="section-heading text-red-700">Danger Zone</p>
            <h3 className="text-lg font-semibold text-red-800">Delete All Business Data</h3>
            <p className="text-sm text-red-700">
              Permanently delete all customer, policy, payment, and receipt data. User accounts and
              system settings will remain intact.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-300 bg-red-100 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="rounded-md border border-red-300 bg-red-100 px-3 py-2 text-sm text-red-800">
          <strong>Warning:</strong> This action cannot be undone. All customer records, policies,
          payments, and receipts will be permanently deleted. Make sure you have a backup before
          proceeding.
        </div>

        <div className="flex justify-end">
          <button
            className="btn border-red-300 bg-red-600 text-white hover:bg-red-700"
            onClick={() => setShowConfirm(true)}
            disabled={busy}
          >
            Delete All Data
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-500)]">
                  Confirm deletion
                </p>
                <h3 className="text-lg font-semibold text-red-800">Delete All Business Data?</h3>
              </div>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setConfirmText("");
                  setError(null);
                }}
                className="text-[var(--ic-gray-500)] hover:text-[var(--ic-gray-700)]"
                disabled={busy}
              >
                ✕
              </button>
            </div>
            <p className="mt-3 text-sm text-[var(--ic-gray-700)]">
              This will permanently delete:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--ic-gray-700)]">
              <li>All customers</li>
              <li>All policies</li>
              <li>All payments</li>
              <li>All receipts</li>
            </ul>
            <p className="mt-3 text-sm font-semibold text-red-700">
              User accounts, permissions, and system settings will NOT be deleted.
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold text-red-700">
                Type <code className="bg-red-100 px-2 py-1 rounded">DELETE ALL DATA</code> to
                confirm:
              </p>
              <input
                className="w-full rounded-md border border-red-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
                value={confirmText}
                onChange={(e) => {
                  setConfirmText(e.target.value);
                  setError(null);
                }}
                placeholder="DELETE ALL DATA"
                disabled={busy}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="btn"
                onClick={() => {
                  setShowConfirm(false);
                  setConfirmText("");
                  setError(null);
                }}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="btn border-red-300 bg-red-600 text-white hover:bg-red-700"
                onClick={handleDelete}
                disabled={busy || confirmText.trim().toUpperCase() !== "DELETE ALL DATA"}
              >
                {busy ? "Deleting…" : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


