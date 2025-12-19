"use client";

import { useEffect, useState } from "react";

type Recipient = { _id: string; email: string; name?: string };

const DEFAULT_RECIPIENTS = [
  { email: "ilouis@combinedinsuranceslu.com", name: "Ian Louis" },
  { email: "clouis@combinedinsuranceslu.com", name: "Crystal Louis" },
];

export function StatementRecipientManager() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/statement-recipients");
      if (!res.ok) throw new Error("Failed to load recipients");
      const data = await res.json();
      setRecipients(data.recipients || []);
    } catch (e: any) {
      setError(e.message || "Failed to load recipients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onAdd = async () => {
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!confirm(
      `⚠️ WARNING: You are about to add "${email.trim()}" as a statement recipient.\n\n` +
      `This will add this email to receive cash statement reports.\n\n` +
      `Are you sure you want to continue?`
    )) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/statement-recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      setEmail("");
      setName("");
      fetchData();
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    const recipient = recipients.find(r => r._id === id);
    const emailToDelete = recipient?.email || "this recipient";
    
    if (!confirm(
      `⚠️ WARNING: You are about to remove "${emailToDelete}" from statement recipients.\n\n` +
      `This action cannot be undone. Are you sure you want to continue?`
    )) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/statement-recipients?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      fetchData();
    } catch (e: any) {
      setError(e.message || "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  const combined = [
    ...DEFAULT_RECIPIENTS.map((r) => ({ ...r, _id: `default-${r.email}` })),
    ...recipients,
  ];

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)]">Cash statement</p>
          <h3 className="text-lg font-semibold text-[var(--ic-navy)]">Email recipients</h3>
          <p className="text-sm text-[var(--ic-gray-700)]">Add additional recipients for cash statements.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1.5fr_1fr_auto]">
        <div>
          <label className="text-sm font-medium text-[var(--ic-gray-700)]">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="mt-1 w-full"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-[var(--ic-gray-700)]">Name (optional)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="mt-1 w-full"
          />
        </div>
        <div className="flex items-end">
          <button className="btn btn-primary w-full md:w-auto" onClick={onAdd} disabled={saving}>
            {saving ? "Saving…" : "Add"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={3} className="py-3 text-center text-sm text-[var(--ic-gray-600)]">
                  Loading...
                </td>
              </tr>
            )}
            {!loading &&
              combined.map((r) => (
                <tr key={r._id}>
                  <td>{r.email}</td>
                  <td>{r.name || "—"}</td>
                  <td className="text-right">
                    {r._id.startsWith("default-") ? (
                      <span className="text-xs text-[var(--ic-gray-500)]">Default</span>
                    ) : (
                      <button
                        className="text-sm text-red-600 hover:underline disabled:opacity-50"
                        onClick={() => onDelete(r._id)}
                        disabled={saving}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            {!loading && combined.length === 0 && (
              <tr>
                <td colSpan={3} className="py-3 text-center text-sm text-[var(--ic-gray-600)]">
                  No recipients yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


