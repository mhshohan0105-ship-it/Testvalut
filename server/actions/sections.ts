"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProjectAccess } from "@/lib/auth/project-access";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/db/activity";
import { ActionError, runAction } from "@/lib/utils/action";
import { moveSectionInList, sectionSubtreeIds } from "@/lib/utils/tree";
import { getSections } from "@/server/queries/cases";

const name = z.string().trim().min(1, "Enter a section name").max(120, "Keep it under 120 characters");
const id = z.string().min(1);

export async function createSection(projectId: string, input: { name: string; parentId: string | null }) {
  return runAction(async () => {
    const { user } = await requireProjectAccess(projectId, "case:manage");
    const parsed = z.object({ name, parentId: id.nullable() }).parse(input);
    if (parsed.parentId) {
      const parent = await db.section.findFirst({ where: { id: parsed.parentId, projectId }, select: { id: true } });
      if (!parent) throw new ActionError("That parent section no longer exists.");
    }
    const siblings = await db.section.count({ where: { projectId, parentId: parsed.parentId } });
    const section = await db.section.create({
      data: { projectId, parentId: parsed.parentId, name: parsed.name, order: siblings },
      select: { id: true, parentId: true, name: true, order: true },
    });
    await logActivity(db, { projectId, userId: user.id, action: "created", entityType: "section", entityId: section.id, meta: { name: section.name } });
    revalidatePath("/cases");
    return section;
  });
}

export async function renameSection(projectId: string, sectionId: string, newName: string) {
  return runAction(async () => {
    const { user } = await requireProjectAccess(projectId, "case:manage");
    const parsed = name.parse(newName);
    const { count } = await db.section.updateMany({ where: { id: id.parse(sectionId), projectId }, data: { name: parsed } });
    if (count === 0) throw new ActionError("That section no longer exists.");
    await logActivity(db, { projectId, userId: user.id, action: "renamed", entityType: "section", entityId: sectionId, meta: { name: parsed } });
    revalidatePath("/cases");
  });
}

export async function moveSection(projectId: string, input: { sectionId: string; parentId: string | null; index: number }) {
  return runAction(async () => {
    await requireProjectAccess(projectId, "case:manage");
    const { sectionId, parentId, index } = z.object({ sectionId: id, parentId: id.nullable(), index: z.number().int().min(0) }).parse(input);

    const sections = await getSections(projectId);
    if (!sections.some((section) => section.id === sectionId)) throw new ActionError("That section no longer exists.");
    if (parentId) {
      if (!sections.some((section) => section.id === parentId)) throw new ActionError("That parent section no longer exists.");
      if (sectionSubtreeIds(sections, sectionId).includes(parentId)) throw new ActionError("A section can't be moved inside itself.");
    }

    const before = new Map(sections.map((section) => [section.id, section]));
    const changed = moveSectionInList(sections, sectionId, parentId, index).filter((section) => {
      const old = before.get(section.id);
      return old?.order !== section.order || old?.parentId !== section.parentId;
    });
    await db.$transaction(
      changed.map((section) => db.section.update({ where: { id: section.id }, data: { order: section.order, parentId: section.parentId }, select: { id: true } })),
    );
    revalidatePath("/cases");
  });
}

export async function deleteSection(projectId: string, sectionId: string) {
  return runAction(async () => {
    const { user } = await requireProjectAccess(projectId, "case:manage");
    const section = await db.section.findFirst({ where: { id: id.parse(sectionId), projectId }, select: { name: true } });
    if (!section) throw new ActionError("That section no longer exists.");
    // Nested sections and their cases go with it through the schema's cascades.
    await db.section.delete({ where: { id: sectionId }, select: { id: true } });
    await logActivity(db, { projectId, userId: user.id, action: "deleted", entityType: "section", entityId: sectionId, meta: { name: section.name } });
    revalidatePath("/", "layout");
  });
}
