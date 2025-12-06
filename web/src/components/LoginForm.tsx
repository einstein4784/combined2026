"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      redirect: false,
      username,
      password,
      callbackUrl: "/dashboard",
    });

    if (res?.error) {
      setError(res.error || "Login failed");
    } else {
      router.push(res?.url || "/dashboard");
    }
    setLoading(false);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-[var(--ic-gray-200)] bg-white/95 p-6 shadow-xl backdrop-blur"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--ic-gray-700)]">Username or Email</label>
        <input
          className="mt-1"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--ic-gray-700)]">Password</label>
        <input
          type="password"
          className="mt-1"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary w-full disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-xs text-[var(--ic-gray-600)]">
        Having issues? Contact an administrator to reset your access.
      </p>
    </form>
  );
}

