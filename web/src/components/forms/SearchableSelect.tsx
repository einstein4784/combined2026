"use client";

import { useMemo, useState } from "react";

type Option = {
  value: string;
  label: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholderOption?: string;
  selectClassName?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
};

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholderOption,
  selectClassName,
  required,
  disabled,
  name,
  id,
}: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div className="space-y-2">
      <input
        type="text"
        className="w-full rounded-md border border-[var(--ic-gray-200)] bg-white px-3 py-2 text-sm text-[var(--ic-gray-800)] shadow-sm focus:border-[var(--ic-navy)] focus:outline-none"
        placeholder="Type to search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <select
        id={id}
        name={name}
        className={`w-full rounded-md border border-[var(--ic-gray-200)] bg-white px-3 py-2 text-sm text-[var(--ic-gray-800)] shadow-sm focus:border-[var(--ic-navy)] focus:outline-none ${selectClassName || ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
      >
        {placeholderOption && (
          <option value="" disabled>
            {placeholderOption}
          </option>
        )}
        {filtered.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

