"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";

type Props = {
  customer: {
    _id: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    address?: string;
    contactNumber?: string;
    contactNumber2?: string;
    email?: string;
    sex?: string | null;
    idNumber?: string;
  };
};

export function EditCustomerButton({ customer }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: customer.firstName || "",
    middleName: customer.middleName || "",
    lastName: customer.lastName || "",
    address: customer.address || "",
    contactNumber: customer.contactNumber || "",
    contactNumber2: customer.contactNumber2 || "",
    email: customer.email || "",
    sex: customer.sex || "Male",
    idNumber: customer.idNumber || "",
  });

  // Lock body scroll when modal is open to prevent layout shift
  useModalScrollLock(open);

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/customers/${customer._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Update failed.");
    }
    setLoading(false);
  };

  return (
    <>
      <button className="btn btn-ghost text-sm" onClick={() => setOpen(true)}>
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-500)]">Edit</p>
                <h3 className="text-lg font-semibold text-[var(--ic-navy)]">Edit customer</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-[var(--ic-gray-500)] hover:text-[var(--ic-gray-700)]"
              >
                ✕
              </button>
            </div>

            <form className="mt-4 space-y-4" onSubmit={onSubmit}>
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
                <div>
                  <label>Secondary Contact</label>
                  <input
                    className="mt-1"
                    value={form.contactNumber2}
                    onChange={(e) => update("contactNumber2", e.target.value)}
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
                  <select
                    className="mt-1 w-full"
                    value={form.sex}
                    onChange={(e) => update("sex", e.target.value)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
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
              <div className="flex justify-end gap-2">
                <button type="button" className="btn" onClick={() => setOpen(false)} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}


