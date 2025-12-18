import { NextResponse } from "next/server";

export function json<T>(data: T, init?: number | ResponseInit) {
  const responseInit = typeof init === "number" ? { status: init } : init;
  return NextResponse.json(data, responseInit);
}

export function handleRouteError(error: unknown) {
  console.error("[Route Error]", error);
  
  // In production, include error details for debugging
  const errorMessage = error instanceof Error ? error.message : "Internal server error";
  const errorDetails = error instanceof Error ? error.stack : undefined;
  
  // Log full error details
  if (errorDetails) {
    console.error("[Error Stack]", errorDetails);
  }
  
  return json(
    { 
      error: "Internal server error",
      message: errorMessage,
      ...(process.env.NODE_ENV !== "production" && { stack: errorDetails })
    }, 
    { status: 500 }
  );
}

export function assertEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name} is missing. Please set it in your environment.`);
  }
  return value;
}


