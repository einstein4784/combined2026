"use client";

import { useEffect, useState } from "react";
import { showGlobalError } from "./GlobalErrorPopup";
import { showSuccessToast } from "./GlobalSuccessToast";

type CoverageType = { _id: string; name: string };

export function CoverageTypeManager() {
  const [items, setItems] = useState<CoverageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/coverage-types");
      if (!res.ok) throw new Error("Failed to load coverage types");
      const data = await res.json();
      setItems(data.items || []);
    } catch (err: any) {
      showGlobalError({ title: "Load failed", message: err.message || "Could not load coverage types" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setSaving(true);
      const res = await fetch("/api/coverage-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add coverage type");
      }
      setName("");
      await load();
      showSuccessToast({
        title: "Coverage type added",
        message: `"${name.trim()}" has been added successfully.`,
      });
    } catch (err: any) {
      showGlobalError({ title: "Failed to add", message: err.message || "Could not add coverage type" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string, itemName: string) => {
    if (!confirm(`Are you sure you want to delete "${itemName}"?\n\nThis action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/coverage-types?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete coverage type");
      }
      setItems((prev) => prev.filter((i) => i._id !== id));
      showSuccessToast({
        title: "Coverage type deleted",
        message: `"${itemName}" has been deleted.`,
      });
    } catch (err: any) {
      showGlobalError({ title: "Failed to delete", message: err.message || "Could not delete coverage type" });
    }
  };

  return (
    <div className="card space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)]">Coverage Types</p>
        <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Manage Coverage Types</h2>
        <p className="text-sm text-[var(--ic-gray-600)]">
          Add or remove coverage types. Only coverage types listed here can be used for policies.
        </p>
      </div>

      {/* Add form */}
      <form onSubmit={add} className="flex gap-3">
        <input
          type="text"
          className="flex-1 px-4 py-2 border border-[var(--ic-gray-300)] rounded-lg focus:ring-2 focus:ring-[var(--ic-navy)] focus:border-transparent"
          placeholder="Enter coverage type name (e.g., Fire and Theft)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button 
          type="submit" 
          className="btn-primary px-6 py-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed" 
          disabled={saving || !name.trim()}
        >
          {saving ? "Adding…" : "Add"}
        </button>
      </form>

      {/* List of coverage types */}
      <div className="rounded-lg border border-[var(--ic-gray-200)] bg-white">
        {loading ? (
          <div className="p-6 text-center">
            <p className="text-sm text-[var(--ic-gray-600)]">Loading…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-[var(--ic-gray-600)]">No coverage types yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--ic-gray-200)]">
            {items.map((item) => (
              <li 
                key={item._id} 
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--ic-gray-50)] transition-colors"
              >
                <span className="text-sm font-medium text-[var(--ic-navy)]">{item.name}</span>
                <button
                  className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
                  onClick={() => remove(item._id, item.name)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


