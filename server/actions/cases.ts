"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Priority } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { requireProjectAccess } from "@/lib/auth/project-access";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/db/activity";
import { ActionError, runAction } from "@/lib/utils/action";
import { normalizeRichText, plainToRichText } from "@/lib/utils/sanitize";
import { sectionPath } from "@/lib/utils/tree";
import {
  bulkCasesSchema,
  caseFormSchema,
  importRowSchema,
  normalizeTags,
  type CaseFormInput,
  type CaseSnapshot,
  type ImportRow,
} from "@/lib/validations/case";
import { getSections } from "@/server/queries/cases";

type Tx = Prisma.TransactionClient;

const SNAPSHOT_SELECT = {
  id: true,
  title: true,
  preconditions: true,
  priority: true,
  type: true,
  estimate: true,
  references: true,
  tags: true,
  section: { select: { name: true } },
  steps: { select: { action: true, expectedResult: true }, orderBy: { order: "asc" } },
} as const;

type SnapshotSource = Prisma.TestCaseGetPayload<{ select: typeof SNAPSHOT_SELECT }>;

function toSnapshot(source: SnapshotSource): CaseSnapshot {
  return {
    title: source.title,
    section: source.section.name,
    preconditions: source.preconditions,
    priority: source.priority,
    type: source.type,
    estimate: source.estimate,
    references: source.references,
    tags: source.tags,
    steps: source.steps,
  };
}

async function recordVersions(tx: Tx, caseIds: string[], changedById: string) {
  const cases = await tx.testCase.findMany({ where: { id: { in: caseIds } }, select: SNAPSHOT_SELECT });
  await tx.testCaseVersion.createMany({
    data: cases.map((source) => ({ testCaseId: source.id, changedById, snapshot: toSnapshot(source) })),
  });
}

/** Reserves `count` case numbers atomically, so concurrent creates can't collide. */
async function reserveCaseNumbers(tx: Tx, projectId: string, count: number) {
  const { nextCaseNumber } = await tx.project.update({
    where: { id: projectId },
    data: { nextCaseNumber: { increment: count } },
    select: { nextCaseNumber: true },
  });
  return nextCaseNumber - count;
}

async function assertSectionInProject(client: Tx | typeof db, projectId: string, sectionId: string) {
  const section = await client.section.findFirst({ where: { id: sectionId, projectId }, select: { id: true } });
  if (!section) throw new ActionError("That section no longer exists.");
}

function caseFields(input: CaseFormInput) {
  return {
    title: input.title,
    sectionId: input.sectionId,
    priority: input.priority,
    type: input.type,
    estimate: input.estimate,
    references: input.references || null,
    tags: normalizeTags(input.tags),
    preconditions: normalizeRichText(input.preconditions),
  };
}

export async function createCase(projectId: string, input: CaseFormInput) {
  return runAction(async () => {
    const { user } = await requireProjectAccess(projectId, "case:manage");
    const parsed = caseFormSchema.parse(input);
    await assertSectionInProject(db, projectId, parsed.sectionId);

    const created = await db.$transaction(async (tx) => {
      const caseNumber = await reserveCaseNumbers(tx, projectId, 1);
      const testCase = await tx.testCase.create({
        data: {
          ...caseFields(parsed),
          projectId,
          caseNumber,
          createdById: user.id,
          updatedById: user.id,
          steps: { create: parsed.steps.map((step, order) => ({ ...step, order })) },
        },
        select: { id: true, caseNumber: true, title: true },
      });
      await recordVersions(tx, [testCase.id], user.id);
      await logActivity(tx, { projectId, userId: user.id, action: "created", entityType: "case", entityId: testCase.id, meta: { name: `C${caseNumber} ${testCase.title}` } });
      return testCase;
    });
    revalidatePath("/", "layout");
    return { id: created.id };
  });
}

export async function updateCase(caseId: string, input: CaseFormInput, expectedUpdatedAt: string) {
  return runAction(async () => {
    const existing = await db.testCase.findUnique({ where: { id: caseId }, select: { projectId: true } });
    if (!existing) throw new ActionError("This case no longer exists.");
    const { user } = await requireProjectAccess(existing.projectId, "case:manage");
    const parsed = caseFormSchema.parse(input);
    await assertSectionInProject(db, existing.projectId, parsed.sectionId);

    const updatedAt = await db.$transaction(async (tx) => {
      const current = await tx.testCase.findUniqueOrThrow({ where: { id: caseId }, select: { ...SNAPSHOT_SELECT, caseNumber: true, sectionId: true, updatedAt: true } });
      if (current.updatedAt.toISOString() !== expectedUpdatedAt) {
        throw new ActionError("Someone else changed this case while you were editing. Your draft is kept; reload to see their changes.");
      }

      const fields = caseFields(parsed);
      const section = await tx.section.findUniqueOrThrow({ where: { id: parsed.sectionId }, select: { name: true } });
      const next: CaseSnapshot = {
        title: fields.title,
        section: section.name,
        preconditions: fields.preconditions,
        priority: fields.priority,
        type: fields.type,
        estimate: fields.estimate,
        references: fields.references,
        tags: fields.tags,
        steps: parsed.steps,
      };
      // Saving without changes shouldn't add an empty entry to the history.
      if (JSON.stringify(next) === JSON.stringify(toSnapshot(current))) return current.updatedAt;

      await tx.testStep.deleteMany({ where: { testCaseId: caseId } });
      const updated = await tx.testCase.update({
        where: { id: caseId },
        data: {
          ...fields,
          updatedById: user.id,
          steps: { create: parsed.steps.map((step, order) => ({ ...step, order })) },
        },
        select: { updatedAt: true },
      });
      await recordVersions(tx, [caseId], user.id);
      await logActivity(tx, { projectId: existing.projectId, userId: user.id, action: "updated", entityType: "case", entityId: caseId, meta: { name: `C${current.caseNumber} ${fields.title}` } });
      return updated.updatedAt;
    });
    revalidatePath("/", "layout");
    return { updatedAt: updatedAt.toISOString() };
  });
}

export async function duplicateCase(caseId: string) {
  return runAction(async () => {
    const source = await db.testCase.findUnique({
      where: { id: z.string().min(1).parse(caseId) },
      select: {
        projectId: true,
        sectionId: true,
        title: true,
        preconditions: true,
        priority: true,
        type: true,
        estimate: true,
        references: true,
        tags: true,
        steps: { select: { action: true, expectedResult: true, order: true }, orderBy: { order: "asc" } },
      },
    });
    if (!source) throw new ActionError("This case no longer exists.");
    const { user } = await requireProjectAccess(source.projectId, "case:manage");
    const { projectId, steps, title, ...rest } = source;

    const copy = await db.$transaction(async (tx) => {
      const caseNumber = await reserveCaseNumbers(tx, projectId, 1);
      const testCase = await tx.testCase.create({
        data: {
          ...rest,
          projectId,
          caseNumber,
          title: `${title.slice(0, 290)} (copy)`,
          createdById: user.id,
          updatedById: user.id,
          steps: { create: steps },
        },
        select: { id: true, title: true },
      });
      await recordVersions(tx, [testCase.id], user.id);
      await logActivity(tx, { projectId, userId: user.id, action: "duplicated", entityType: "case", entityId: testCase.id, meta: { name: `C${caseNumber} ${testCase.title}` } });
      return testCase;
    });
    revalidatePath("/", "layout");
    return { id: copy.id };
  });
}

/** Limits ids to cases that really belong to the project the permission check ran against. */
async function ownedCaseIds(client: Tx | typeof db, projectId: string, caseIds: string[]) {
  const rows = await client.testCase.findMany({ where: { id: { in: caseIds }, projectId }, select: { id: true } });
  return rows.map((row) => row.id);
}

export async function bulkMoveCases(input: { projectId: string; caseIds: string[]; sectionId: string }) {
  return runAction(async () => {
    const { projectId, caseIds, sectionId } = bulkCasesSchema.extend({ sectionId: z.string().min(1) }).parse(input);
    const { user } = await requireProjectAccess(projectId, "case:manage");
    await assertSectionInProject(db, projectId, sectionId);
    await db.$transaction(async (tx) => {
      const ids = await ownedCaseIds(tx, projectId, caseIds);
      await tx.testCase.updateMany({ where: { id: { in: ids } }, data: { sectionId, updatedById: user.id } });
      await recordVersions(tx, ids, user.id);
      await logActivity(tx, { projectId, userId: user.id, action: "moved", entityType: "case", entityId: sectionId, meta: { count: ids.length } });
    });
    revalidatePath("/", "layout");
  });
}

export async function bulkSetPriority(input: { projectId: string; caseIds: string[]; priority: Priority }) {
  return runAction(async () => {
    const { projectId, caseIds, priority } = bulkCasesSchema.extend({ priority: z.enum(Priority) }).parse(input);
    const { user } = await requireProjectAccess(projectId, "case:manage");
    await db.$transaction(async (tx) => {
      const ids = await ownedCaseIds(tx, projectId, caseIds);
      await tx.testCase.updateMany({ where: { id: { in: ids } }, data: { priority, updatedById: user.id } });
      await recordVersions(tx, ids, user.id);
      await logActivity(tx, { projectId, userId: user.id, action: `set priority to ${priority.toLowerCase()} on`, entityType: "case", entityId: projectId, meta: { count: ids.length } });
    });
    revalidatePath("/", "layout");
  });
}

export async function bulkDeleteCases(input: { projectId: string; caseIds: string[] }) {
  return runAction(async () => {
    const { projectId, caseIds } = bulkCasesSchema.parse(input);
    const { user } = await requireProjectAccess(projectId, "case:manage");
    const { count } = await db.testCase.deleteMany({ where: { id: { in: caseIds }, projectId } });
    await logActivity(db, { projectId, userId: user.id, action: "deleted", entityType: "case", entityId: projectId, meta: { count } });
    revalidatePath("/", "layout");
    return { count };
  });
}

export async function addCasesToRun(input: { projectId: string; caseIds: string[]; runId: string }) {
  return runAction(async () => {
    const { projectId, caseIds, runId } = bulkCasesSchema.extend({ runId: z.string().min(1) }).parse(input);
    const { user } = await requireProjectAccess(projectId, "run:manage");
    const run = await db.testRun.findFirst({ where: { id: runId, projectId }, select: { name: true, status: true, assignedToId: true } });
    if (!run) throw new ActionError("That run no longer exists.");
    if (run.status !== "ACTIVE") throw new ActionError("That run is closed.");

    const added = await db.$transaction(async (tx) => {
      const ids = await ownedCaseIds(tx, projectId, caseIds);
      const last = await tx.testRunCase.aggregate({ where: { runId }, _max: { order: true } });
      const start = (last._max.order ?? -1) + 1;
      const { count } = await tx.testRunCase.createMany({
        data: ids.map((testCaseId, index) => ({ runId, testCaseId, assignedToId: run.assignedToId, order: start + index })),
        skipDuplicates: true,
      });
      await logActivity(tx, { projectId, userId: user.id, action: "added cases to", entityType: "run", entityId: runId, meta: { name: run.name, count } });
      return count;
    });
    revalidatePath("/", "layout");
    return { added, skipped: caseIds.length - added, runName: run.name };
  });
}

const DEFAULT_IMPORT_SECTION = "Imported";

export async function importCases(projectId: string, input: ImportRow[]) {
  return runAction(async () => {
    const { user } = await requireProjectAccess(projectId, "case:manage");
    const rows = z.array(importRowSchema).min(1).max(500, "Import at most 500 rows per batch").parse(input);
    const sections = await getSections(projectId);

    return db.$transaction(
      async (tx) => {
        // Sections named in the file are matched by path, and created when they don't exist yet.
        const byPath = new Map(sections.map((section) => [sectionPath(sections, section.id).toLowerCase(), section.id]));

        const resolveSection = async (path: string) => {
          const parts = (path || DEFAULT_IMPORT_SECTION).split(">").map((part) => part.trim()).filter(Boolean);
          let parentId: string | null = null;
          let key = "";
          for (const part of parts.length ? parts : [DEFAULT_IMPORT_SECTION]) {
            key = key ? `${key} > ${part.toLowerCase()}` : part.toLowerCase();
            let id: string | undefined = byPath.get(key);
            if (!id) {
              const order: number = await tx.section.count({ where: { projectId, parentId } });
              const created: { id: string } = await tx.section.create({ data: { projectId, parentId, name: part.slice(0, 120), order }, select: { id: true } });
              id = created.id;
              byPath.set(key, id);
            }
            parentId = id;
          }
          return parentId as string;
        };

        const sectionIds: string[] = [];
        for (const row of rows) sectionIds.push(await resolveSection(row.section));

        const firstNumber = await reserveCaseNumbers(tx, projectId, rows.length);
        const created = await tx.testCase.createManyAndReturn({
          data: rows.map((row, index) => ({
            projectId,
            sectionId: sectionIds[index] as string,
            caseNumber: firstNumber + index,
            title: row.title,
            preconditions: row.preconditions ? normalizeRichText(plainToRichText(row.preconditions)) : null,
            priority: row.priority,
            type: row.type,
            estimate: row.estimate,
            references: row.references || null,
            tags: normalizeTags(row.tags),
            createdById: user.id,
            updatedById: user.id,
          })),
          select: { id: true, caseNumber: true },
        });

        const idByNumber = new Map(created.map((testCase) => [testCase.caseNumber, testCase.id]));
        await tx.testStep.createMany({
          data: rows.flatMap((row, index) =>
            row.steps.map((step, order) => ({ ...step, order, testCaseId: idByNumber.get(firstNumber + index) as string })),
          ),
        });
        await recordVersions(tx, created.map((testCase) => testCase.id), user.id);
        await logActivity(tx, { projectId, userId: user.id, action: "imported", entityType: "case", entityId: projectId, meta: { count: created.length } });
        revalidatePath("/", "layout");
        return { imported: created.length };
      },
      { timeout: 30000 },
    );
  });
}
