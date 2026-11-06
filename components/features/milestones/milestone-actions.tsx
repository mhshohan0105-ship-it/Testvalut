"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CircleCheck, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteMilestone, setMilestoneCompleted } from "@/server/actions/milestones";

export function MilestoneActions({ id, name, completed }: { id: string; name: string; completed: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await setMilestoneCompleted(id, !completed);
      if (result.ok) toast.success(completed ? "Milestone reopened" : "Milestone completed");
      else toast.error(result.error);
    });
  }

  async function remove() {
    const result = await deleteMilestone(id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Milestone deleted");
    router.push("/milestones");
  }

  return (
    <>
      <Button variant="outline" onClick={() => setConfirming(true)}>
        <Trash2 /> Delete
      </Button>
      <Button variant="outline" onClick={toggle} disabled={pending}>
        {completed ? <RotateCcw /> : <CircleCheck />} {completed ? "Reopen" : "Mark complete"}
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete ${name}?`}
        description="The milestone is permanently deleted. Its runs and their results stay, without a milestone."
        confirmLabel="Delete milestone"
        destructive
        onConfirm={remove}
      />
    </>
  );
}
