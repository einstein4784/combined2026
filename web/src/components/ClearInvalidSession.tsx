"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

/**
 * Client component that clears invalid session cookies on mount
 * This prevents JWTSessionError from appearing in console when cookies are invalid
 */
export function ClearInvalidSession() {
  useEffect(() => {
    // Clear any NextAuth-related cookies that might be invalid
    // This runs on the client side to clean up any stale cookies
    const cookies = document.cookie.split(";");
    const authCookies = cookies.filter((cookie) =>
      cookie.trim().startsWith("authjs.session-token") ||
      cookie.trim().startsWith("__Secure-authjs.session-token") ||
      cookie.trim().startsWith("next-auth.session-token") ||
      cookie.trim().startsWith("__Secure-next-auth.session-token")
    );

    // If we find auth cookies but we're on the login page, they're likely invalid
    // Clear them silently
    if (authCookies.length > 0) {
      authCookies.forEach((cookie) => {
        const cookieName = cookie.split("=")[0].trim();
        // Clear cookie by setting it to expire in the past
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=lax;`;
      });
    }
  }, []);

  return null;
}

