"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProjectAccess } from "@/lib/auth/project-access";
import type { Permission } from "@/lib/auth/permissions";
import { BUG_STATUS_LABELS } from "@/lib/constants/testing";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/db/activity";
import { removeAttachments } from "@/lib/db/attachments";
import { ActionError, runAction } from "@/lib/utils/action";
import { bugFormSchema, bugLinksSchema, bugStatusSchema, type BugFormInput, type BugLinks } from "@/lib/validations/bug";
import { getAssignableUsers } from "@/server/queries/runs";
import type { BugStatus } from "@/generated/prisma/enums";

const id = z.string().min(1);

async function requireBug(bugId: string, permission: Permission) {
  const bug = await db.bug.findUnique({
    where: { id: id.parse(bugId) },
    select: { id: true, projectId: true, bugNumber: true, title: true, assignedToId: true },
  });
  if (!bug) throw new ActionError("This bug no longer exists.");
  return { bug, ...(await requireProjectAccess(bug.projectId, permission)) };
}

async function assertAssignable(projectId: string, assignedToId: string) {
  if (!assignedToId) return;
  const people = await getAssignableUsers(projectId);
  if (!people.some((person) => person.id === assignedToId)) throw new ActionError("That person can't be assigned in this project.");
}

function toFields(input: BugFormInput) {
  const values = bugFormSchema.parse(input);
  return {
    title: values.title,
    severity: values.severity,
    assignedToId: values.assignedToId || null,
    environment: values.environment || null,
    externalRef: values.externalRef || null,
    description: values.description || null,
    stepsToReproduce: values.stepsToReproduce || null,
    expectedResult: values.expectedResult || null,
    actualResult: values.actualResult || null,
  };
}

export async function createBug(projectId: string, input: BugFormInput, linksInput: BugLinks) {
  return runAction(async () => {
    const { user } = await requireProjectAccess(projectId, "bug:report");
    const fields = toFields(input);
    const links = bugLinksSchema.parse(linksInput);
    await assertAssignable(projectId, fields.assignedToId ?? "");

    // A link is only kept if it points into this project, whatever the browser sent.
    const testCase = links.testCaseId ? await db.testCase.findFirst({ where: { id: links.testCaseId, projectId }, select: { id: true } }) : null;
    const runCase = links.runCaseId ? await db.testRunCase.findFirst({ where: { id: links.runCaseId, run: { projectId } }, select: { id: true, testCaseId: true } }) : null;

    const bug = await db.$transaction(async (tx) => {
      const { nextBugNumber } = await tx.project.update({
        where: { id: projectId },
        data: { nextBugNumber: { increment: 1 } },
        select: { nextBugNumber: true },
      });
      const bugNumber = nextBugNumber - 1;
      const created = await tx.bug.create({
        data: { ...fields, projectId, bugNumber, reportedById: user.id, testCaseId: runCase?.testCaseId ?? testCase?.id ?? null, runCaseId: runCase?.id ?? null },
        select: { id: true },
      });
      await tx.attachment.updateMany({
        where: { id: { in: links.attachmentIds }, projectId, uploadedById: user.id, testCaseId: null, testResultId: null, bugId: null },
        data: { bugId: created.id },
      });
      await logActivity(tx, { projectId, userId: user.id, action: "reported", entityType: "bug", entityId: created.id, meta: { name: `B${bugNumber} ${fields.title}` } });
      return created;
    });
    revalidatePath("/", "layout");
    return { id: bug.id };
  });
}

export async function updateBug(bugId: string, input: BugFormInput) {
  return runAction(async () => {
    const { bug, user } = await requireBug(bugId, "bug:report");
    const fields = toFields(input);
    await assertAssignable(bug.projectId, fields.assignedToId ?? "");
    await db.bug.update({ where: { id: bug.id }, data: fields, select: { id: true } });
    await logActivity(db, { projectId: bug.projectId, userId: user.id, action: "updated", entityType: "bug", entityId: bug.id, meta: { name: `B${bug.bugNumber} ${fields.title}` } });
    revalidatePath("/", "layout");
  });
}

export async function setBugStatus(bugId: string, statusInput: BugStatus) {
  return runAction(async () => {
    const { bug, user } = await requireBug(bugId, "bug:report");
    const status = bugStatusSchema.parse(statusInput);
    const done = status === "RESOLVED" || status === "CLOSED";
    await db.bug.update({ where: { id: bug.id }, data: { status, resolvedAt: done ? new Date() : null }, select: { id: true } });
    await logActivity(db, {
      projectId: bug.projectId,
      userId: user.id,
      action: `set status to ${BUG_STATUS_LABELS[status].toLowerCase()} on`,
      entityType: "bug",
      entityId: bug.id,
      meta: { name: `B${bug.bugNumber} ${bug.title}` },
    });
    revalidatePath("/", "layout");
  });
}

export async function assignBug(bugId: string, assignedToId: string | null) {
  return runAction(async () => {
    const { bug, user } = await requireBug(bugId, "bug:report");
    await assertAssignable(bug.projectId, assignedToId ?? "");
    await db.bug.update({ where: { id: bug.id }, data: { assignedToId: assignedToId || null }, select: { id: true } });
    await logActivity(db, { projectId: bug.projectId, userId: user.id, action: assignedToId ? "reassigned" : "unassigned", entityType: "bug", entityId: bug.id, meta: { name: `B${bug.bugNumber} ${bug.title}` } });
    revalidatePath("/", "layout");
  });
}

export async function deleteBug(bugId: string) {
  return runAction(async () => {
    const { bug, user } = await requireBug(bugId, "bug:delete");
    const attachments = await db.attachment.findMany({ where: { bugId: bug.id }, select: { id: true, url: true } });
    await removeAttachments(attachments);
    await db.bug.delete({ where: { id: bug.id }, select: { id: true } });
    await logActivity(db, { projectId: bug.projectId, userId: user.id, action: "deleted", entityType: "bug", entityId: bug.id, meta: { name: `B${bug.bugNumber} ${bug.title}` } });
    revalidatePath("/", "layout");
  });
}
