"use client";

import { useEffect, useState } from "react";
import { emitGlobalError, subscribeGlobalError, type GlobalErrorPayload } from "@/lib/error-bus";

type Toast = GlobalErrorPayload & { id: string; expiresAt?: number };

const AUTO_CLOSE_MS = 5000;

export function GlobalErrorPopup() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeGlobalError((payload) => {
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
    }, 500);
    return () => clearInterval(timer);
  }, [toasts.length]);

  const close = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] flex flex-col items-end gap-3 p-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto w-full max-w-sm rounded-lg border border-red-200 bg-white shadow-lg ring-1 ring-red-200/70"
        >
          <div className="flex items-start justify-between gap-3 border-b border-red-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-red-700">{toast.title || "Error"}</p>
              <p className="mt-1 text-sm text-[var(--ic-gray-700)]">{toast.message}</p>
            </div>
            <button
              className="text-xs text-[var(--ic-gray-600)] hover:text-red-700"
              onClick={() => close(toast.id)}
              aria-label="Close error"
            >
              ✕
            </button>
          </div>
          <div className="px-4 py-2 text-xs text-[var(--ic-gray-600)]">
            <button
              className="rounded-md border border-[var(--ic-gray-200)] px-2 py-1 text-[var(--ic-gray-700)] hover:border-red-300 hover:text-red-700"
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

// Convenience helper for components to trigger a global error.
export const showGlobalError = emitGlobalError;


