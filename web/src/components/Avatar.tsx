"use client";

import { useMemo } from "react";

type Props = {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstTwo = parts.slice(0, 2).map((p) => p[0]?.toUpperCase?.() || "");
  const candidate = firstTwo.join("");
  return candidate || "U";
}

function pickColor(name: string) {
  const palette = [
    "#0ea5e9",
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#f97316",
    "#10b981",
    "#14b8a6",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % palette.length;
  return palette[idx];
}

export function Avatar({ name, src, size = 40, className = "" }: Props) {
  const bg = useMemo(() => pickColor(name || "User"), [name]);
  const style = { width: size, height: size };
  const text = initials(name || "User");

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-white shadow-sm ${className}`}
      style={{ ...style, background: bg }}
      aria-label={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // hide broken image, show fallback initials
            (e.currentTarget as HTMLImageElement).style.display = "none";
            (e.currentTarget.parentElement as HTMLElement).dataset.fallback = "true";
          }}
        />
      ) : null}
      <span className="pointer-events-none select-none leading-none" data-fallback>
        {text}
      </span>
    </div>
  );
}



