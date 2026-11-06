"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { NativeSelect } from "@/components/ui/form-controls";
import { Label } from "@/components/ui/label";
import type { BugStatus } from "@/generated/prisma/enums";
import { BUG_STATUSES, BUG_STATUS_LABELS } from "@/lib/constants/testing";
import { assignBug, deleteBug, setBugStatus } from "@/server/actions/bugs";

/** Status and assignee apply as soon as they're chosen, and roll back with a toast if the server refuses. */
export function BugTriage({
  bugId,
  status,
  assignedToId,
  people,
}: {
  bugId: string;
  status: BugStatus;
  assignedToId: string | null;
  people: { id: string; name: string }[];
}) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [optimisticAssignee, setOptimisticAssignee] = useOptimistic(assignedToId ?? "");
  const [, startTransition] = useTransition();

  function changeStatus(next: BugStatus) {
    startTransition(async () => {
      setOptimisticStatus(next);
      const result = await setBugStatus(bugId, next);
      if (result.ok) toast.success(`Status set to ${BUG_STATUS_LABELS[next]}`);
      else toast.error(result.error);
    });
  }

  function changeAssignee(next: string) {
    startTransition(async () => {
      setOptimisticAssignee(next);
      const result = await assignBug(bugId, next || null);
      if (result.ok) toast.success(next ? "Bug reassigned" : "Bug unassigned");
      else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="triage-status" className="mb-1.5">Status</Label>
        <NativeSelect id="triage-status" value={optimisticStatus} onChange={(event) => changeStatus(event.target.value as BugStatus)}>
          {BUG_STATUSES.map((option) => (
            <option key={option} value={option}>
              {BUG_STATUS_LABELS[option]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div>
        <Label htmlFor="triage-assignee" className="mb-1.5">Assignee</Label>
        <NativeSelect id="triage-assignee" value={optimisticAssignee} onChange={(event) => changeAssignee(event.target.value)}>
          <option value="">Unassigned</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </NativeSelect>
      </div>
    </div>
  );
}

export function BugActions({ bugId, label, canEdit, canDelete }: { bugId: string; label: string; canEdit: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  async function remove() {
    const result = await deleteBug(bugId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Bug deleted");
    router.push("/bugs");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canDelete && (
        <Button variant="outline" onClick={() => setConfirming(true)}>
          <Trash2 /> Delete
        </Button>
      )}
      {canEdit && (
        <Button asChild>
          <Link href={`/bugs/${bugId}/edit`}>
            <Pencil /> Edit
          </Link>
        </Button>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete ${label}?`}
        description="This permanently deletes the bug, along with its comments and attachments."
        confirmLabel="Delete bug"
        destructive
        onConfirm={remove}
      />
    </div>
  );
}
