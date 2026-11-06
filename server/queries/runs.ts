import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { RunStatus, TestStatus } from "@/generated/prisma/enums";
import type { StatusCounts } from "@/lib/constants/status";
import { sanitizeRichText } from "@/lib/utils/sanitize";
import { getSections } from "./cases";

const RUN_PAGE_SIZE = 20;
export const RUN_CASE_PAGE_SIZE = 100;
export const UNASSIGNED = "none";

export async function getRunList(projectId: string, status: RunStatus, cursor?: string) {
  const rows = await db.testRun.findMany({
    where: { projectId, status },
    select: {
      id: true,
      name: true,
      environment: true,
      status: true,
      createdAt: true,
      closedAt: true,
      milestone: { select: { name: true } },
      assignedTo: { select: { name: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: RUN_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = rows.slice(0, RUN_PAGE_SIZE);

  const groups = await db.testRunCase.groupBy({
    by: ["runId", "currentStatus"],
    where: { runId: { in: page.map((run) => run.id) } },
    _count: { _all: true },
  });
  const countsByRun = new Map<string, StatusCounts>();
  for (const group of groups) {
    const counts = countsByRun.get(group.runId) ?? {};
    counts[group.currentStatus] = group._count._all;
    countsByRun.set(group.runId, counts);
  }

  return {
    rows: page.map((run) => ({ ...run, counts: countsByRun.get(run.id) ?? {} })),
    nextCursor: rows.length > RUN_PAGE_SIZE ? page[page.length - 1]?.id : undefined,
  };
}

export async function getRun(runId: string) {
  return db.testRun.findUnique({
    where: { id: runId },
    select: {
      id: true,
      projectId: true,
      name: true,
      description: true,
      environment: true,
      status: true,
      createdAt: true,
      closedAt: true,
      milestone: { select: { id: true, name: true } },
      assignedTo: { select: { name: true } },
    },
  });
}

export async function getRunStatusCounts(runId: string): Promise<StatusCounts> {
  const groups = await db.testRunCase.groupBy({ by: ["currentStatus"], where: { runId }, _count: { _all: true } });
  const counts: StatusCounts = {};
  for (const group of groups) counts[group.currentStatus] = group._count._all;
  return counts;
}

export type RunCaseFilter = { status: TestStatus | null; assignee: string | null };

export async function listRunCases(runId: string, filter: RunCaseFilter, cursor?: string) {
  const where: Prisma.TestRunCaseWhereInput = { runId };
  if (filter.status) where.currentStatus = filter.status;
  if (filter.assignee) where.assignedToId = filter.assignee === UNASSIGNED ? null : filter.assignee;

  const [rows, total] = await Promise.all([
    db.testRunCase.findMany({
      where,
      select: {
        id: true,
        currentStatus: true,
        assignedToId: true,
        testCase: { select: { caseNumber: true, title: true, priority: true } },
      },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      take: RUN_CASE_PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }),
    cursor ? Promise.resolve(null) : db.testRunCase.count({ where }),
  ]);
  const page = rows.slice(0, RUN_CASE_PAGE_SIZE);
  return {
    rows: page.map((row) => ({
      id: row.id,
      status: row.currentStatus,
      assignedToId: row.assignedToId,
      caseNumber: row.testCase.caseNumber,
      title: row.testCase.title,
      priority: row.testCase.priority,
    })),
    nextCursor: rows.length > RUN_CASE_PAGE_SIZE ? (page[page.length - 1]?.id ?? null) : null,
    total,
  };
}

export type RunCaseRow = Awaited<ReturnType<typeof listRunCases>>["rows"][number];

/** A compact index of the whole run: execution mode needs it to find the next case instantly. */
export async function getRunQueue(runId: string) {
  const rows = await db.testRunCase.findMany({
    where: { runId },
    select: { id: true, currentStatus: true },
    orderBy: [{ order: "asc" }, { id: "asc" }],
  });
  return rows.map((row) => ({ id: row.id, status: row.currentStatus }));
}

export async function getRunCaseDetail(runId: string, runCaseId: string) {
  const row = await db.testRunCase.findFirst({
    where: { id: runCaseId, runId },
    select: {
      id: true,
      currentStatus: true,
      assignedTo: { select: { name: true } },
      testCase: {
        select: {
          id: true,
          caseNumber: true,
          title: true,
          preconditions: true,
          priority: true,
          type: true,
          estimate: true,
          references: true,
          tags: true,
          steps: { select: { id: true, action: true, expectedResult: true }, orderBy: { order: "asc" } },
        },
      },
      results: {
        select: {
          id: true,
          status: true,
          comment: true,
          actualResult: true,
          defectRef: true,
          elapsedSeconds: true,
          stepResults: true,
          createdAt: true,
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
  if (!row) return null;
  return {
    ...row,
    testCase: { ...row.testCase, preconditions: row.testCase.preconditions ? sanitizeRichText(row.testCase.preconditions) : null },
    results: row.results.map((result) => ({ ...result, createdAt: result.createdAt.toISOString() })),
  };
}

export type RunCaseDetail = NonNullable<Awaited<ReturnType<typeof getRunCaseDetail>>>;

/** People who can run tests in this project: viewers can't record results, so they aren't offered. */
export async function getAssignableUsers(projectId: string) {
  const members = await db.projectMember.findMany({
    where: { projectId, role: { not: "VIEWER" }, user: { deactivatedAt: null } },
    select: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return members.map((member) => member.user);
}

export async function getMilestoneOptions(projectId: string) {
  return db.milestone.findMany({
    where: { projectId, completed: false },
    select: { id: true, name: true },
    orderBy: [{ dueDate: "asc" }, { name: "asc" }],
  });
}

export async function getRunPickerData(projectId: string) {
  const [sections, groups] = await Promise.all([
    getSections(projectId),
    db.testCase.groupBy({ by: ["sectionId", "priority"], where: { projectId }, _count: { _all: true } }),
  ]);
  return {
    sections,
    priorityCounts: groups.map((group) => ({ sectionId: group.sectionId, priority: group.priority, count: group._count._all })),
  };
}
