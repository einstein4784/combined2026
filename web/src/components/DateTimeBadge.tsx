"use client";

import { useEffect, useState } from "react";

export function DateTimeBadge() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const formatted = now.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="rounded-full border border-[var(--ic-gray-200)] bg-[var(--ic-gray-50)] px-3 py-1 text-xs font-semibold text-[var(--ic-gray-700)]">
      {formatted}
    </div>
  );
}

