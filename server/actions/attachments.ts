"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProjectAccess } from "@/lib/auth/project-access";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { validateAttachment } from "@/lib/constants/attachments";
import { ATTACHMENT_SELECT, isOwnBlobUrl, removeAttachments } from "@/lib/db/attachments";
import { db } from "@/lib/db";
import { ActionError, runAction } from "@/lib/utils/action";
import { registerAttachmentSchema, type RegisterAttachmentInput } from "@/lib/validations/attachment";

/** Records a file the browser just uploaded. The URL is checked, so only this store's files can be attached. */
export async function registerAttachment(input: RegisterAttachmentInput) {
  return runAction(async () => {
    const values = registerAttachmentSchema.parse(input);
    const { user } = await requireProjectAccess(values.projectId, "attachment:upload");

    const invalid = validateAttachment(values.mimeType, values.sizeBytes);
    if (invalid) throw new ActionError(invalid);
    if (!values.pathname.startsWith(`projects/${values.projectId}/`) || !isOwnBlobUrl(values.url, values.pathname)) {
      throw new ActionError("That file didn't come from this workspace's storage.");
    }
    if (values.testCaseId) {
      const testCase = await db.testCase.findFirst({ where: { id: values.testCaseId, projectId: values.projectId }, select: { id: true } });
      if (!testCase) throw new ActionError("This case no longer exists.");
    }
    if (values.bugId) {
      const bug = await db.bug.findFirst({ where: { id: values.bugId, projectId: values.projectId }, select: { id: true } });
      if (!bug) throw new ActionError("This bug no longer exists.");
    }

    const attachment = await db.attachment.create({
      data: {
        projectId: values.projectId,
        url: values.url,
        pathname: values.pathname,
        fileName: values.fileName,
        mimeType: values.mimeType,
        sizeBytes: values.sizeBytes,
        uploadedById: user.id,
        testCaseId: values.testCaseId,
        bugId: values.bugId ?? null,
      },
      select: ATTACHMENT_SELECT,
    });
    if (values.testCaseId) revalidatePath(`/cases/${values.testCaseId}`, "layout");
    if (values.bugId) revalidatePath(`/bugs/${values.bugId}`, "layout");
    return attachment;
  });
}

export async function deleteAttachment(attachmentId: string) {
  return runAction(async () => {
    const attachment = await db.attachment.findUnique({
      where: { id: z.string().min(1).parse(attachmentId) },
      select: {
        id: true,
        url: true,
        projectId: true,
        testCaseId: true,
        bugId: true,
        uploadedById: true,
        testResult: { select: { runCase: { select: { run: { select: { status: true } } } } } },
      },
    });
    if (!attachment) throw new ActionError("That file was already deleted.");

    const { user, role } = await requireProjectAccess(attachment.projectId);
    if (attachment.uploadedById !== user.id && !hasPermission(role, "case:manage")) throw new ActionError("You can only delete files you uploaded.");
    if (attachment.testResult?.runCase.run.status === "COMPLETED") throw new ActionError("This run is closed and read only.");

    await removeAttachments([attachment]);
    if (attachment.testCaseId) revalidatePath(`/cases/${attachment.testCaseId}`, "layout");
    if (attachment.bugId) revalidatePath(`/bugs/${attachment.bugId}`, "layout");
    revalidatePath("/settings");
  });
}

const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

/** Files uploaded while filling in a form that was then abandoned belong to nothing, but still use storage. */
export async function cleanUpUnattachedFiles() {
  return runAction(async () => {
    await requirePermission("team:manage");
    const orphans = await db.attachment.findMany({
      where: { testCaseId: null, testResultId: null, bugId: null, createdAt: { lt: new Date(Date.now() - ORPHAN_AGE_MS) } },
      select: { id: true, url: true },
    });
    await removeAttachments(orphans);
    revalidatePath("/settings");
    return { count: orphans.length };
  });
}
