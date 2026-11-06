"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError, NativeSelect } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Role } from "@/generated/prisma/enums";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { addUserSchema, type AddUserInput } from "@/lib/validations/team";
import { addUser } from "@/server/actions/team";

const ROLES: Role[] = ["ADMIN", "LEAD", "TESTER", "VIEWER"];

export function AddUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);
  const [saving, startSaving] = useTransition();
  const form = useForm<AddUserInput>({ resolver: zodResolver(addUserSchema), defaultValues: { name: "", email: "", role: "TESTER" } });
  const { errors } = form.formState;

  const submit = form.handleSubmit((values) => {
    startSaving(async () => {
      const result = await addUser(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("User added");
      onOpenChange(false);
      setIssued({ email: values.email, password: result.data.temporaryPassword });
      form.reset();
    });
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <form onSubmit={submit} noValidate className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Add a user</DialogTitle>
              <DialogDescription>You&apos;ll get a temporary password to pass on. They can change it in Settings.</DialogDescription>
            </DialogHeader>
            <div>
              <Label htmlFor="user-name" className="mb-1.5">Name</Label>
              <Input id="user-name" aria-invalid={Boolean(errors.name)} {...form.register("name")} />
              <FieldError message={errors.name?.message} />
            </div>
            <div>
              <Label htmlFor="user-email" className="mb-1.5">Email</Label>
              <Input id="user-email" type="email" aria-invalid={Boolean(errors.email)} {...form.register("email")} />
              <FieldError message={errors.email?.message} />
            </div>
            <div>
              <Label htmlFor="user-role" className="mb-1.5">Role</Label>
              <NativeSelect id="user-role" {...form.register("role")}>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Adding…" : "Add user"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={issued !== null} onOpenChange={(value) => !value && setIssued(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary password</DialogTitle>
            <DialogDescription>Give this to {issued?.email}. It won&apos;t be shown again.</DialogDescription>
          </DialogHeader>
          <code data-testid="temporary-password" className="rounded-lg bg-muted px-3 py-2 font-mono text-sm break-all">{issued?.password}</code>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (issued) void navigator.clipboard.writeText(issued.password).then(() => toast.success("Password copied"));
              }}
            >
              <Copy /> Copy
            </Button>
            <Button onClick={() => setIssued(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
