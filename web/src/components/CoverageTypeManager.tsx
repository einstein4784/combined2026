"use client";

import { useEffect, useState } from "react";
import { showGlobalError } from "./GlobalErrorPopup";

type CoverageType = { _id: string; name: string };

export function CoverageTypeManager() {
  const [items, setItems] = useState<CoverageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err: any) {
      showGlobalError({ title: "Delete failed", message: err.message || "Could not delete coverage type" });
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(items.map((item) => item._id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (
      !confirm(
        `Are you sure you want to delete ${selectedIds.size} coverage type(s)?\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setDeleting(true);
      let successCount = 0;
      const errors: string[] = [];

      for (const id of Array.from(selectedIds)) {
        try {
          const res = await fetch(`/api/coverage-types?id=${encodeURIComponent(id)}`, { method: "DELETE" });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            errors.push(data.error || "Failed to delete");
          } else {
            successCount++;
          }
        } catch (err: any) {
          errors.push(err.message || "Unknown error");
        }
      }

      if (errors.length > 0) {
        showGlobalError({
          title: "Partial deletion",
          message: `Deleted ${successCount} of ${selectedIds.size} coverage types. ${errors.length} errors occurred.`,
        });
      }

      // Reload to get fresh data
      await load();
      setSelectedIds(new Set());
    } catch (err: any) {
      showGlobalError({ title: "Bulk delete failed", message: err.message || "Could not delete coverage types" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="card space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)]">Coverage Types</p>
        <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Manage coverage options</h2>
        <p className="text-sm text-[var(--ic-gray-600)]">
          Add, edit, or remove coverage types available when creating policies. Only coverage types listed here can be used for policies.
        </p>
      </div>

      <form className="flex flex-col gap-3 md:flex-row" onSubmit={add}>
        <div className="flex-1">
          <label htmlFor="coverage-type-name" className="block text-sm font-medium text-[var(--ic-navy)] mb-2">
            Coverage Type Name
          </label>
          <input
            id="coverage-type-name"
            type="text"
            className="form-input w-full px-4 py-2 border border-[var(--ic-gray-300)] rounded-lg focus:ring-2 focus:ring-[var(--ic-navy)] focus:border-transparent"
            placeholder="e.g., Fire and Theft, Third Party Fire & Theft"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="flex items-end">
          <button 
            type="submit" 
            className="btn-primary px-6 py-2 w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed" 
            disabled={saving || !name.trim()}
          >
            {saving ? "Adding…" : "Add Coverage Type"}
          </button>
        </div>
      </form>

      {/* Bulk selection controls */}
      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-[var(--ic-navy)]">
              Bulk Actions:
            </span>
            <button
              type="button"
              onClick={selectAll}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              Select All
            </button>
            <span className="text-[var(--ic-gray-400)]">•</span>
            <button
              type="button"
              onClick={deselectAll}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              Clear Selection
            </button>
            {selectedIds.size > 0 && (
              <>
                <span className="text-[var(--ic-gray-400)]">•</span>
                <span className="text-sm font-semibold text-[var(--ic-navy)]">
                  {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
                </span>
              </>
            )}
          </div>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={bulkDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {deleting ? "Deleting…" : `Delete Selected (${selectedIds.size})`}
            </button>
          )}
        </div>
      )}

      <div className="rounded-lg border border-[var(--ic-gray-200)] bg-white overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <p className="text-sm text-[var(--ic-gray-600)]">Loading coverage types…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-[var(--ic-gray-600)]">No coverage types yet. Add one using the form above.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--ic-gray-200)]">
            {items.map((item) => (
              <li key={item._id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--ic-gray-50)] transition-colors">
                {/* Checkbox for bulk selection */}
                <input
                  type="checkbox"
                  checked={selectedIds.has(item._id)}
                  onChange={() => toggleSelection(item._id)}
                  className="w-4 h-4 cursor-pointer rounded border-[var(--ic-gray-300)] text-[var(--ic-navy)] focus:ring-[var(--ic-navy)]"
                  disabled={editingId === item._id}
                  title="Select for bulk deletion"
                />
                
                <div className="flex items-center justify-between gap-3 flex-1">
                  {editingId === item._id ? (
                    <>
                      <input
                        className="flex-1 px-3 py-1.5 text-sm border border-[var(--ic-gray-300)] rounded focus:ring-2 focus:ring-[var(--ic-navy)] focus:border-transparent"
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
                          className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => saveEdit(item._id)}
                          disabled={saving || !editingName.trim()}
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                          className="px-3 py-1.5 text-sm font-medium text-[var(--ic-gray-700)] bg-[var(--ic-gray-200)] hover:bg-[var(--ic-gray-300)] rounded disabled:opacity-50"
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
                          className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          onClick={() => startEdit(item)}
                        >
                          Edit
                        </button>
                        <button
                          className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
                          onClick={() => remove(item._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


