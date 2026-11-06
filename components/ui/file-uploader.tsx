"use client";

import { useEffect, useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { ACCEPTED_FILES, resolveContentType, validateAttachment, type AttachmentView } from "@/lib/constants/attachments";
import { DEMO_MODE } from "@/lib/demo";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/utils/compress-image";
import { registerAttachment } from "@/server/actions/attachments";

type UploadItem = { id: string; name: string; percent: number };

const MULTIPART_FROM_BYTES = 5 * 1024 * 1024;

export function FileUploader({
  projectId,
  testCaseId = null,
  bugId = null,
  onUploaded,
  pasteTarget = false,
  hint,
}: {
  projectId: string;
  testCaseId?: string | null;
  bugId?: string | null;
  onUploaded: (attachment: AttachmentView) => void;
  /** Also accept files pasted anywhere on the page. */
  pasteTarget?: boolean;
  hint?: string;
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const controllers = useRef(new Map<string, AbortController>());

  async function uploadOne(original: File) {
    const id = crypto.randomUUID();
    const controller = new AbortController();
    controllers.current.set(id, controller);
    setItems((current) => [...current, { id, name: original.name, percent: 0 }]);
    const finish = () => {
      controllers.current.delete(id);
      setItems((current) => current.filter((item) => item.id !== id));
    };

    try {
      const file = await compressImage(original);
      const contentType = resolveContentType(file.name, file.type);
      const invalid = validateAttachment(contentType, file.size);
      if (invalid) {
        toast.error(`${original.name}: ${invalid}`);
        return;
      }

      // The SDK is only needed once someone actually uploads, so it stays out of the page bundle.
      const { upload } = await import("@vercel/blob/client");
      const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(-120) || "file";
      const blob = await upload(`projects/${projectId}/${safeName}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        contentType,
        clientPayload: JSON.stringify({ projectId, contentType, sizeBytes: file.size }),
        multipart: file.size >= MULTIPART_FROM_BYTES,
        abortSignal: controller.signal,
        onUploadProgress: ({ percentage }) => {
          setItems((current) => current.map((item) => (item.id === id ? { ...item, percent: percentage } : item)));
        },
      });

      const result = await registerAttachment({
        projectId,
        url: blob.url,
        pathname: blob.pathname,
        fileName: file.name,
        mimeType: contentType,
        sizeBytes: file.size,
        testCaseId,
        bugId,
      });
      if (!result.ok) {
        toast.error(`${original.name}: ${result.error}`);
        return;
      }
      onUploaded(result.data);
      toast.success(`Uploaded ${file.name}`);
    } catch (error) {
      if (controller.signal.aborted) {
        toast.info(`Canceled ${original.name}`);
      } else {
        console.error(error);
        toast.error(`${original.name}: ${error instanceof Error && error.message ? error.message.replace(/^Vercel Blob: /, "") : "The upload failed."}`);
      }
    } finally {
      finish();
    }
  }

  function addFiles(files: Iterable<File>) {
    for (const file of files) void uploadOne(file);
  }

  useEffect(() => {
    if (!pasteTarget || DEMO_MODE) return;
    function onPaste(event: ClipboardEvent) {
      const files = [...(event.clipboardData?.files ?? [])];
      if (files.length === 0) return;
      event.preventDefault();
      addFiles(files.map((file, index) => (file.name && file.name !== "image.png" ? file : new File([file], `screenshot-${Date.now()}-${index}.png`, { type: file.type }))));
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the listener only reads stable props through addFiles
  }, [pasteTarget, projectId, testCaseId]);

  if (DEMO_MODE) return <p className="rounded-xl border border-dashed border-border px-4 py-3 text-center text-sm text-muted-foreground">File uploads are turned off in this demo.</p>;

  return (
    <div>
      <label
        className={cn(
          "flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-dashed border-border px-4 py-4 text-center text-sm text-muted-foreground transition-colors hover:bg-accent/40 focus-within:ring-[3px] focus-within:ring-ring/40",
          dragging && "border-primary bg-primary/10 text-foreground",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
      >
        <UploadCloud className="size-5 shrink-0 text-primary" aria-hidden />
        <span>{hint ?? "Drop files here, or click to choose"}</span>
        <input
          type="file"
          multiple
          accept={ACCEPTED_FILES}
          className="sr-only"
          aria-label="Attach files"
          onChange={(event) => {
            addFiles(event.target.files ?? []);
            event.target.value = "";
          }}
        />
      </label>
      {items.length > 0 && (
        <ul className="mt-2 space-y-1.5" aria-label="Uploads in progress">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-xs">
              <span className="w-32 truncate sm:w-44">{item.name}</span>
              <span
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label={`Uploading ${item.name}`}
                aria-valuenow={Math.round(item.percent)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span className="block h-full origin-left bg-primary transition-transform duration-150" style={{ transform: `scaleX(${item.percent / 100})` }} />
              </span>
              <span className="w-8 text-right font-mono tabular-nums">{Math.round(item.percent)}%</span>
              <button type="button" onClick={() => controllers.current.get(item.id)?.abort()} aria-label={`Cancel upload of ${item.name}`} className="rounded p-0.5 hover:bg-accent">
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
