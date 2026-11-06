"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { bulkDeleteCases, duplicateCase } from "@/server/actions/cases";

export function CaseActions({ caseId, projectId, label }: { caseId: string; projectId: string; label: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [duplicating, startDuplicate] = useTransition();

  function duplicate() {
    startDuplicate(async () => {
      const result = await duplicateCase(caseId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Case duplicated");
      router.push(`/cases/${result.data.id}`);
    });
  }

  async function remove() {
    const result = await bulkDeleteCases({ projectId, caseIds: [caseId] });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Case deleted");
    router.push("/cases");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" onClick={() => setConfirming(true)}>
        <Trash2 /> Delete
      </Button>
      <Button variant="outline" onClick={duplicate} disabled={duplicating}>
        <Copy /> {duplicating ? "Duplicating…" : "Duplicate"}
      </Button>
      <Button asChild>
        <Link href={`/cases/${caseId}/edit`}>
          <Pencil /> Edit
        </Link>
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete ${label}?`}
        description="This permanently deletes the case, along with its history, comments and results in every run."
        confirmLabel="Delete case"
        destructive
        onConfirm={remove}
      />
    </div>
  );
}
