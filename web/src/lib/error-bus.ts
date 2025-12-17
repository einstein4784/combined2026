"use client";

export type GlobalErrorPayload = {
  title: string;
  message: string;
  autoCloseMs?: number;
};

const EVENT_NAME = "global-error";

export function emitGlobalError(payload: GlobalErrorPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<GlobalErrorPayload>(EVENT_NAME, { detail: payload }));
}

export function subscribeGlobalError(handler: (payload: GlobalErrorPayload) => void) {
  if (typeof window === "undefined") return () => {};
  const wrapped = (ev: Event) => {
    const detail = (ev as CustomEvent<GlobalErrorPayload>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(EVENT_NAME, wrapped);
  return () => window.removeEventListener(EVENT_NAME, wrapped);
}


