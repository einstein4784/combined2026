"use client";

import { useEffect, useMemo, useState } from "react";
import { SYSTEM_FUNCTIONS, UserRole, SystemFunctionId, DEFAULT_PERMISSIONS } from "@/lib/permissions";

type RoleOption = UserRole;

export function RolePermissionManager() {
  const [role, setRole] = useState<RoleOption>("Admin");
  const [selected, setSelected] = useState<SystemFunctionId[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const functions = useMemo(() => Object.values(SYSTEM_FUNCTIONS), []);

  const load = async (targetRole: RoleOption) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await fetch(`/api/role-permissions?role=${targetRole}`);
    if (res.ok) {
      const data = await res.json();
      setSelected(data.permissions || DEFAULT_PERMISSIONS[targetRole] || []);
    } else {
      setError("Failed to load permissions");
      setSelected(DEFAULT_PERMISSIONS[targetRole] || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load(role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id: SystemFunctionId) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const save = async () => {
    if (!confirm(
      `⚠️ WARNING: You are about to update permissions for the "${role}" role.\n\n` +
      `This will change what users with this role can access in the system.\n\n` +
      `This action cannot be undone. Are you sure you want to continue?`
    )) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    const res = await fetch(`/api/role-permissions?role=${role}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: selected }),
    });
    if (res.ok) {
      setSuccess("Permissions updated");
    } else {
      setError("Failed to save permissions");
    }
    setSaving(false);
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="section-heading">Permissions</p>
          <h3 className="text-lg font-semibold text-[var(--ic-navy)]">Role access</h3>
        </div>
        <select
          className="mt-1 w-40"
          value={role}
          onChange={(e) => {
            const nextRole = e.target.value as RoleOption;
            setRole(nextRole);
            load(nextRole);
          }}
          disabled={loading || saving}
        >
          <option value="Admin">Admin</option>
          <option value="Supervisor">Supervisor</option>
          <option value="Cashier">Cashier</option>
          <option value="Underwriter">Underwriter</option>
        </select>
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

      <div className="grid gap-3 md:grid-cols-2">
        {functions.map((fn) => (
          <label
            key={fn.id}
            className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 transition ${
              selected.includes(fn.id)
                ? "border-[var(--ic-navy)] bg-[var(--ic-navy)]/5"
                : "border-[var(--ic-gray-200)] hover:border-[var(--ic-gray-300)]"
            }`}
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={selected.includes(fn.id)}
              onChange={() => toggle(fn.id)}
              disabled={loading || saving}
            />
            <div>
              <div className="font-semibold text-[var(--ic-navy)]">{fn.name}</div>
              <div className="text-sm text-[var(--ic-gray-600)]">{fn.description}</div>
              <div className="text-xs uppercase tracking-wide text-[var(--ic-gray-500)]">
                {fn.category}
              </div>
            </div>
          </label>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          className="btn btn-primary"
          onClick={save}
          disabled={loading || saving}
        >
          {saving ? "Saving…" : "Save permissions"}
        </button>
      </div>
    </div>
  );
}


