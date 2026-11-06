"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations/team";
import { changeOwnPassword } from "@/server/actions/team";

export function ChangePasswordForm() {
  const [pending, startTransition] = useTransition();
  const form = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: "", newPassword: "" } });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await changeOwnPassword(values);
      if (result.ok) {
        toast.success("Password changed");
        form.reset();
      } else {
        toast.error(result.error);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
      <div>
        <Label htmlFor="current-password" className="mb-1.5">Current password</Label>
        <Input id="current-password" type="password" autoComplete="current-password" aria-invalid={Boolean(errors.currentPassword)} {...form.register("currentPassword")} />
        <FieldError message={errors.currentPassword?.message} />
      </div>
      <div>
        <Label htmlFor="new-password" className="mb-1.5">New password</Label>
        <Input id="new-password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.newPassword)} {...form.register("newPassword")} />
        <FieldError message={errors.newPassword?.message} />
      </div>
      <Button type="submit" disabled={pending} className="sm:mt-5.5">
        {pending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
