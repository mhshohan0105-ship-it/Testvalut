"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";
import { requirePermission, requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ActionError, runAction } from "@/lib/utils/action";
import { addUserSchema, changePasswordSchema, type AddUserInput, type ChangePasswordInput } from "@/lib/validations/team";

/** Workspaces must always keep someone who can manage them. */
async function assertAnotherAdminRemains(userId: string) {
  const others = await db.user.count({ where: { role: "ADMIN", deactivatedAt: null, id: { not: userId } } });
  if (others === 0) throw new ActionError("This is the only active admin. Make someone else an admin first.");
}

/** There's no email service, so the admin hands over a one-time password that's shown only here. */
export async function addUser(input: AddUserInput) {
  return runAction(async () => {
    await requirePermission("team:manage");
    const { name, email, role } = addUserSchema.parse(input);
    const temporaryPassword = randomBytes(9).toString("base64url");
    try {
      const user = await db.user.create({
        data: { name, email, role, passwordHash: await bcrypt.hash(temporaryPassword, 12) },
        select: { id: true },
      });
      revalidatePath("/team");
      return { id: user.id, temporaryPassword };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ActionError("An account with that email already exists.");
      throw error;
    }
  });
}

export async function setUserRole(userId: string, roleInput: Role) {
  return runAction(async () => {
    await requirePermission("team:manage");
    const role = z.enum(Role).parse(roleInput);
    const target = await db.user.findUnique({ where: { id: z.string().min(1).parse(userId) }, select: { role: true } });
    if (!target) throw new ActionError("That user no longer exists.");
    if (target.role === "ADMIN" && role !== "ADMIN") await assertAnotherAdminRemains(userId);
    await db.user.update({ where: { id: userId }, data: { role }, select: { id: true } });
    revalidatePath("/team");
  });
}

export async function setUserActive(userId: string, active: boolean) {
  return runAction(async () => {
    const admin = await requirePermission("team:manage");
    if (userId === admin.id && !active) throw new ActionError("You can't deactivate your own account.");
    const target = await db.user.findUnique({ where: { id: z.string().min(1).parse(userId) }, select: { role: true } });
    if (!target) throw new ActionError("That user no longer exists.");
    if (!active && target.role === "ADMIN") await assertAnotherAdminRemains(userId);
    await db.user.update({ where: { id: userId }, data: { deactivatedAt: z.boolean().parse(active) ? null : new Date() }, select: { id: true } });
    revalidatePath("/team");
  });
}

export async function changeOwnPassword(input: ChangePasswordInput) {
  return runAction(async () => {
    const user = await requireUser();
    const { currentPassword, newPassword } = changePasswordSchema.parse(input);
    const record = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
    if (!(await bcrypt.compare(currentPassword, record.passwordHash))) throw new ActionError("Your current password isn't right.");
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) }, select: { id: true } });
  });
}
