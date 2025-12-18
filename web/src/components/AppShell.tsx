"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import type { SessionUser } from "@/lib/auth";
import { signIn, signOut } from "next-auth/react";
import { DateTimeBadge } from "./DateTimeBadge";
import { GlobalErrorPopup } from "./GlobalErrorPopup";
import { GlobalSuccessToast } from "./GlobalSuccessToast";
import { Avatar } from "./Avatar";
import { BackButton } from "./BackButton";
import type { FormEvent } from "react";
import { DeleteApprovalTray } from "./DeleteApprovalTray";

// Lazy load ChatWidget - only loads when needed, improves initial page load
const ChatWidget = dynamic(() => import("./ChatWidget").then(mod => ({ default: mod.ChatWidget })), {
  ssr: false,
  loading: () => null, // No loading indicator needed
});

type Props = {
  session: SessionUser;
  children: React.ReactNode;
};

const navLinks = [
  { href: "/dashboard", label: "HOME" },
  { href: "/customers", label: "Customers" },
  { href: "/policies", label: "Policies" },
  { href: "/payments", label: "Payments" },
  { href: "/receipts", label: "Receipts" },
  { href: "/renewals", label: "Renewals" },
  { href: "/reports", label: "Reports" },
  { href: "/users", label: "Users" },
  { href: "/admin", label: "Admin" },
  { href: "/support", label: "Support" },
];

export default function AppShell({ session, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showRestrictedPrompt, setShowRestrictedPrompt] = useState(false);
  const [restrictedPath, setRestrictedPath] = useState<string | null>(null);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [weather, setWeather] = useState<{ temperature: number; weathercode: number } | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [chatAlert, setChatAlert] = useState(false);
  const [chatOpenSignal, setChatOpenSignal] = useState<number | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifThreads, setNotifThreads] = useState<
    { _id: string; title?: string; lastMessageAt?: string; lastMessageText?: string; lastMessageSender?: string }[]
  >([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [chatTargetThreadId, setChatTargetThreadId] = useState<string | null>(null);
  const INACTIVITY_LIMIT_MS = 4 * 60 * 60 * 1000; // 4 hours
  const canApproveDeletes = session.role === "Admin" || session.role === "Supervisor";

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setWeatherError(null);
        const lat = 14.01;
        const lon = -60.99;
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=America%2FSt_Lucia`,
        );
        if (!res.ok) throw new Error("Weather unavailable");
        const data = await res.json();
        setWeather(data.current_weather);
      } catch (e: any) {
        setWeatherError(e?.message || "Weather unavailable");
      }
    };
    fetchWeather();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const audio = typeof Audio !== "undefined" ? new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=") : null;
    const checkChats = async () => {
      try {
        const res = await fetch("/api/chat/threads", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
      if (!Object.keys(userMap).length) {
        try {
          const usersRes = await fetch("/api/users?scope=dropdown");
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            const map: Record<string, string> = {};
            (usersData.users || []).forEach((u: any) => {
              map[u.id] = u.fullName || u.username;
            });
            setUserMap(map);
          }
        } catch {
          // ignore
        }
      }
        const lastSeenStr = typeof window !== "undefined" ? localStorage.getItem("chatLastSeen") : null;
        const lastSeen = lastSeenStr ? new Date(lastSeenStr).getTime() : 0;
        const latest = (data.threads || [])
          .map((t: any) => (t.lastMessageAt ? new Date(t.lastMessageAt).getTime() : 0))
          .reduce((m: number, v: number) => Math.max(m, v), 0);
        if (isMounted) {
          setChatAlert(latest > lastSeen);
          setNotifThreads(
          (data.threads || []).slice(0, 5).map((t: any) => {
            const pUsers = t.participantUsers || [];
            const otherNames = pUsers
              .filter((p: any) => p?.id !== session.id)
              .map((p: any) => p.fullName || p.username)
              .filter(Boolean);
            const senderName =
              pUsers.find((p: any) => p.id === t.lastMessageSenderId)?.fullName ||
              pUsers.find((p: any) => p.id === t.lastMessageSenderId)?.username ||
              "";
            return {
              _id: t._id?.toString?.() || t._id,
              title: t.title || otherNames.join(", ") || "Chat",
              lastMessageAt: t.lastMessageAt || null,
              lastMessageText: t.lastMessageText || "",
              lastMessageSender: senderName,
            };
          }),
          );
        if (latest > lastSeen && soundEnabled) {
          audio?.play?.().catch(() => {});
        }
        }
      } catch {
        // ignore
      }
    };
    checkChats();
    const interval = setInterval(checkChats, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Auto sign-out after inactivity
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        onLogout();
      }, INACTIVITY_LIMIT_MS);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart", "touchmove", "visibilitychange"];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [INACTIVITY_LIMIT_MS]);

  const weatherIcon = (() => {
    const code = weather?.weathercode;
    if (code === undefined) return "⛅";
    if (code === 0) return "☀️";
    if ([1, 2, 3].includes(code)) return "🌤️";
    if ([45, 48].includes(code)) return "🌫️";
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "🌨️";
    if ([95, 96, 99].includes(code)) return "⛈️";
    return "⛅";
  })();

  const onLogout = async () => {
    setLoggingOut(true);
    await signOut({ redirect: false });
    startTransition(() => router.push("/login"));
  };

  const canAccessLink = (path: string) => {
    if (path === "/admin") return session.role === "Admin";
    if (path === "/users") return session.role === "Admin" || session.role === "Supervisor";
    return true;
  };

  const onRestrictedClick = (e: React.MouseEvent, path: string) => {
    if (canAccessLink(path)) return;
    e.preventDefault();
    setRestrictedPath(path);
    setShowRestrictedPrompt(true);
  };

  const onAdminSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    setAdminError(null);
    const res = await signIn("credentials", {
      redirect: false,
      username: adminUsername,
      password: adminPassword,
      callbackUrl: restrictedPath || "/admin",
    });
    setAdminLoading(false);
    if (res?.error) {
      setAdminError(res.error || "Authentication failed");
      return;
    }
    setShowRestrictedPrompt(false);
    setAdminUsername("");
    setAdminPassword("");
    router.push(restrictedPath || "/admin");
  };

  return (
    <div className="flex min-h-screen bg-[var(--ic-gray-50)] text-[var(--ic-gray-800)]">
      <GlobalErrorPopup />
      <GlobalSuccessToast />
      <aside className="w-64 bg-[var(--ic-navy)] text-white shadow-lg flex flex-col">
        <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
          <img src="/IC-LOGO-NEW.png" alt="Combined Insurance Services" className="h-10 w-auto" />
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--ic-gold)] font-semibold">
              Combined Insurance Services Ltd.
            </div>
            <div className="text-lg font-semibold leading-tight">Admin Console</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            const isRestricted = link.href === "/admin" || link.href === "/users";
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={
                  isRestricted && !canAccessLink(link.href) ? (e) => onRestrictedClick(e, link.href) : undefined
                }
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
          <div className="flex items-center gap-3">
            <Avatar name={session.fullName || session.username} />
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)]">Signed in as</div>
              <div className="text-lg font-semibold text-[var(--ic-navy)]">{session.fullName}</div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ic-teal-dark)]">
                <span className="rounded-full bg-[var(--ic-teal-subtle)] px-3 py-1">{session.role}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BackButton />
            {!pathname.startsWith("/reports") && (
              <div className="flex items-center gap-3 rounded-full border border-[var(--ic-gray-200)] bg-gradient-to-r from-[var(--ic-gray-50)] via-white to-[var(--ic-gray-50)] px-3 py-1 shadow-sm">
                <span className="text-lg">{weatherIcon}</span>
                <div className="text-xs font-semibold text-[var(--ic-navy)]">
                  {weather ? `${weather.temperature}°F` : weatherError ? "Weather N/A" : "Loading…"}
                </div>
                <span className="mx-2 h-4 w-px bg-[var(--ic-gray-200)]" />
                <span className="text-sm font-semibold text-[var(--ic-navy)]">Combined Insurance</span>
                <DateTimeBadge />
                <button
                  className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--ic-gray-200)] bg-white text-[var(--ic-navy)] shadow-sm hover:bg-[var(--ic-gray-50)]"
                  title="Notifications"
                  onClick={() => {
                    setNotifOpen((v) => !v);
                    setChatAlert(false);
                    if (typeof window !== "undefined") {
                      localStorage.setItem("chatLastSeen", new Date().toISOString());
                    }
                  }}
                >
                  <span className="relative inline-block">
                    🔔
                    {chatAlert && (
                      <span className="absolute -right-1 -top-1 inline-block h-2.5 w-2.5 rounded-full bg-red-500"></span>
                    )}
                  </span>
                </button>
              </div>
            )}
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
        <div className="p-6">
          {children}
          <ChatWidget
            currentUserId={session.id}
            openSignal={chatOpenSignal || undefined}
            targetThreadId={chatTargetThreadId}
            onOpenChange={(open) => {
              if (open) {
                setChatAlert(false);
                if (typeof window !== "undefined") {
                  localStorage.setItem("chatLastSeen", new Date().toISOString());
                }
              }
            }}
          />
          <DeleteApprovalTray canApprove={canApproveDeletes} />
        </div>
      </main>

      {notifOpen && (
        <div className="fixed right-6 top-16 z-[9500] w-80 rounded-2xl border border-[var(--ic-gray-200)] bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--ic-gray-200)] px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--ic-gray-600)]">Notifications</p>
              <h4 className="text-sm font-semibold text-[var(--ic-navy)]">Messages & System</h4>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-[11px] text-[var(--ic-gray-600)]">
                <input
                  type="checkbox"
                  checked={!soundEnabled}
                  onChange={(e) => setSoundEnabled(!e.target.checked)}
                />
                Mute
              </label>
              <button
                className="text-[var(--ic-gray-500)] hover:text-[var(--ic-gray-700)]"
                onClick={() => setNotifOpen(false)}
              >
                ✕
              </button>
            </div>
          </div>
          <div className="max-h-80 overflow-auto px-4 py-3 space-y-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--ic-gray-600)]">Recent chats</p>
              {!notifThreads.length && (
                <p className="text-xs text-[var(--ic-gray-500)]">No recent chats.</p>
              )}
              {notifThreads.map((t) => (
                <div
                  key={t._id}
                  className="mt-1 flex w-full items-start justify-between rounded-md border border-[var(--ic-gray-200)] px-3 py-2 text-left"
                >
                  <div className="flex-1">
                    <span className="font-semibold text-[var(--ic-navy)] block">
                      {t.title || "Chat"}
                    </span>
                    <span className="text-[11px] text-[var(--ic-gray-600)] block">
                      {t.lastMessageSender ? `${t.lastMessageSender}: ` : ""}
                      {t.lastMessageText || ""}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--ic-gray-500)]">
                    {t.lastMessageAt ? new Date(t.lastMessageAt).toLocaleDateString() : ""}
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <p className="text-xs uppercase tracking-wide text-[var(--ic-gray-600)]">System</p>
              <p className="text-xs text-[var(--ic-gray-500)]">No system notifications.</p>
            </div>
          </div>
          <div className="border-t border-[var(--ic-gray-200)] px-4 py-3 text-xs text-[var(--ic-gray-500)]">
            Notifications only — chat remains closed until opened separately.
          </div>
        </div>
      )}

      {showRestrictedPrompt && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-500)]">Restricted</p>
                <h3 className="text-lg font-semibold text-[var(--ic-navy)]">Admin Access Required</h3>
              </div>
              <button
                onClick={() => setShowRestrictedPrompt(false)}
                className="text-[var(--ic-gray-500)] hover:text-[var(--ic-gray-700)]"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-sm text-[var(--ic-gray-700)]">
              Enter admin credentials to continue to the Admin console.
            </p>
            <form className="mt-4 space-y-3" onSubmit={onAdminSubmit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--ic-gray-700)]">Username</label>
                <input
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--ic-gray-700)]">Password</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
              {adminError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {adminError}
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowRestrictedPrompt(false)}
                  disabled={adminLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={adminLoading}>
                  {adminLoading ? "Checking…" : "Continue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

