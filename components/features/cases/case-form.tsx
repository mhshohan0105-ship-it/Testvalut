"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CircleCheck, CloudOff, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AttachmentGallery } from "@/components/ui/attachment-gallery";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/ui/file-uploader";
import { FieldError, NativeSelect } from "@/components/ui/form-controls";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AttachmentView } from "@/lib/constants/attachments";
import { CASE_TYPES, CASE_TYPE_LABELS, PRIORITIES, PRIORITY_LABELS } from "@/lib/constants/testing";
import { caseLabel } from "@/lib/utils/format";
import { sectionOptions, type SectionItem } from "@/lib/utils/tree";
import { caseFormSchema, type CaseFormInput } from "@/lib/validations/case";
import { createCase, updateCase } from "@/server/actions/cases";
import { RichTextEditor } from "./rich-text-editor";
import { StepsEditor } from "./steps-editor";
import { TagsInput } from "./tags-input";

const DRAFT_DELAY_MS = 800;
const noSubscribe = () => () => {};

type Status = "saved" | "dirty" | "draft" | "saving";

function readDraft(key: string) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return caseFormSchema.partial().parse(JSON.parse(stored)) as Partial<CaseFormInput>;
  } catch {
    return null;
  }
}

function clearDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Blocked storage means no draft was kept either.
  }
}

export function CaseForm({
  projectId,
  sections,
  initial,
  caseId,
  caseNumber,
  initialUpdatedAt,
  initialAttachments = [],
  currentUserId,
}: {
  projectId: string;
  sections: SectionItem[];
  initial: CaseFormInput;
  caseId?: string;
  caseNumber?: number;
  initialUpdatedAt?: string;
  initialAttachments?: AttachmentView[];
  currentUserId: string;
}) {
  const router = useRouter();
  const draftKey = `tv-case-draft:${caseId ?? `new:${projectId}`}`;
  const [status, setStatus] = useState<Status>("saved");
  const [draftRestored, setDraftRestored] = useState(false);
  const [saving, startSaving] = useTransition();
  const [attachments, setAttachments] = useState(initialAttachments);
  const skipDraftRef = useRef(false);

  const form = useForm<CaseFormInput>({ resolver: zodResolver(caseFormSchema), defaultValues: initial });
  const { errors } = form.formState;

  // Whether a draft existed when the page opened. Drafts written while typing here must not trigger the banner.
  const [draftAtOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(draftKey) !== null;
    } catch {
      return false;
    }
  });
  // False for the server render and hydration, which can't know about localStorage.
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  const hasDraft = hydrated && draftAtOpen;

  const restoreDraft = useCallback(() => {
    const draft = readDraft(draftKey);
    if (draft) {
      form.reset({ ...initial, ...draft }, { keepDefaultValues: true });
      setStatus("draft");
    }
    setDraftRestored(true);
  }, [draftKey, form, initial]);

  function discardDraft() {
    clearDraft(draftKey);
    skipDraftRef.current = true;
    form.reset(initial);
    setDraftRestored(true);
    setStatus("saved");
  }

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: () => {
        if (skipDraftRef.current) {
          skipDraftRef.current = false;
          return;
        }
        setStatus("dirty");
        clearTimeout(timer);
        timer = setTimeout(() => {
          try {
            localStorage.setItem(draftKey, JSON.stringify(form.getValues()));
            setStatus("draft");
          } catch {
            // With storage blocked, changes stay in the form until saved.
          }
        }, DRAFT_DELAY_MS);
      },
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [draftKey, form]);

  const save = form.handleSubmit(
    (values) => {
      setStatus("saving");
      startSaving(async () => {
        const result = caseId ? await updateCase(caseId, values, initialUpdatedAt ?? "") : await createCase(projectId, values, attachments.map((attachment) => attachment.id));
        if (!result.ok) {
          setStatus("draft");
          toast.error(result.error);
          return;
        }
        clearDraft(draftKey);
        toast.success(caseId ? "Case saved" : "Case created");
        const targetId = caseId ?? ("id" in result.data ? result.data.id : undefined);
        router.push(targetId ? `/cases/${targetId}` : "/cases");
      });
    },
    () => toast.error("Please fix the highlighted fields."),
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [save]);

  const backHref = caseId ? `/cases/${caseId}` : "/cases";

  return (
    <form onSubmit={save} noValidate>
      <Link href={backHref} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> {caseNumber ? caseLabel(caseNumber) : "Test Cases"}
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{caseId ? "Edit case" : "New case"}</h1>
        <div className="flex items-center gap-3">
          <StatusIndicator status={saving ? "saving" : status} />
          <Button asChild variant="outline">
            <Link href={backHref}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
            <kbd className="hidden rounded bg-white/15 px-1 font-mono text-[10px] sm:inline">Ctrl S</kbd>
          </Button>
        </div>
      </div>

      {hasDraft && !draftRestored && (
        <div className="glass mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-sm" role="status">
          <span>You have an unsaved draft of this case.</span>
          <span className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={discardDraft}>
              Discard
            </Button>
            <Button type="button" size="sm" onClick={restoreDraft}>
              Restore draft
            </Button>
          </span>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-5">
          <GlassCard className="space-y-4 p-5">
            <div>
              <Label htmlFor="case-title" className="mb-1.5">Title</Label>
              <Input id="case-title" autoFocus={!caseId} className="h-10 rounded-xl" aria-invalid={Boolean(errors.title)} {...form.register("title")} />
              <FieldError message={errors.title?.message} />
            </div>
            <div>
              <Label id="case-preconditions-label" className="mb-1.5">Preconditions</Label>
              <Controller
                control={form.control}
                name="preconditions"
                render={({ field }) => <RichTextEditor id="case-preconditions" labelledBy="case-preconditions-label" value={field.value} onChange={field.onChange} />}
              />
              <FieldError message={errors.preconditions?.message} />
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h2 className="mb-3 font-semibold tracking-tight">Steps</h2>
            <StepsEditor form={form} />
            <FieldError message={errors.steps?.message} />
          </GlassCard>

          <GlassCard className="space-y-3 p-5">
            <h2 className="font-semibold tracking-tight">Attachments</h2>
            <AttachmentGallery
              items={attachments}
              currentUserId={currentUserId}
              canModerate
              onDeleted={(id) => setAttachments((current) => current.filter((attachment) => attachment.id !== id))}
            />
            <FileUploader projectId={projectId} testCaseId={caseId ?? null} onUploaded={(attachment) => setAttachments((current) => [...current, attachment])} />
          </GlassCard>
        </div>

        <GlassCard className="h-fit space-y-4 p-5">
          <div>
            <Label htmlFor="case-section" className="mb-1.5">Section</Label>
            <NativeSelect id="case-section" aria-invalid={Boolean(errors.sectionId)} {...form.register("sectionId")}>
              {sectionOptions(sections).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
            <FieldError message={errors.sectionId?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="case-priority" className="mb-1.5">Priority</Label>
              <NativeSelect id="case-priority" {...form.register("priority")}>
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {PRIORITY_LABELS[priority]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <Label htmlFor="case-type" className="mb-1.5">Type</Label>
              <NativeSelect id="case-type" {...form.register("type")}>
                {CASE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {CASE_TYPE_LABELS[type]}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <div>
            <Label htmlFor="case-estimate" className="mb-1.5">Estimate (minutes)</Label>
            <Input
              id="case-estimate"
              type="number"
              min={0}
              className="h-10 rounded-xl"
              aria-invalid={Boolean(errors.estimate)}
              {...form.register("estimate", { setValueAs: (value: unknown) => (value === "" || value === null || value === undefined ? null : Number(value)) })}
            />
            <FieldError message={errors.estimate?.message} />
          </div>
          <div>
            <Label htmlFor="case-references" className="mb-1.5">References</Label>
            <Input id="case-references" placeholder="SHOP-123, PAY-45" className="h-10 rounded-xl" aria-invalid={Boolean(errors.references)} {...form.register("references")} />
            <FieldError message={errors.references?.message} />
          </div>
          <div>
            <Label htmlFor="case-tags" className="mb-1.5">Tags</Label>
            <Controller control={form.control} name="tags" render={({ field }) => <TagsInput id="case-tags" value={field.value} onChange={field.onChange} />} />
            <FieldError message={errors.tags?.message} />
          </div>
        </GlassCard>
      </div>
    </form>
  );
}

function StatusIndicator({ status }: { status: Status }) {
  const content = {
    saved: { icon: CircleCheck, text: "No changes" },
    dirty: { icon: Pencil, text: "Editing…" },
    draft: { icon: CloudOff, text: "Draft saved in this browser" },
    saving: { icon: Pencil, text: "Saving…" },
  }[status];
  const Icon = content.icon;
  return (
    <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex" role="status">
      <Icon className="size-3.5" aria-hidden /> {content.text}
    </span>
  );
}
