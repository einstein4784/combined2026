"use client";

import { useState } from "react";

type Props = {
  userId: string;
  username: string;
};

export function ResetPasswordButton({ userId, username }: Props) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    setSuccess(null);
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/users/${userId}/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setSuccess("Password updated.");
      setPassword("");
      setConfirm("");
      setOpen(false);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to reset password.");
    }
    setSaving(false);
  };

  return (
    <>
      <button className="text-[var(--ic-navy)] underline" onClick={() => setOpen(true)}>
        Reset password
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--ic-navy)]">
                Reset password for {username}
              </h3>
              <button onClick={() => setOpen(false)} className="text-sm text-[var(--ic-gray-600)]">
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label>New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div>
                <label>Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1"
                />
              </div>
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  {success}
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="btn btn-ghost border-[var(--ic-gray-200)]"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={submit} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

