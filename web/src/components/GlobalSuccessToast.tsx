"use client";

import { useEffect, useState } from "react";
import { emitSuccessToast, subscribeSuccessToast, type SuccessToastPayload } from "@/lib/success-bus";

type Toast = SuccessToastPayload & { id: string; expiresAt?: number };

const AUTO_CLOSE_MS = 4000;

export function GlobalSuccessToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeSuccessToast((payload) => {
      const id = crypto.randomUUID();
      const autoCloseMs = payload.autoCloseMs ?? AUTO_CLOSE_MS;
      const expiresAt = autoCloseMs > 0 ? Date.now() + autoCloseMs : undefined;
      setToasts((prev) => [...prev, { ...payload, id, expiresAt }]);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!toasts.length) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setToasts((prev) => prev.filter((t) => !t.expiresAt || t.expiresAt > now));
    }, 400);
    return () => clearInterval(timer);
  }, [toasts.length]);

  const close = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[9998] flex flex-col items-end gap-3 p-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto w-full max-w-sm rounded-lg border border-emerald-200 bg-white shadow-lg ring-1 ring-emerald-200/70"
        >
          <div className="flex items-start justify-between gap-3 border-b border-emerald-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-emerald-800">{toast.title || "Success"}</p>
              <p className="mt-1 text-sm text-[var(--ic-gray-700)]">{toast.message}</p>
            </div>
            <button
              className="text-xs text-[var(--ic-gray-600)] hover:text-emerald-700"
              onClick={() => close(toast.id)}
              aria-label="Close success toast"
            >
              ✕
            </button>
          </div>
          <div className="px-4 py-2 text-xs text-[var(--ic-gray-600)]">
            <button
              className="rounded-md border border-[var(--ic-gray-200)] px-2 py-1 text-[var(--ic-gray-700)] hover:border-emerald-300 hover:text-emerald-700"
              onClick={() => close(toast.id)}
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Convenience helper for components to trigger a success toast.
export const showSuccessToast = emitSuccessToast;



