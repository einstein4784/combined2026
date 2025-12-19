"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { InfoTooltip } from "../InfoTooltip";
import { showSuccessToast } from "../GlobalSuccessToast";

export function CustomerForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    address: "",
    contactNumber: "",
    contactNumber2: "",
    email: "",
    sex: "Male",
    idNumber: "",
    driversLicenseNumber: "",
  });

  // Generate customer ID on component mount
  useEffect(() => {
    const generateId = async () => {
      setGeneratingId(true);
      try {
        const res = await fetch("/api/customers/generate-id");
        if (res.ok) {
          const data = await res.json();
          setForm((prev) => {
            // Only set if field is still empty
            if (!prev.idNumber) {
              return { ...prev, idNumber: data.customerId };
            }
            return prev;
          });
        } else {
          // If generation fails, use a fallback
          const now = new Date();
          const fallbackId = `CUST-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
          setForm((prev) => {
            if (!prev.idNumber) {
              return { ...prev, idNumber: fallbackId };
            }
            return prev;
          });
        }
      } catch (err) {
        // If generation fails, use a fallback
        const now = new Date();
        const fallbackId = `CUST-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
        setForm((prev) => {
          if (!prev.idNumber) {
            return { ...prev, idNumber: fallbackId };
          }
          return prev;
        });
      } finally {
        setGeneratingId(false);
      }
    };
    generateId();
  }, []); // Only run on mount

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleRegenerateId = async () => {
    setGeneratingId(true);
    try {
      const res = await fetch("/api/customers/generate-id");
      if (res.ok) {
        const data = await res.json();
        setForm((prev) => ({ ...prev, idNumber: data.customerId }));
      } else {
        // If generation fails, use a fallback
        const fallbackId = `CUST-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
        setForm((prev) => ({ ...prev, idNumber: fallbackId }));
      }
    } catch (err) {
      // If generation fails, use a fallback
      const fallbackId = `CUST-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
      setForm((prev) => ({ ...prev, idNumber: fallbackId }));
    } finally {
      setGeneratingId(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const payload = {
      ...form,
      email: form.email?.trim() || "na@none.com",
      driversLicenseNumber: form.driversLicenseNumber?.trim() || null,
    };
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      router.refresh();
            // Reset form and regenerate customer ID
      const resetAndGenerateId = async () => {
        try {
          const res = await fetch("/api/customers/generate-id");
          if (res.ok) {
            const data = await res.json();
            setForm({
              firstName: "",
              middleName: "",
              lastName: "",
              address: "",
              contactNumber: "",
              contactNumber2: "",
              email: "",
              sex: "Male",
              idNumber: data.customerId,
              driversLicenseNumber: "",
            });
          } else {
            // Fallback ID generation
            const now = new Date();
            const fallbackId = `CUST-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
            setForm({
              firstName: "",
              middleName: "",
              lastName: "",
              address: "",
              contactNumber: "",
              contactNumber2: "",
              email: "",
              sex: "Male",
              idNumber: fallbackId,
              driversLicenseNumber: "",
            });
          }
        } catch {
          const now = new Date();
          const fallbackId = `CUST-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
          setForm({
            firstName: "",
            middleName: "",
            lastName: "",
            address: "",
            contactNumber: "",
            contactNumber2: "",
            email: "",
            sex: "Male",
            idNumber: fallbackId,
            driversLicenseNumber: "",
          });
        }
      };
      await resetAndGenerateId();
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
    <form onSubmit={onSubmit} className="space-y-4">
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
        <div>
          <label className="inline-flex items-center gap-2">
            Secondary Contact
            <InfoTooltip content="Optional secondary phone number." />
          </label>
          <input
            className="mt-1"
            value={form.contactNumber2}
            onChange={(e) => update("contactNumber2", e.target.value)}
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
            Customer ID
            <InfoTooltip content="Unique customer identifier. Generated automatically but can be customized." />
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              className="flex-1"
              value={form.idNumber}
              onChange={(e) => update("idNumber", e.target.value)}
              required
              disabled={generatingId}
              placeholder={generatingId ? "Generating..." : ""}
            />
            <button
              type="button"
              onClick={handleRegenerateId}
              disabled={generatingId}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--ic-gray-200)] bg-white text-[var(--ic-navy)] shadow-sm hover:bg-[var(--ic-gray-50)] disabled:opacity-50 disabled:cursor-not-allowed"
              title="Generate new Customer ID"
              aria-label="Generate new Customer ID"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>
        <div>
          <label className="inline-flex items-center gap-2">
            Drivers License Number
            <InfoTooltip content="Optional drivers license number provided by the customer." />
          </label>
          <input
            className="mt-1"
            value={form.driversLicenseNumber}
            onChange={(e) => update("driversLicenseNumber", e.target.value)}
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

