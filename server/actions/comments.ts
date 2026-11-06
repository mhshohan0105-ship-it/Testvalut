"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProjectAccess } from "@/lib/auth/project-access";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { ActionError, runAction } from "@/lib/utils/action";

const body = z.string().trim().min(1, "Write a comment first").max(5000, "Keep it under 5000 characters");

export async function addCaseComment(caseId: string, input: string) {
  return runAction(async () => {
    const testCase = await db.testCase.findUnique({ where: { id: caseId }, select: { projectId: true } });
    if (!testCase) throw new ActionError("This case no longer exists.");
    const { user } = await requireProjectAccess(testCase.projectId, "comment:create");
    const comment = await db.comment.create({
      data: { testCaseId: caseId, authorId: user.id, body: body.parse(input) },
      select: { id: true, body: true, createdAt: true },
    });
    revalidatePath(`/cases/${caseId}`);
    return { id: comment.id, body: comment.body, createdAt: comment.createdAt.toISOString(), authorId: user.id, authorName: user.name };
  });
}

export async function deleteCaseComment(commentId: string) {
  return runAction(async () => {
    const comment = await db.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true, testCaseId: true, testCase: { select: { projectId: true } } },
    });
    if (!comment?.testCase) throw new ActionError("That comment no longer exists.");
    const { user, role } = await requireProjectAccess(comment.testCase.projectId);
    if (comment.authorId !== user.id && !hasPermission(role, "case:manage")) throw new ActionError("You can only delete your own comments.");
    await db.comment.delete({ where: { id: commentId }, select: { id: true } });
    revalidatePath(`/cases/${comment.testCaseId}`);
  });
}
