"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { InfoTooltip } from "../InfoTooltip";
import { showSuccessToast } from "../GlobalSuccessToast";

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
    const payload = {
      ...form,
      email: form.email?.trim() || "na@none.com",
    };
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
      showSuccessToast({
        title: "Customer created",
        message: "New customer added successfully.",
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
          <label className="inline-flex items-center gap-2">
            First name
            <InfoTooltip content="Customer's given/first name." />
          </label>
          <input
            className="mt-1"
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="inline-flex items-center gap-2">
            Middle name
            <InfoTooltip content="Optional middle name or initial." />
          </label>
          <input
            className="mt-1"
            value={form.middleName}
            onChange={(e) => update("middleName", e.target.value)}
          />
        </div>
        <div>
          <label className="inline-flex items-center gap-2">
            Last name
            <InfoTooltip content="Customer's surname/family name." />
          </label>
          <input
            className="mt-1"
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="inline-flex items-center gap-2">
            Contact
            <InfoTooltip content="Primary phone number to reach the customer." />
          </label>
          <input
            className="mt-1"
            value={form.contactNumber}
            onChange={(e) => update("contactNumber", e.target.value)}
            required
          />
        </div>
      </div>
      <div>
        <label className="inline-flex items-center gap-2">
          Email
          <InfoTooltip content="Customer email for notices and receipts." />
        </label>
        <input
          type="email"
          className="mt-1"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
        />
      </div>
      <div>
        <label className="inline-flex items-center gap-2">
          Address
          <InfoTooltip content="Mailing address on record for the customer." />
        </label>
        <input
          className="mt-1"
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="inline-flex items-center gap-2">
            Sex
            <InfoTooltip content="Used for reporting only; choose the value provided by the customer." />
          </label>
          <select
            className="mt-1 w-full rounded-md border border-[var(--ic-gray-200)] px-3 py-2"
            value={form.sex}
            onChange={(e) => update("sex", e.target.value)}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="inline-flex items-center gap-2">
            ID Number
            <InfoTooltip content="Government ID or other identifier provided by the customer." />
          </label>
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

