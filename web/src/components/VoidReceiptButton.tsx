"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

type Props = {
  receiptId: string;
  receiptNumber?: string;
  status?: "active" | "void";
};

export function VoidReceiptButton({ receiptId, receiptNumber, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const isVoid = status === "void";

  const toggleStatus = async () => {
    setLoading(true);
    setError(null);
    const next = isVoid ? "active" : "void";
    const res = await fetch(`/api/receipts/${receiptId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.status === 401 || res.status === 403) {
      setShowAuth(true);
    } else if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to update receipt status.");
    }
    setLoading(false);
  };

  const tryAdminAuth = async () => {
    setAuthError(null);
    const res = await signIn("credentials", {
      redirect: false,
      username: adminUser,
      password: adminPass,
    });
    if (res?.error) {
      setAuthError(res.error || "Authentication failed");
      return;
    }
    setShowAuth(false);
    setAdminUser("");
    setAdminPass("");
    await toggleStatus();
  };

  return (
    <>
      <button
        className={`flex h-8 w-8 items-center justify-center rounded-full border ${
          isVoid ? "border-[var(--ic-gray-200)] text-[var(--ic-gray-600)]" : "border-red-200 text-red-600"
        } bg-white shadow-sm hover:bg-[var(--ic-gray-50)] disabled:opacity-60`}
        onClick={() => setOpen(true)}
        disabled={loading}
        title={isVoid ? "Restore receipt" : "Void receipt"}
        aria-label={isVoid ? "Restore receipt" : "Void receipt"}
      >
        {isVoid ? "↩️" : "🚫"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-[var(--ic-navy)]">
              {isVoid ? "Restore receipt?" : "Void receipt?"}
            </h3>
            <p className="mt-2 text-sm text-[var(--ic-gray-700)]">
              {receiptNumber ? `Receipt ${receiptNumber}` : "This receipt"} will be marked as{" "}
              {isVoid ? "active" : "void"}.
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
              <button className="btn btn-primary" onClick={toggleStatus} disabled={loading}>
                {loading ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuth && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-[var(--ic-navy)]">Admin authentication required</h3>
            <p className="mt-2 text-sm text-[var(--ic-gray-700)]">
              Enter admin credentials to void/restore this receipt.
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-sm font-medium text-[var(--ic-gray-700)]">Username</label>
                <input
                  className="mt-1 w-full"
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--ic-gray-700)]">Password</label>
                <input
                  type="password"
                  className="mt-1 w-full"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                />
              </div>
              {authError && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {authError}
                </p>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn" onClick={() => setShowAuth(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={tryAdminAuth}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


