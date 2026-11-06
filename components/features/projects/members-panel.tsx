"use client";

import { useOptimistic, useState, useTransition } from "react";
import { UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/form-controls";
import { GlassCard } from "@/components/ui/glass-card";
import type { Role } from "@/generated/prisma/enums";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { MEMBER_ROLES } from "@/lib/constants/testing";
import { initials } from "@/lib/utils";
import { removeProjectMember, upsertProjectMember } from "@/server/actions/projects";

type Person = { id: string; name: string; email: string };
type Member = { role: Role; user: Person };
type Change = { type: "role"; userId: string; role: Role } | { type: "remove"; userId: string };

export function MembersPanel({
  projectId,
  members,
  candidates,
  canManage,
}: {
  projectId: string;
  members: Member[];
  candidates: Person[];
  canManage: boolean;
}) {
  const [optimistic, apply] = useOptimistic(members, (current, change: Change) =>
    change.type === "remove"
      ? current.filter((member) => member.user.id !== change.userId)
      : current.map((member) => (member.user.id === change.userId ? { ...member, role: change.role } : member)),
  );
  const [, startTransition] = useTransition();
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<Role>("TESTER");
  const [adding, startAdding] = useTransition();

  function setRole(userId: string, role: Role) {
    startTransition(async () => {
      apply({ type: "role", userId, role });
      const result = await upsertProjectMember({ projectId, userId, role });
      if (result.ok) toast.success("Role updated");
      else toast.error(result.error);
    });
  }

  function remove(userId: string) {
    startTransition(async () => {
      apply({ type: "remove", userId });
      const result = await removeProjectMember(projectId, userId);
      if (result.ok) toast.success("Member removed");
      else toast.error(result.error);
    });
  }

  function add() {
    if (!newUserId) return;
    startAdding(async () => {
      const result = await upsertProjectMember({ projectId, userId: newUserId, role: newRole });
      if (result.ok) {
        toast.success("Member added");
        setNewUserId("");
      } else {
        toast.error(result.error);
      }
    });
  }

  const roleOptions = (current: Role) => (MEMBER_ROLES.includes(current) ? MEMBER_ROLES : [current, ...MEMBER_ROLES]);

  return (
    <GlassCard className="p-5">
      <h2 className="font-semibold tracking-tight">Members</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">A member&apos;s project role decides what they can do here. Workspace admins can do everything.</p>
      <ul className="mt-4 divide-y divide-border">
        {optimistic.map(({ role, user }) => (
          <li key={user.id} className="flex items-center gap-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold">{initials(user.name)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            {canManage ? (
              <>
                <NativeSelect
                  aria-label={`Role for ${user.name}`}
                  className="h-8 w-28 text-xs"
                  value={role}
                  onChange={(event) => setRole(user.id, event.target.value as Role)}
                >
                  {roleOptions(role).map((option) => (
                    <option key={option} value={option}>
                      {ROLE_LABELS[option]}
                    </option>
                  ))}
                </NativeSelect>
                <Button variant="ghost" size="icon-sm" onClick={() => remove(user.id)} aria-label={`Remove ${user.name}`}>
                  <X />
                </Button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</span>
            )}
          </li>
        ))}
        {optimistic.length === 0 && <li className="py-3 text-sm text-muted-foreground">No members yet.</li>}
      </ul>
      {canManage && candidates.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <NativeSelect aria-label="Person to add" className="h-9 min-w-40 flex-1" value={newUserId} onChange={(event) => setNewUserId(event.target.value)}>
            <option value="">Choose a person…</option>
            {candidates.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name} ({person.email})
              </option>
            ))}
          </NativeSelect>
          <NativeSelect aria-label="Role for new member" className="h-9 w-28" value={newRole} onChange={(event) => setNewRole(event.target.value as Role)}>
            {MEMBER_ROLES.map((option) => (
              <option key={option} value={option}>
                {ROLE_LABELS[option]}
              </option>
            ))}
          </NativeSelect>
          <Button onClick={add} disabled={!newUserId || adding}>
            <UserPlus /> Add
          </Button>
        </div>
      )}
    </GlassCard>
  );
}
