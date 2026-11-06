import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/features/auth/login-form";
import { getCurrentUser } from "@/lib/auth/session";
import { safeCallbackUrl } from "@/lib/utils";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  // Checked against the database, so a deactivated user with an old cookie still sees the form.
  if (await getCurrentUser()) redirect(safeCallbackUrl(callbackUrl));
  return <LoginForm callbackUrl={callbackUrl} />;
}
