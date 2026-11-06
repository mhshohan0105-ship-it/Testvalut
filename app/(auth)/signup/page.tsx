import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/features/auth/signup-form";
import { getCurrentUser } from "@/lib/auth/session";
import { DEMO_MODE } from "@/lib/demo";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  if (DEMO_MODE) redirect("/login");
  if (await getCurrentUser()) redirect("/dashboard");
  return <SignupForm />;
}
