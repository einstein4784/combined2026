import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getSession } from "@/lib/auth";
import { WeatherPanel } from "@/components/WeatherPanel";
import { GlobalErrorPopup } from "@/components/GlobalErrorPopup";
import { BackButton } from "@/components/BackButton";
import { ClearInvalidSession } from "@/components/ClearInvalidSession";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#e8f1fb] to-white">
      <ClearInvalidSession />
      <GlobalErrorPopup />
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 md:px-8 py-10">
        <div className="absolute left-6 top-6 md:left-10 md:top-10">
          <BackButton fallbackHref="/" />
        </div>
        <div className="grid w-full gap-8 md:grid-cols-[1.05fr_0.95fr]">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--ic-gray-200)] bg-white shadow-xl">
            <img
              src="/IC-LOGO-NEW.png"
              alt="Combined Insurance Services"
              className="w-full max-h-40 object-contain border-b border-[var(--ic-gray-200)] bg-white"
            />
            <div className="relative p-8 text-[var(--ic-gray-800)]">
              <WeatherPanel />
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-full rounded-2xl border border-[var(--ic-gray-200)] bg-white shadow-xl">
              <div className="space-y-2 px-8 pt-8 text-center">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-500)]">
                  Secure Access
                </p>
                <h1 className="text-2xl font-semibold text-[var(--ic-navy)]">Admin Login</h1>
                <p className="text-sm text-[var(--ic-gray-600)]">
                  Sign in to continue to the Admin Console.
                </p>
              </div>
              <div className="mt-6 px-8 pb-4">
                <LoginForm />
              </div>
              <div className="border-t border-[var(--ic-gray-200)] px-8 py-4 text-center text-sm text-[var(--ic-gray-700)]">
                <p className="font-semibold text-[var(--ic-navy)]">Support</p>
                <p>Nicholas Dass — Developer</p>
                <p>Einstein Production TT Co Ltd</p>
                <p>1868 460 3788 · 1868 725 5305 (WhatsApp only)</p>
                <p>nicholas@solace-systems.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

