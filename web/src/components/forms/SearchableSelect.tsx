"use client";

import { useEffect, useMemo, useState } from "react";

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
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query]);

  // Keep input text in sync with selected option label
  useEffect(() => {
    const selected = options.find((o) => o.value === value);
    if (selected && selected.label !== query) {
      setQuery(selected.label);
    }
    if (!value) {
      setQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options]);

  const handleSelect = (val: string) => {
    onChange(val);
    const selected = options.find((o) => o.value === val);
    setQuery(selected?.label || "");
    setOpen(false);
  };

  return (
    <div className="relative rounded-md border border-[var(--ic-gray-200)] bg-white shadow-sm">
      <input
        type="text"
        className="w-full rounded-md border-0 px-3 py-2 text-sm text-[var(--ic-gray-800)] focus:border-0 focus:outline-none focus:ring-0"
        placeholder={placeholderOption || "Type to search…"}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
        disabled={disabled}
        name={name}
        id={id}
      />
      {open && (
        <div
          className={`absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-auto rounded-md border border-[var(--ic-gray-200)] bg-white shadow-lg ${selectClassName || ""}`}
      >
          {placeholderOption && !query && (
            <div className="px-3 py-2 text-sm text-[var(--ic-gray-500)]">{placeholderOption}</div>
        )}
        {filtered.map((opt) => (
            <button
              type="button"
              key={opt.value}
              className={`flex w-full items-start px-3 py-2 text-left text-sm hover:bg-[var(--ic-gray-50)] ${
                opt.value === value ? "bg-[var(--ic-gray-100)] font-semibold" : ""
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(opt.value)}
            >
            {opt.label}
            </button>
        ))}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-[var(--ic-gray-500)]">No matches</div>
          )}
        </div>
      )}
    </div>
  );
}

