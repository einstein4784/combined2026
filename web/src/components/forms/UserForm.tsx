"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchableSelect } from "./SearchableSelect";

export function UserForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "Admin",
    fullName: "",
  });

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      router.refresh();
      setForm({ username: "", email: "", password: "", role: "Admin", fullName: "" });
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to create user");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label>Username</label>
          <input
            className="mt-1"
            value={form.username}
            onChange={(e) => update("username", e.target.value)}
            required
          />
        </div>
        <div>
          <label>Full Name</label>
          <input
            className="mt-1"
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label>Email</label>
          <input
            type="email"
            className="mt-1"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
          />
        </div>
        <div>
          <label>Role</label>
          <SearchableSelect
            selectClassName="mt-1"
            value={form.role}
            onChange={(value) => update("role", value)}
            options={[
              { value: "Admin", label: "Admin" },
              { value: "Supervisor", label: "Supervisor" },
              { value: "Cashier", label: "Cashier" },
              { value: "Underwriter", label: "Underwriter" },
            ]}
          />
        </div>
      </div>
      <div>
        <label>Password</label>
        <input
          type="password"
          className="mt-1"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          required
        />
      </div>
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary w-full disabled:opacity-50"
      >
        {loading ? "Saving…" : "Add User"}
      </button>
    </form>
  );
}

