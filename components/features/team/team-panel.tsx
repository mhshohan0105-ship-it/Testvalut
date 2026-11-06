"use client";

import { useOptimistic, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/form-controls";
import { GlassCard } from "@/components/ui/glass-card";
import { LazyDialogTrigger } from "@/components/ui/lazy-dialog-trigger";
import type { Role } from "@/generated/prisma/enums";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { cn, initials } from "@/lib/utils";
import { setUserActive, setUserRole } from "@/server/actions/team";

const ROLES: Role[] = ["ADMIN", "LEAD", "TESTER", "VIEWER"];
const loadAddUser = () => import("./add-user-dialog").then((mod) => mod.AddUserDialog);

type Member = { id: string; name: string; email: string; role: Role; deactivated: boolean };
type Change = { id: string } & Partial<Pick<Member, "role" | "deactivated">>;

export function TeamPanel({ users, currentUserId, canManage }: { users: Member[]; currentUserId: string; canManage: boolean }) {
  const [optimistic, apply] = useOptimistic(users, (current, change: Change) => current.map((user) => (user.id === change.id ? { ...user, ...change } : user)));
  const [, startTransition] = useTransition();

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

  return (
    <>
      {canManage && (
        <div className="mb-4 flex justify-end">
          <LazyDialogTrigger
            load={loadAddUser}
            props={{}}
            trigger={
              <Button>
                <UserPlus /> Add user
              </Button>
            }
          />
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
    </>
  );
}
