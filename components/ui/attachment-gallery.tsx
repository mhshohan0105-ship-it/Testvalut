"use client";

import Image from "next/image";
import { useState } from "react";
import { ExternalLink, FileText, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatBytes, type AttachmentView } from "@/lib/constants/attachments";
import { deleteAttachment } from "@/server/actions/attachments";
import { ConfirmDialog } from "./confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";

export function AttachmentGallery({
  items,
  currentUserId,
  canModerate = false,
  readOnly = false,
  onDeleted,
}: {
  items: AttachmentView[];
  currentUserId?: string;
  canModerate?: boolean;
  readOnly?: boolean;
  onDeleted?: (id: string) => void;
}) {
  const [open, setOpen] = useState<AttachmentView | null>(null);
  const [toDelete, setToDelete] = useState<AttachmentView | null>(null);

  async function confirmDelete() {
    if (!toDelete) return;
    const result = await deleteAttachment(toDelete.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("File deleted");
    onDeleted?.(toDelete.id);
    setOpen(null);
  }

  if (items.length === 0) return null;

  return (
    <>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2" aria-label="Attachments">
        {items.map((item) => {
          const isImage = item.mimeType.startsWith("image/");
          const isVideo = item.mimeType.startsWith("video/");
          const removable = !readOnly && onDeleted && (item.uploadedById === currentUserId || canModerate);
          return (
            <li key={item.id} className="group relative overflow-hidden rounded-xl border border-border bg-muted">
              {isImage || isVideo ? (
                <button type="button" onClick={() => setOpen(item)} className="block w-full text-left" aria-label={`Open ${item.fileName}`}>
                  <span className="relative block aspect-video">
                    {isImage ? (
                      <Image src={item.url} alt="" fill sizes="160px" className="object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center">
                        <Play className="size-7 text-primary" aria-hidden />
                      </span>
                    )}
                  </span>
                  <FileCaption item={item} />
                </button>
              ) : (
                <a href={item.url} target="_blank" rel="noreferrer" className="block" aria-label={`Open ${item.fileName} in a new tab`}>
                  <span className="flex aspect-video items-center justify-center">
                    <FileText className="size-7 text-primary" aria-hidden />
                  </span>
                  <FileCaption item={item} />
                </a>
              )}
              {removable && (
                <button
                  type="button"
                  onClick={() => setToDelete(item)}
                  aria-label={`Delete ${item.fileName}`}
                  className="glass-overlay absolute top-1 right-1 flex size-7 items-center justify-center rounded-lg opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-lg:opacity-100"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <Dialog open={open !== null} onOpenChange={(value) => !value && setOpen(null)}>
        <DialogContent className="max-h-[92dvh] gap-3 sm:max-w-5xl">
          <DialogTitle className="truncate pr-8 text-sm">{open?.fileName}</DialogTitle>
          <DialogDescription className="sr-only">Full size preview of this attachment.</DialogDescription>
          {open?.mimeType.startsWith("video/") ? (
            <video src={open.url} controls autoPlay preload="metadata" className="max-h-[75dvh] w-full rounded-lg bg-black" />
          ) : open ? (
            <div className="relative h-[75dvh] w-full">
              {/* The full-size file loads only here, never for thumbnails. */}
              <Image src={open.url} alt={open.fileName} fill unoptimized sizes="90vw" className="rounded-lg object-contain" />
            </div>
          ) : null}
          {open && (
            <a href={open.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <ExternalLink className="size-3.5" aria-hidden /> Open original · {formatBytes(open.sizeBytes)}
            </a>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(value) => !value && setToDelete(null)}
        title={`Delete ${toDelete?.fileName ?? "file"}?`}
        description="This permanently deletes the file from storage."
        confirmLabel="Delete file"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}

function FileCaption({ item }: { item: AttachmentView }) {
  return (
    <span className="block px-2 py-1">
      <span className="block truncate text-xs">{item.fileName}</span>
      <span className="block text-[11px] text-muted-foreground tabular-nums">{formatBytes(item.sizeBytes)}</span>
    </span>
  );
}
