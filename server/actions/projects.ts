"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requireProjectAccess } from "@/lib/auth/project-access";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/db/activity";
import { ActionError, runAction } from "@/lib/utils/action";
import { memberInputSchema, projectFormSchema, type ProjectFormInput } from "@/lib/validations/project";
import { ACTIVE_PROJECT_COOKIE } from "@/server/queries/projects";

function duplicateKeyError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return new ActionError("Another project already uses that key.");
  }
  return error;
}

export async function createProject(input: ProjectFormInput) {
  return runAction(async () => {
    const user = await requirePermission("project:manage");
    const { description, ...values } = projectFormSchema.parse(input);
    try {
      const project = await db.project.create({
        data: {
          ...values,
          description: description || null,
          createdById: user.id,
          members: { create: { userId: user.id, role: user.role === "ADMIN" ? "ADMIN" : "LEAD" } },
          // Every case needs a section, so a new project starts with one.
          sections: { create: { name: "General", order: 0 } },
        },
        select: { id: true },
      });
      await logActivity(db, { projectId: project.id, userId: user.id, action: "created", entityType: "project", entityId: project.id, meta: { name: values.name } });
      revalidatePath("/", "layout");
      return { id: project.id };
    } catch (error) {
      throw duplicateKeyError(error);
    }
  });
}

export async function updateProject(projectId: string, input: ProjectFormInput) {
  return runAction(async () => {
    const { user } = await requireProjectAccess(projectId, "project:manage");
    const { description, ...values } = projectFormSchema.parse(input);
    try {
      await db.project.update({ where: { id: projectId }, data: { ...values, description: description || null }, select: { id: true } });
    } catch (error) {
      throw duplicateKeyError(error);
    }
    await logActivity(db, { projectId, userId: user.id, action: "updated", entityType: "project", entityId: projectId, meta: { name: values.name } });
    revalidatePath("/", "layout");
  });
}

export async function setProjectArchived(projectId: string, archived: boolean) {
  return runAction(async () => {
    const { user, project } = await requireProjectAccess(projectId, "project:manage", { allowArchived: true });
    await db.project.update({ where: { id: projectId }, data: { archived: z.boolean().parse(archived) }, select: { id: true } });
    await logActivity(db, { projectId, userId: user.id, action: archived ? "archived" : "restored", entityType: "project", entityId: projectId, meta: { name: project.name } });
    revalidatePath("/", "layout");
  });
}

/** Makes the project active, then opens its repository. */
export async function openProjectCases(projectId: string) {
  await requireProjectAccess(projectId);
  const store = await cookies();
  store.set(ACTIVE_PROJECT_COOKIE, projectId, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
  redirect("/cases");
}

export async function upsertProjectMember(input: z.infer<typeof memberInputSchema>) {
  return runAction(async () => {
    const { projectId, userId, role } = memberInputSchema.parse(input);
    const { user } = await requireProjectAccess(projectId, "project:manage");
    const target = await db.user.findFirst({ where: { id: userId, deactivatedAt: null }, select: { name: true } });
    if (!target) throw new ActionError("That user isn't available.");
    await db.projectMember.upsert({
      where: { projectId_userId: { projectId, userId } },
      create: { projectId, userId, role },
      update: { role },
      select: { userId: true },
    });
    await logActivity(db, { projectId, userId: user.id, action: `set role to ${role.toLowerCase()} for`, entityType: "member", entityId: userId, meta: { name: target.name } });
    revalidatePath("/", "layout");
  });
}

export async function removeProjectMember(projectId: string, userId: string) {
  return runAction(async () => {
    const { user } = await requireProjectAccess(projectId, "project:manage");
    const { count } = await db.projectMember.deleteMany({ where: { projectId, userId: z.string().min(1).parse(userId) } });
    if (count > 0) {
      const target = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
      await logActivity(db, { projectId, userId: user.id, action: "removed", entityType: "member", entityId: userId, meta: { name: target?.name ?? "a member" } });
    }
    revalidatePath("/", "layout");
  });
}
