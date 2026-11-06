"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Link2 } from "lucide-react";
import { toast } from "sonner";
import { AttachmentGallery } from "@/components/ui/attachment-gallery";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/ui/file-uploader";
import { FieldError, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AttachmentView } from "@/lib/constants/attachments";
import { PRIORITIES, PRIORITY_LABELS } from "@/lib/constants/testing";
import { bugFormSchema, type BugFormInput } from "@/lib/validations/bug";
import { createBug, updateBug } from "@/server/actions/bugs";

export function BugForm({
  projectId,
  people,
  initial,
  currentUserId,
  bugId,
  bugNumber,
  linkedCase,
  links,
}: {
  projectId: string;
  people: { id: string; name: string }[];
  initial: BugFormInput;
  currentUserId: string;
  bugId?: string;
  bugNumber?: number;
  /** Shown so the reporter can see what this bug will be linked to. */
  linkedCase?: string;
  links?: { testCaseId: string | null; runCaseId: string | null };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [attachments, setAttachments] = useState<AttachmentView[]>([]);
  const form = useForm<BugFormInput>({ resolver: zodResolver(bugFormSchema), defaultValues: initial });
  const { errors } = form.formState;
  const backHref = bugId ? `/bugs/${bugId}` : "/bugs";

  const submit = form.handleSubmit(
    (values) => {
      startTransition(async () => {
        const result = bugId
          ? await updateBug(bugId, values)
          : await createBug(projectId, values, {
              testCaseId: links?.testCaseId ?? null,
              runCaseId: links?.runCaseId ?? null,
              attachmentIds: attachments.map((attachment) => attachment.id),
            });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(bugId ? "Bug saved" : "Bug reported");
        const target = bugId ?? (result.data && "id" in result.data ? result.data.id : undefined);
        router.push(target ? `/bugs/${target}` : "/bugs");
      });
    },
    () => toast.error("Please fix the highlighted fields."),
  );

  return (
    <form onSubmit={submit} noValidate>
      <Link href={backHref} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> {bugNumber ? `B${bugNumber}` : "Bugs"}
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{bugId ? "Edit bug" : "Report a bug"}</h1>
          {linkedCase && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Link2 className="size-3.5" aria-hidden /> Linked to {linkedCase}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={backHref}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : bugId ? "Save" : "Report bug"}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-5">
          <GlassCard className="space-y-4 p-5">
            <div>
              <Label htmlFor="bug-title" className="mb-1.5">Title</Label>
              <Input id="bug-title" autoFocus={!bugId} className="h-10 rounded-xl" aria-invalid={Boolean(errors.title)} {...form.register("title")} />
              <FieldError message={errors.title?.message} />
            </div>
            <div>
              <Label htmlFor="bug-description" className="mb-1.5">Description</Label>
              <Textarea id="bug-description" className="min-h-24" aria-invalid={Boolean(errors.description)} {...form.register("description")} />
              <FieldError message={errors.description?.message} />
            </div>
            <div>
              <Label htmlFor="bug-steps" className="mb-1.5">Steps to reproduce</Label>
              <Textarea id="bug-steps" className="min-h-28" aria-invalid={Boolean(errors.stepsToReproduce)} {...form.register("stepsToReproduce")} />
              <FieldError message={errors.stepsToReproduce?.message} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="bug-expected" className="mb-1.5">Expected result</Label>
                <Textarea id="bug-expected" aria-invalid={Boolean(errors.expectedResult)} {...form.register("expectedResult")} />
                <FieldError message={errors.expectedResult?.message} />
              </div>
              <div>
                <Label htmlFor="bug-actual" className="mb-1.5">Actual result</Label>
                <Textarea id="bug-actual" aria-invalid={Boolean(errors.actualResult)} {...form.register("actualResult")} />
                <FieldError message={errors.actualResult?.message} />
              </div>
            </div>
          </GlassCard>

          {!bugId && (
            <GlassCard className="space-y-3 p-5">
              <h2 className="font-semibold tracking-tight">Attachments</h2>
              <AttachmentGallery
                items={attachments}
                currentUserId={currentUserId}
                onDeleted={(id) => setAttachments((current) => current.filter((attachment) => attachment.id !== id))}
              />
              <FileUploader projectId={projectId} pasteTarget hint="Drop or paste a screenshot, or click" onUploaded={(attachment) => setAttachments((current) => [...current, attachment])} />
            </GlassCard>
          )}
        </div>

        <GlassCard className="h-fit space-y-4 p-5">
          <div>
            <Label htmlFor="bug-severity" className="mb-1.5">Severity</Label>
            <NativeSelect id="bug-severity" {...form.register("severity")}>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="bug-assignee" className="mb-1.5">Assignee</Label>
            <NativeSelect id="bug-assignee" {...form.register("assignedToId")}>
              <option value="">Unassigned</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="bug-environment" className="mb-1.5">Environment</Label>
            <Input id="bug-environment" placeholder="Chrome / Staging" className="h-10 rounded-xl" aria-invalid={Boolean(errors.environment)} {...form.register("environment")} />
            <FieldError message={errors.environment?.message} />
          </div>
          <div>
            <Label htmlFor="bug-external" className="mb-1.5">External reference</Label>
            <Input id="bug-external" placeholder="SHOP-123 or a URL" className="h-10 rounded-xl" aria-invalid={Boolean(errors.externalRef)} {...form.register("externalRef")} />
            <FieldError message={errors.externalRef?.message} />
          </div>
        </GlassCard>
      </div>
    </form>
  );
}
