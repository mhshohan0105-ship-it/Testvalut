import "server-only";
import { db } from "@/lib/db";
import type { BugStatus, Prisma } from "@/generated/prisma/client";
import { ATTACHMENT_SELECT } from "@/lib/db/attachments";
import type { BugQuery } from "@/lib/validations/bug-query";

export const BUG_PAGE_SIZE = 100;
export const UNASSIGNED = "none";

function buildWhere(projectId: string, query: BugQuery): Prisma.BugWhereInput {
  const where: Prisma.BugWhereInput = { projectId };
  if (query.status === "ACTIVE") where.status = { in: ["OPEN", "IN_PROGRESS"] };
  else if (query.status !== "ALL") where.status = query.status as BugStatus;
  if (query.severity) where.severity = query.severity;
  if (query.assignee) where.assignedToId = query.assignee === UNASSIGNED ? null : query.assignee;
  if (query.q) {
    const number = /^b?(\d{1,9})$/i.exec(query.q)?.[1];
    where.OR = [{ title: { contains: query.q, mode: "insensitive" } }, ...(number ? [{ bugNumber: Number(number) }] : [])];
  }
  return where;
}

export async function listBugs(projectId: string, query: BugQuery, cursor?: string) {
  const where = buildWhere(projectId, query);
  const [rows, total] = await Promise.all([
    db.bug.findMany({
      where,
      select: { id: true, bugNumber: true, title: true, severity: true, status: true, assignedToId: true, createdAt: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: BUG_PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }),
    cursor ? Promise.resolve(null) : db.bug.count({ where }),
  ]);
  const page = rows.slice(0, BUG_PAGE_SIZE);
  return {
    rows: page.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    nextCursor: rows.length > BUG_PAGE_SIZE ? (page[page.length - 1]?.id ?? null) : null,
    total,
  };
}

export type BugRow = Awaited<ReturnType<typeof listBugs>>["rows"][number];

export async function listBugsForExport(projectId: string, query: BugQuery) {
  return db.bug.findMany({
    where: buildWhere(projectId, query),
    select: {
      bugNumber: true,
      title: true,
      severity: true,
      status: true,
      environment: true,
      externalRef: true,
      description: true,
      stepsToReproduce: true,
      expectedResult: true,
      actualResult: true,
      createdAt: true,
      resolvedAt: true,
      assignedTo: { select: { name: true } },
      reportedBy: { select: { name: true } },
      testCase: { select: { caseNumber: true } },
    },
    orderBy: { bugNumber: "asc" },
  });
}

export async function getBug(bugId: string) {
  return db.bug.findUnique({
    where: { id: bugId },
    select: {
      id: true,
      projectId: true,
      bugNumber: true,
      title: true,
      description: true,
      stepsToReproduce: true,
      expectedResult: true,
      actualResult: true,
      severity: true,
      status: true,
      environment: true,
      externalRef: true,
      assignedToId: true,
      resolvedAt: true,
      createdAt: true,
      updatedAt: true,
      reportedBy: { select: { name: true } },
      testCase: { select: { id: true, caseNumber: true, title: true } },
      runCase: { select: { id: true, run: { select: { id: true, name: true } } } },
      attachments: { select: ATTACHMENT_SELECT, orderBy: { createdAt: "asc" } },
    },
  });
}

export async function getBugComments(bugId: string) {
  const rows = await db.comment.findMany({
    where: { bugId },
    select: { id: true, body: true, createdAt: true, authorId: true, author: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return rows.map((row) => ({ id: row.id, body: row.body, createdAt: row.createdAt.toISOString(), authorId: row.authorId, authorName: row.author.name }));
}

export async function getBugActivity(bugId: string) {
  return db.activityLog.findMany({
    where: { entityType: "bug", entityId: bugId },
    select: { id: true, action: true, createdAt: true, user: { select: { name: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
  });
}

export async function getCaseBugs(caseId: string) {
  return db.bug.findMany({
    where: { testCaseId: caseId },
    select: { id: true, bugNumber: true, title: true, severity: true, status: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

/** Details to start a bug report with, when it's opened from a test case or a run. */
export async function getBugPrefill(input: { runCaseId?: string; caseId?: string }) {
  if (input.runCaseId) {
    const runCase = await db.testRunCase.findUnique({
      where: { id: input.runCaseId },
      select: {
        id: true,
        testCaseId: true,
        run: { select: { projectId: true, environment: true } },
        testCase: { select: { caseNumber: true, title: true, priority: true, steps: { select: { action: true, expectedResult: true }, orderBy: { order: "asc" } } } },
        results: { select: { actualResult: true, defectRef: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!runCase) return null;
    return {
      projectId: runCase.run.projectId,
      testCaseId: runCase.testCaseId,
      runCaseId: runCase.id,
      caseLabel: `C${runCase.testCase.caseNumber}`,
      title: runCase.testCase.title,
      severity: runCase.testCase.priority,
      environment: runCase.run.environment ?? "",
      externalRef: runCase.results[0]?.defectRef ?? "",
      actualResult: runCase.results[0]?.actualResult ?? "",
      steps: runCase.testCase.steps,
    };
  }
  if (input.caseId) {
    const testCase = await db.testCase.findUnique({
      where: { id: input.caseId },
      select: { id: true, projectId: true, caseNumber: true, title: true, priority: true, steps: { select: { action: true, expectedResult: true }, orderBy: { order: "asc" } } },
    });
    if (!testCase) return null;
    return {
      projectId: testCase.projectId,
      testCaseId: testCase.id,
      runCaseId: null,
      caseLabel: `C${testCase.caseNumber}`,
      title: testCase.title,
      severity: testCase.priority,
      environment: "",
      externalRef: "",
      actualResult: "",
      steps: testCase.steps,
    };
  }
  return null;
}
