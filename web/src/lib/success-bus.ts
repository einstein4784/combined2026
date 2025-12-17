"use client";

export type SuccessToastPayload = {
  title: string;
  message: string;
  autoCloseMs?: number;
};

const EVENT_NAME = "global-success";

export function emitSuccessToast(payload: SuccessToastPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<SuccessToastPayload>(EVENT_NAME, { detail: payload }));
}

export function subscribeSuccessToast(handler: (payload: SuccessToastPayload) => void) {
  if (typeof window === "undefined") return () => {};
  const wrapped = (ev: Event) => {
    const detail = (ev as CustomEvent<SuccessToastPayload>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(EVENT_NAME, wrapped);
  return () => window.removeEventListener(EVENT_NAME, wrapped);
}



