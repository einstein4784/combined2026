"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchableSelect } from "./SearchableSelect";

export function CustomerForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    address: "",
    contactNumber: "",
    email: "",
    sex: "Male",
    idNumber: "",
  });

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      router.refresh();
      setForm({
        firstName: "",
        middleName: "",
        lastName: "",
        address: "",
        contactNumber: "",
        email: "",
        sex: "Male",
        idNumber: "",
      });
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to create customer");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label>First name</label>
          <input
            className="mt-1"
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            required
          />
        </div>
        <div>
          <label>Middle name</label>
          <input
            className="mt-1"
            value={form.middleName}
            onChange={(e) => update("middleName", e.target.value)}
          />
        </div>
        <div>
          <label>Last name</label>
          <input
            className="mt-1"
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            required
          />
        </div>
        <div>
          <label>Contact</label>
          <input
            className="mt-1"
            value={form.contactNumber}
            onChange={(e) => update("contactNumber", e.target.value)}
            required
          />
        </div>
      </div>
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
        <label>Address</label>
        <input
          className="mt-1"
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label>Sex</label>
          <SearchableSelect
            selectClassName="mt-1"
            value={form.sex}
            onChange={(value) => update("sex", value)}
            options={[
              { value: "Male", label: "Male" },
              { value: "Female", label: "Female" },
              { value: "Other", label: "Other" },
            ]}
          />
        </div>
        <div>
          <label>ID Number</label>
          <input
            className="mt-1"
            value={form.idNumber}
            onChange={(e) => update("idNumber", e.target.value)}
            required
          />
        </div>
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
        {loading ? "Saving…" : "Add Customer"}
      </button>
    </form>
  );
}

