"use client";

import { useRouter } from "next/navigation";

type Props = {
  label?: string;
  fallbackHref?: string;
  className?: string;
};

export function BackButton({ label = "Back", fallbackHref = "/dashboard", className = "" }: Props) {
  const router = useRouter();

  const handleClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 rounded-md border border-[var(--ic-gray-200)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ic-navy)] shadow-sm hover:bg-[var(--ic-gray-50)] focus:outline-none focus:ring-2 focus:ring-[var(--ic-teal)] focus:ring-offset-2 disabled:opacity-60 ${className}`}
    >
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </button>
  );
}


