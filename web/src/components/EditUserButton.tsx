"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  userId: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  users_location?: string;
};

export function EditUserButton({
  userId,
  username: initialUsername,
  email: initialEmail,
  fullName: initialFullName,
  role: initialRole,
  users_location,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(initialUsername);
  const [email, setEmail] = useState(initialEmail);
  const [fullName, setFullName] = useState(initialFullName);
  const [role, setRole] = useState(initialRole);
  const [location, setLocation] = useState(users_location || "Castries");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        email,
        fullName,
        role,
        users_location: location,
      }),
    });
    if (res.ok) {
      setSuccess("Saved");
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to save user");
    }
    setSaving(false);
  };

  return (
    <>
      <button
        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--ic-gray-200)] bg-white text-[var(--ic-navy)] shadow-sm hover:bg-[var(--ic-gray-50)]"
        onClick={() => setOpen(true)}
        title="Edit user"
        aria-label="Edit user"
      >
        ✏️
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--ic-navy)]">Edit user</h3>
              <button onClick={() => setOpen(false)} className="text-sm text-[var(--ic-gray-600)]">
                ✕
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <div>
                <label>Username</label>
                <input className="mt-1 w-full" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div>
                <label>Full name</label>
                <input className="mt-1 w-full" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <label>Email</label>
                <input
                  type="email"
                  className="mt-1 w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label>Role</label>
                <select
                  className="mt-1 w-full rounded-md border border-[var(--ic-gray-200)] bg-white px-3 py-2 text-sm text-[var(--ic-gray-800)] shadow-sm focus:border-[var(--ic-navy)] focus:outline-none"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="Admin">Admin</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Cashier">Cashier</option>
                  <option value="Underwriter">Underwriter</option>
                </select>
              </div>
              <div>
                <label>Location</label>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--ic-gray-800)]">
                  {["Castries", "Soufriere", "Vieux Fort"].map((loc) => (
                    <label key={loc} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`users_location_${userId}`}
                        value={loc}
                        checked={location === loc}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                      <span>{loc}</span>
                    </label>
                  ))}
                </div>
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
              <button className="btn btn-ghost border-[var(--ic-gray-200)]" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={onSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


