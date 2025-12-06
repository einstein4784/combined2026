import { NextResponse } from "next/server";

export function json<T>(data: T, init?: number | ResponseInit) {
  const responseInit = typeof init === "number" ? { status: init } : init;
  return NextResponse.json(data, responseInit);
}

export function handleRouteError(error: unknown) {
  console.error(error);
  return json({ error: "Internal server error" }, { status: 500 });
}

export function assertEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name} is missing. Please set it in your environment.`);
  }
  return value;
}


