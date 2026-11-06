"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { requireProjectAccess } from "@/lib/auth/project-access";
import type { Permission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/db/activity";
import { ActionError, runAction } from "@/lib/utils/action";
import { flattenSections, sectionSubtreeIds } from "@/lib/utils/tree";
import {
  reassignSchema,
  recordResultSchema,
  runFormSchema,
  runSelectionSchema,
  type RecordResultInput,
  type RunFormInput,
  type RunSelection,
} from "@/lib/validations/run";
import { getSections } from "@/server/queries/cases";
import { getAssignableUsers } from "@/server/queries/runs";

const id = z.string().min(1);

/** Loads a run the caller may act on. Closed runs are read only, so writes are refused here. */
async function requireActiveRun(runId: string, permission: Permission) {
  const run = await db.testRun.findUnique({ where: { id: id.parse(runId) }, select: { id: true, projectId: true, name: true, status: true } });
  if (!run) throw new ActionError("This run no longer exists.");
  const access = await requireProjectAccess(run.projectId, permission);
  if (run.status !== "ACTIVE") throw new ActionError("This run is closed and read only.");
  return { run, ...access };
}

export async function createRun(projectId: string, form: RunFormInput, selectionInput: RunSelection) {
  return runAction(async () => {
    const { user } = await requireProjectAccess(projectId, "run:manage");
    const values = runFormSchema.parse(form);
    const selection = runSelectionSchema.parse(selectionInput);

    if (values.milestoneId) {
      const milestone = await db.milestone.findFirst({ where: { id: values.milestoneId, projectId }, select: { id: true } });
      if (!milestone) throw new ActionError("That milestone no longer exists.");
    }
    const assignable = await getAssignableUsers(projectId);
    if (values.assignedToId && !assignable.some((person) => person.id === values.assignedToId)) {
      throw new ActionError("That person can't be assigned in this project.");
    }

    const sections = await getSections(projectId);
    const conditions: Prisma.TestCaseWhereInput[] = [];
    if (!selection.includeAll) {
      const sectionIds = selection.sectionIds.flatMap((sectionId) => sectionSubtreeIds(sections, sectionId));
      conditions.push({ OR: [{ sectionId: { in: sectionIds } }, { id: { in: selection.caseIds } }] });
    }
    if (selection.priorities.length) conditions.push({ priority: { in: selection.priorities } });
    if (selection.excludedCaseIds.length) conditions.push({ id: { notIn: selection.excludedCaseIds } });

    const cases = await db.testCase.findMany({
      where: { projectId, AND: conditions },
      select: { id: true, sectionId: true, order: true, caseNumber: true },
    });
    if (cases.length === 0) throw new ActionError("Select at least one case for this run.");

    // Cases run in the same order they appear in the repository.
    const sectionRank = new Map(flattenSections(sections).map(({ item }, index) => [item.id, index]));
    cases.sort(
      (a, b) => (sectionRank.get(a.sectionId) ?? 0) - (sectionRank.get(b.sectionId) ?? 0) || a.order - b.order || a.caseNumber - b.caseNumber,
    );

    const assignedToId = values.assignedToId || null;
    const run = await db.$transaction(async (tx) => {
      const created = await tx.testRun.create({
        data: {
          projectId,
          name: values.name,
          description: values.description || null,
          environment: values.environment || null,
          milestoneId: values.milestoneId || null,
          assignedToId,
          createdById: user.id,
        },
        select: { id: true },
      });
      await tx.testRunCase.createMany({
        data: cases.map((testCase, order) => ({ runId: created.id, testCaseId: testCase.id, assignedToId, order })),
      });
      await logActivity(tx, { projectId, userId: user.id, action: "created", entityType: "run", entityId: created.id, meta: { name: values.name, count: cases.length } });
      return created;
    });
    revalidatePath("/", "layout");
    return { id: run.id };
  });
}

export async function recordResult(input: RecordResultInput) {
  return runAction(async () => {
    const values = recordResultSchema.parse(input);
    const runCase = await db.testRunCase.findUnique({
      where: { id: values.runCaseId },
      select: { runId: true, testCase: { select: { caseNumber: true, title: true } } },
    });
    if (!runCase) throw new ActionError("This case is no longer in the run.");
    const { user, run } = await requireActiveRun(runCase.runId, "result:create");

    await db.$transaction(async (tx) => {
      await tx.testResult.create({
        data: {
          runCaseId: values.runCaseId,
          status: values.status,
          comment: values.comment || null,
          actualResult: values.actualResult || null,
          defectRef: values.defectRef || null,
          elapsedSeconds: values.elapsedSeconds,
          stepResults: values.stepResults.length ? values.stepResults : undefined,
          createdById: user.id,
        },
        select: { id: true },
      });
      await tx.testRunCase.update({ where: { id: values.runCaseId }, data: { currentStatus: values.status }, select: { id: true } });
      // Passes would flood the feed, so only results that need attention are logged.
      if (values.status === "FAILED" || values.status === "BLOCKED") {
        await logActivity(tx, {
          projectId: run.projectId,
          userId: user.id,
          action: values.status === "FAILED" ? "failed" : "blocked",
          entityType: "case",
          entityId: values.runCaseId,
          meta: { name: `C${runCase.testCase.caseNumber} ${runCase.testCase.title}`, run: run.name },
        });
      }
    });
    // No revalidatePath: execution stays instant, and the overview refetches when it opens.
  });
}

export async function reassignRunCases(input: z.infer<typeof reassignSchema>) {
  return runAction(async () => {
    const { runId, runCaseIds, assignedToId } = reassignSchema.parse(input);
    const { run, user } = await requireActiveRun(runId, "run:manage");
    if (assignedToId) {
      const assignable = await getAssignableUsers(run.projectId);
      if (!assignable.some((person) => person.id === assignedToId)) throw new ActionError("That person can't be assigned in this project.");
    }
    const { count } = await db.testRunCase.updateMany({ where: { id: { in: runCaseIds }, runId }, data: { assignedToId } });
    await logActivity(db, { projectId: run.projectId, userId: user.id, action: "reassigned cases in", entityType: "run", entityId: runId, meta: { name: run.name, count } });
    return { count };
  });
}

export async function closeRun(runId: string) {
  return runAction(async () => {
    const { run, user } = await requireActiveRun(runId, "run:manage");
    await db.testRun.update({ where: { id: runId }, data: { status: "COMPLETED", closedAt: new Date() }, select: { id: true } });
    await logActivity(db, { projectId: run.projectId, userId: user.id, action: "closed", entityType: "run", entityId: runId, meta: { name: run.name } });
    revalidatePath("/", "layout");
  });
}

/** Works on closed runs too, because retesting failures is the usual next step after closing one. */
export async function rerunFailed(runId: string) {
  return runAction(async () => {
    const source = await db.testRun.findUnique({
      where: { id: id.parse(runId) },
      select: { projectId: true, milestoneId: true, name: true, description: true, environment: true, assignedToId: true },
    });
    if (!source) throw new ActionError("This run no longer exists.");
    const { user } = await requireProjectAccess(source.projectId, "run:manage");

    const failures = await db.testRunCase.findMany({
      where: { runId, currentStatus: { in: ["FAILED", "BLOCKED"] } },
      select: { testCaseId: true, assignedToId: true },
      orderBy: { order: "asc" },
    });
    if (failures.length === 0) throw new ActionError("This run has no failed or blocked cases to rerun.");

    const created = await db.$transaction(async (tx) => {
      const run = await tx.testRun.create({
        data: {
          projectId: source.projectId,
          milestoneId: source.milestoneId,
          name: `${source.name.slice(0, 180)} (Rerun)`,
          description: source.description,
          environment: source.environment,
          assignedToId: source.assignedToId,
          createdById: user.id,
        },
        select: { id: true, name: true },
      });
      await tx.testRunCase.createMany({
        data: failures.map((failure, order) => ({ runId: run.id, testCaseId: failure.testCaseId, assignedToId: failure.assignedToId, order })),
      });
      await logActivity(tx, { projectId: source.projectId, userId: user.id, action: "created", entityType: "run", entityId: run.id, meta: { name: run.name, count: failures.length } });
      return run;
    });
    revalidatePath("/", "layout");
    return { id: created.id, count: failures.length };
  });
}
