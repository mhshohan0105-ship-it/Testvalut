"use client";

import { useState } from "react";
import { AttachmentGallery } from "@/components/ui/attachment-gallery";
import { FileUploader } from "@/components/ui/file-uploader";
import type { AttachmentView } from "@/lib/constants/attachments";

/** Attachments on a saved case. Each file links to the case as soon as it finishes uploading. */
export function CaseAttachments({
  projectId,
  caseId,
  initial,
  currentUserId,
  canUpload,
  canModerate,
}: {
  projectId: string;
  caseId: string;
  initial: AttachmentView[];
  currentUserId: string;
  canUpload: boolean;
  canModerate: boolean;
}) {
  const [items, setItems] = useState(initial);

  return (
    <div className="space-y-3">
      <AttachmentGallery
        items={items}
        currentUserId={currentUserId}
        canModerate={canModerate}
        readOnly={!canUpload && !canModerate}
        onDeleted={(id) => setItems((current) => current.filter((item) => item.id !== id))}
      />
      {canUpload && <FileUploader projectId={projectId} testCaseId={caseId} onUploaded={(item) => setItems((current) => [...current, item])} />}
      {!canUpload && items.length === 0 && <p className="text-sm text-muted-foreground">No attachments.</p>}
    </div>
  );
}
