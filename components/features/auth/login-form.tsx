"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { DEMO_MODE } from "@/lib/demo";
import { demoLogin, login } from "@/server/actions/auth";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { FormField } from "./form-field";
import { PasswordField } from "./password-field";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await login(values, callbackUrl);
      if (result && !result.ok) setError(result.error);
    });
  });

  function startDemo() {
    setError(null);
    startTransition(async () => {
      const result = await demoLogin();
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="glass space-y-4 rounded-2xl p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{DEMO_MODE ? "See TestVault in action" : "Welcome back"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{DEMO_MODE ? "Explore a sample workspace. No sign-up needed." : "Sign in to your workspace."}</p>
      </div>
      {error && (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {DEMO_MODE && (
        <>
          <Button type="button" size="lg" className="h-12 w-full rounded-xl text-base" disabled={pending} onClick={startDemo}>
            {pending ? "Opening the demo…" : "Try the demo"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">or sign in with an account</p>
        </>
      )}
      <FormField label="Email" type="email" autoComplete="email" autoFocus={!DEMO_MODE} error={formState.errors.email?.message} {...register("email")} />
      <PasswordField label="Password" autoComplete="current-password" error={formState.errors.password?.message} {...register("password")} />
      <Button type="submit" size="lg" variant={DEMO_MODE ? "outline" : "default"} className="h-11 w-full rounded-xl" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      {!DEMO_MODE && (
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      )}
    </form>
  );
}
