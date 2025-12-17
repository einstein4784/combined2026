"use client";

import { useState } from "react";

type Props = {
  content: string;
};

export function InfoTooltip({ content }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--ic-gray-300)] bg-white text-[10px] font-semibold text-[var(--ic-gray-700)] hover:border-[var(--ic-gray-400)] focus:outline-none"
        tabIndex={-1}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label="Field information"
      >
        i
      </button>
      {open && (
        <div className="absolute left-1/2 top-[120%] z-50 w-64 -translate-x-1/2 rounded-lg border border-[var(--ic-gray-200)] bg-white px-3 py-2 text-xs text-[var(--ic-gray-800)] shadow-lg">
          {content}
        </div>
      )}
    </span>
  );
}


