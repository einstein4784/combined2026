"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { SessionUser } from "@/lib/auth";
import { signOut } from "next-auth/react";
import { DateTimeBadge } from "./DateTimeBadge";

type Props = {
  session: SessionUser;
  children: React.ReactNode;
};

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/admin", label: "Admin" },
  { href: "/customers", label: "Customers" },
  { href: "/policies", label: "Policies" },
  { href: "/payments", label: "Payments" },
  { href: "/receipts", label: "Receipts" },
  { href: "/renewals", label: "Renewals" },
  { href: "/reports", label: "Reports" },
  { href: "/users", label: "Users" },
];

export default function AppShell({ session, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loggingOut, setLoggingOut] = useState(false);

  const onLogout = async () => {
    setLoggingOut(true);
    await signOut({ redirect: false });
    startTransition(() => router.push("/login"));
  };

  return (
    <div className="flex min-h-screen bg-[var(--ic-gray-50)] text-[var(--ic-gray-800)]">
      <aside className="w-64 bg-[var(--ic-navy)] text-white shadow-lg flex flex-col">
        <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
          <img src="/IC-LOGO-NEW.png" alt="Combined Insurance Services" className="h-10 w-auto" />
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--ic-gold)] font-semibold">
              I&C Insurance
            </div>
            <div className="text-lg font-semibold leading-tight">Admin Console</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-white/10 text-white shadow-sm border-l-4 border-[var(--ic-teal)]"
                    : "text-white/80 hover:bg-white/5 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-white/10 text-[11px] text-white/70">
          Combined Insurance · v2.0
        </div>
      </aside>
      <main className="flex-1">
        <header className="flex items-center justify-between border-b border-[var(--ic-gray-200)] bg-white px-6 py-4 shadow-sm">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)]">Signed in as</div>
            <div className="text-lg font-semibold text-[var(--ic-navy)]">{session.fullName}</div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ic-teal-dark)]">
              <span className="rounded-full bg-[var(--ic-teal-subtle)] px-3 py-1">{session.role}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!pathname.startsWith("/reports") && <DateTimeBadge />}
            {isPending && <span className="text-xs text-[var(--ic-gray-600)]">Loading…</span>}
            <button
              onClick={onLogout}
              className="btn btn-ghost border-[var(--ic-gray-200)] bg-[var(--ic-gray-50)] text-[var(--ic-navy)] hover:bg-[var(--ic-gray-100)] disabled:opacity-60"
              disabled={loggingOut}
            >
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

