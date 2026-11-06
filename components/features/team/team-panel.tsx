"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError, NativeSelect } from "@/components/ui/form-controls";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Role } from "@/generated/prisma/enums";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { cn, initials } from "@/lib/utils";
import { addUserSchema, type AddUserInput } from "@/lib/validations/team";
import { addUser, setUserActive, setUserRole } from "@/server/actions/team";

const ROLES: Role[] = ["ADMIN", "LEAD", "TESTER", "VIEWER"];

type Member = { id: string; name: string; email: string; role: Role; deactivated: boolean };
type Change = { id: string } & Partial<Pick<Member, "role" | "deactivated">>;

export function TeamPanel({ users, currentUserId, canManage }: { users: Member[]; currentUserId: string; canManage: boolean }) {
  const [optimistic, apply] = useOptimistic(users, (current, change: Change) => current.map((user) => (user.id === change.id ? { ...user, ...change } : user)));
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);
  const [saving, startSaving] = useTransition();
  const form = useForm<AddUserInput>({ resolver: zodResolver(addUserSchema), defaultValues: { name: "", email: "", role: "TESTER" } });
  const { errors } = form.formState;

  function changeRole(id: string, role: Role) {
    startTransition(async () => {
      apply({ id, role });
      const result = await setUserRole(id, role);
      if (result.ok) toast.success("Role updated");
      else toast.error(result.error);
    });
  }

  function changeActive(user: Member) {
    startTransition(async () => {
      apply({ id: user.id, deactivated: !user.deactivated });
      const result = await setUserActive(user.id, user.deactivated);
      if (result.ok) toast.success(user.deactivated ? `${user.name} reactivated` : `${user.name} deactivated`);
      else toast.error(result.error);
    });
  }

  const submit = form.handleSubmit((values) => {
    startSaving(async () => {
      const result = await addUser(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("User added");
      setAdding(false);
      setIssued({ email: values.email, password: result.data.temporaryPassword });
      form.reset();
    });
  });

  return (
    <>
      {canManage && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setAdding(true)}>
            <UserPlus /> Add user
          </Button>
        </div>
      )}
      <GlassCard className="divide-y divide-border">
        {optimistic.map((user) => (
          <div key={user.id} className={cn("flex flex-wrap items-center gap-3 px-4 py-3", user.deactivated && "opacity-60")}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold">{initials(user.name)}</span>
            <div className="min-w-40 flex-1">
              <p className="truncate text-sm font-medium">
                {user.name}
                {user.id === currentUserId && <span className="ml-1.5 text-xs font-normal text-muted-foreground">You</span>}
                {user.deactivated && <span className="ml-1.5 text-xs font-normal text-status-failed">Deactivated</span>}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            {canManage ? (
              <>
                <NativeSelect aria-label={`Role for ${user.name}`} className="h-9 w-28" value={user.role} onChange={(event) => changeRole(user.id, event.target.value as Role)}>
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </NativeSelect>
                <Button variant="outline" size="sm" disabled={user.id === currentUserId} onClick={() => changeActive(user)}>
                  {user.deactivated ? "Reactivate" : "Deactivate"}
                </Button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
            )}
          </div>
        ))}
      </GlassCard>

      <Dialog open={adding} onOpenChange={setAdding}>
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
              <Button type="button" variant="outline" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Adding…" : "Add user"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={issued !== null} onOpenChange={(open) => !open && setIssued(null)}>
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
