"use client";

import { useEffect, useState } from "react";
import { showGlobalError } from "./GlobalErrorPopup";

type CoverageType = { _id: string; name: string };

export function CoverageTypeManager() {
  const [items, setItems] = useState<CoverageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

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
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add coverage type");
      }
      setName("");
      await load();
    } catch (err: any) {
      showGlobalError({ title: "Save failed", message: err.message || "Could not add coverage type" });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: CoverageType) => {
    setEditingId(item._id);
    setEditingName(item.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      setSaving(true);
      const res = await fetch("/api/coverage-types", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: editingName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update coverage type");
      }
      await load();
      setEditingId(null);
      setEditingName("");
    } catch (err: any) {
      showGlobalError({ title: "Update failed", message: err.message || "Could not update coverage type" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coverage type?")) return;
    try {
      const res = await fetch(`/api/coverage-types?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete coverage type");
      }
      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch (err: any) {
      showGlobalError({ title: "Delete failed", message: err.message || "Could not delete coverage type" });
    }
  };

  return (
    <div className="card space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)]">Coverage Types</p>
        <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Manage coverage options</h2>
        <p className="text-sm text-[var(--ic-gray-600)]">
          Add, edit, or remove coverage types available when creating policies. Coverage types from data imports are automatically added here.
        </p>
      </div>

      <form className="flex flex-col gap-3 md:flex-row" onSubmit={add}>
        <input
          className="flex-1"
          placeholder="e.g., Fire and Theft"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn btn-primary md:w-40" disabled={saving}>
          {saving ? "Adding…" : "Add"}
        </button>
      </form>

      <div className="rounded-lg border border-[var(--ic-gray-200)] bg-[var(--ic-gray-50)]">
        {loading ? (
          <p className="p-3 text-sm text-[var(--ic-gray-600)]">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-3 text-sm text-[var(--ic-gray-600)]">No coverage types yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--ic-gray-200)]">
            {items.map((item) => (
              <li key={item._id} className="flex items-center justify-between gap-3 px-3 py-2">
                {editingId === item._id ? (
                  <>
                    <input
                      className="flex-1 text-sm"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(item._id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        className="btn btn-ghost text-sm text-green-600"
                        onClick={() => saveEdit(item._id)}
                        disabled={saving}
                      >
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button
                        className="btn btn-ghost text-sm text-[var(--ic-gray-600)]"
                        onClick={cancelEdit}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-semibold text-[var(--ic-navy)]">{item.name}</span>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-ghost text-sm text-blue-600"
                        onClick={() => startEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-ghost text-sm text-red-600"
                        onClick={() => remove(item._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


