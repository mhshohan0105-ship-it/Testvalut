"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cleanUpUnattachedFiles } from "@/server/actions/attachments";

export function CleanUpFilesButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await cleanUpUnattachedFiles();
          if (result.ok) toast.success(result.data.count ? `Removed ${result.data.count} unattached file(s)` : "Nothing to clean up");
          else toast.error(result.error);
        })
      }
    >
      {pending ? "Cleaning up…" : "Clean up files"}
    </Button>
  );
}
