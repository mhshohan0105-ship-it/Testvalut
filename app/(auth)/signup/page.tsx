import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/features/auth/signup-form";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <SignupForm />;
}
