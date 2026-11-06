import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { ATTACHMENT_SELECT } from "@/lib/db/attachments";
import { sectionSubtreeIds, type SectionItem } from "@/lib/utils/tree";
import { caseSnapshotSchema, type CaseSnapshot } from "@/lib/validations/case";
import type { CaseQuery } from "@/lib/validations/case-query";

export const CASE_PAGE_SIZE = 100;

export async function getSections(projectId: string): Promise<SectionItem[]> {
  return db.section.findMany({
    where: { projectId },
    select: { id: true, parentId: true, name: true, order: true },
    orderBy: { order: "asc" },
  });
}

export async function getSectionsWithCounts(projectId: string) {
  const [sections, groups] = await Promise.all([
    getSections(projectId),
    db.testCase.groupBy({ by: ["sectionId"], where: { projectId }, _count: { _all: true } }),
  ]);
  const counts: Record<string, number> = {};
  for (const group of groups) counts[group.sectionId] = group._count._all;
  return { sections, counts };
}

export async function getProjectTags(projectId: string) {
  const rows = await db.$queryRaw<{ tag: string }[]>`
    SELECT DISTINCT unnest(tags) AS tag FROM "TestCase" WHERE "projectId" = ${projectId} ORDER BY tag LIMIT 300`;
  return rows.map((row) => row.tag);
}

async function buildWhere(projectId: string, query: CaseQuery): Promise<Prisma.TestCaseWhereInput> {
  const where: Prisma.TestCaseWhereInput = { projectId };
  if (query.section) {
    where.sectionId = { in: sectionSubtreeIds(await getSections(projectId), query.section) };
  }
  if (query.priorities.length) where.priority = { in: query.priorities };
  if (query.types.length) where.type = { in: query.types };
  if (query.tags.length) where.tags = { hasSome: query.tags };
  if (query.q) {
    const number = /^c?(\d{1,9})$/i.exec(query.q)?.[1];
    where.OR = [{ title: { contains: query.q, mode: "insensitive" } }, ...(number ? [{ caseNumber: Number(number) }] : [])];
  }
  return where;
}

export async function listCases(projectId: string, query: CaseQuery, cursor?: string) {
  const where = await buildWhere(projectId, query);
  const [rows, total] = await Promise.all([
    db.testCase.findMany({
      where,
      select: { id: true, caseNumber: true, title: true, priority: true, type: true, tags: true, sectionId: true, updatedAt: true },
      // The id tie-break keeps pages stable when many rows share a sort value.
      orderBy: [{ [query.sort]: query.dir }, { id: query.dir }],
      take: CASE_PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }),
    cursor ? Promise.resolve(null) : db.testCase.count({ where }),
  ]);
  const page = rows.slice(0, CASE_PAGE_SIZE);
  return {
    rows: page.map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() })),
    nextCursor: rows.length > CASE_PAGE_SIZE ? (page[page.length - 1]?.id ?? null) : null,
    total,
  };
}

export type CaseRow = Awaited<ReturnType<typeof listCases>>["rows"][number];

export async function listCasesForExport(projectId: string, query: CaseQuery) {
  return db.testCase.findMany({
    where: await buildWhere(projectId, query),
    select: {
      caseNumber: true,
      title: true,
      sectionId: true,
      priority: true,
      type: true,
      estimate: true,
      references: true,
      tags: true,
      preconditions: true,
      steps: { select: { action: true, expectedResult: true }, orderBy: { order: "asc" } },
    },
    orderBy: { caseNumber: "asc" },
  });
}

export async function getCaseForEditor(caseId: string) {
  return db.testCase.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      projectId: true,
      caseNumber: true,
      title: true,
      sectionId: true,
      priority: true,
      type: true,
      estimate: true,
      references: true,
      tags: true,
      preconditions: true,
      updatedAt: true,
      steps: { select: { action: true, expectedResult: true }, orderBy: { order: "asc" } },
    },
  });
}

export async function getCaseDetail(caseId: string) {
  return db.testCase.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      projectId: true,
      caseNumber: true,
      title: true,
      sectionId: true,
      priority: true,
      type: true,
      estimate: true,
      references: true,
      tags: true,
      preconditions: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { name: true } },
      updatedBy: { select: { name: true } },
      steps: { select: { id: true, action: true, expectedResult: true }, orderBy: { order: "asc" } },
    },
  });
}

const VERSION_LIMIT = 50;

/** Newest first. Each version carries the one before it, so the page can show what changed. */
export async function getCaseVersions(caseId: string) {
  const rows = await db.testCaseVersion.findMany({
    where: { testCaseId: caseId },
    select: { id: true, snapshot: true, createdAt: true, changedBy: { select: { name: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: VERSION_LIMIT + 1,
  });
  const parsed = rows.map((row) => ({ ...row, snapshot: parseSnapshot(row.snapshot) }));
  return parsed.slice(0, VERSION_LIMIT).map((row, index) => ({ ...row, previous: parsed[index + 1]?.snapshot ?? null }));
}

function parseSnapshot(value: unknown): CaseSnapshot | null {
  const result = caseSnapshotSchema.safeParse(value);
  return result.success ? result.data : null;
}

const RESULT_PAGE_SIZE = 25;

export async function getCaseResults(caseId: string, cursor?: string) {
  const rows = await db.testResult.findMany({
    where: { runCase: { testCaseId: caseId } },
    select: {
      id: true,
      status: true,
      comment: true,
      actualResult: true,
      elapsedSeconds: true,
      defectRef: true,
      createdAt: true,
      createdBy: { select: { name: true } },
      attachments: { select: ATTACHMENT_SELECT, orderBy: { createdAt: "asc" } },
      runCase: { select: { run: { select: { id: true, name: true, environment: true } } } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: RESULT_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = rows.slice(0, RESULT_PAGE_SIZE);
  return { rows: page, nextCursor: rows.length > RESULT_PAGE_SIZE ? page[page.length - 1]?.id : undefined };
}

export async function getCaseAttachments(caseId: string) {
  return db.attachment.findMany({ where: { testCaseId: caseId }, select: ATTACHMENT_SELECT, orderBy: { createdAt: "asc" } });
}

export async function getCaseComments(caseId: string) {
  const rows = await db.comment.findMany({
    where: { testCaseId: caseId },
    select: { id: true, body: true, createdAt: true, authorId: true, author: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return rows.map((row) => ({ id: row.id, body: row.body, createdAt: row.createdAt.toISOString(), authorId: row.authorId, authorName: row.author.name }));
}

export async function getActiveRunOptions(projectId: string) {
  return db.testRun.findMany({
    where: { projectId, status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });
}
