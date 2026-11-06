"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProjectAccess } from "@/lib/auth/project-access";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/db/activity";
import { ActionError, runAction } from "@/lib/utils/action";
import { milestoneFormSchema, type MilestoneFormInput } from "@/lib/validations/milestone";

function toFields(input: MilestoneFormInput) {
  const values = milestoneFormSchema.parse(input);
  return {
    name: values.name,
    description: values.description || null,
    startDate: values.startDate ? new Date(`${values.startDate}T00:00:00Z`) : null,
    dueDate: values.dueDate ? new Date(`${values.dueDate}T00:00:00Z`) : null,
  };
}

async function requireMilestone(milestoneId: string) {
  const milestone = await db.milestone.findUnique({ where: { id: z.string().min(1).parse(milestoneId) }, select: { id: true, projectId: true, name: true } });
  if (!milestone) throw new ActionError("This milestone no longer exists.");
  return { milestone, ...(await requireProjectAccess(milestone.projectId, "milestone:manage")) };
}

export async function createMilestone(projectId: string, input: MilestoneFormInput) {
  return runAction(async () => {
    const { user } = await requireProjectAccess(projectId, "milestone:manage");
    const fields = toFields(input);
    const milestone = await db.milestone.create({ data: { ...fields, projectId }, select: { id: true } });
    await logActivity(db, { projectId, userId: user.id, action: "created", entityType: "milestone", entityId: milestone.id, meta: { name: fields.name } });
    revalidatePath("/", "layout");
    return { id: milestone.id };
  });
}

export async function updateMilestone(milestoneId: string, input: MilestoneFormInput) {
  return runAction(async () => {
    const { milestone, user } = await requireMilestone(milestoneId);
    const fields = toFields(input);
    await db.milestone.update({ where: { id: milestone.id }, data: fields, select: { id: true } });
    await logActivity(db, { projectId: milestone.projectId, userId: user.id, action: "updated", entityType: "milestone", entityId: milestone.id, meta: { name: fields.name } });
    revalidatePath("/", "layout");
  });
}

export async function setMilestoneCompleted(milestoneId: string, completed: boolean) {
  return runAction(async () => {
    const { milestone, user } = await requireMilestone(milestoneId);
    await db.milestone.update({ where: { id: milestone.id }, data: { completed: z.boolean().parse(completed) }, select: { id: true } });
    await logActivity(db, { projectId: milestone.projectId, userId: user.id, action: completed ? "completed" : "reopened", entityType: "milestone", entityId: milestone.id, meta: { name: milestone.name } });
    revalidatePath("/", "layout");
  });
}

/** Linked runs stay, and simply lose their milestone. */
export async function deleteMilestone(milestoneId: string) {
  return runAction(async () => {
    const { milestone, user } = await requireMilestone(milestoneId);
    await db.milestone.delete({ where: { id: milestone.id }, select: { id: true } });
    await logActivity(db, { projectId: milestone.projectId, userId: user.id, action: "deleted", entityType: "milestone", entityId: milestone.id, meta: { name: milestone.name } });
    revalidatePath("/", "layout");
  });
}
