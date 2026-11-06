"use client";

import { useState } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { setProjectArchived } from "@/server/actions/projects";

export function ArchiveButton({ projectId, archived, name }: { projectId: string; archived: boolean; name: string }) {
  const [open, setOpen] = useState(false);

  async function apply() {
    const result = await setProjectArchived(projectId, !archived);
    if (result.ok) toast.success(archived ? "Project restored" : "Project archived");
    else toast.error(result.error);
  }

  if (archived) {
    return (
      <Button variant="outline" onClick={() => void apply()}>
        <ArchiveRestore /> Restore
      </Button>
    );
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Archive /> Archive
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Archive ${name}?`}
        description="It leaves the project switcher and becomes read only. Nothing is deleted, and you can restore it any time."
        confirmLabel="Archive project"
        onConfirm={apply}
      />
    </>
  );
}
