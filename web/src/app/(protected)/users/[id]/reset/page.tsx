import { notFound, redirect } from "next/navigation";
import { connectDb } from "@/lib/db";
import { User } from "@/models/User";
import { hash } from "bcryptjs";

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ResetUserPasswordPage({ params }: Params) {
  await connectDb();
  const { id } = await params;

  const user = await User.findById(id).lean();
  if (!user) return notFound();

  const newPassword = Math.random().toString(36).slice(-10);
  const hashed = await hash(newPassword, 10);

  await User.findByIdAndUpdate(id, { password: hashed });

  // Ideally, send this via email. For now, redirect back with a query param to show the new password.
  redirect(`/users?reset=${encodeURIComponent(user.username)}&temp=${encodeURIComponent(newPassword)}`);
}


