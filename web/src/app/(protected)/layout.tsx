import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <ErrorBoundary>
      <AppShell session={session}>{children}</AppShell>
    </ErrorBoundary>
  );
}


