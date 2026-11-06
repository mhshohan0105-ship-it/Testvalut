import "server-only";
import { db } from "@/lib/db";
import type { BugStatus, CaseType, Priority, TestStatus } from "@/generated/prisma/enums";
import type { StatusCounts } from "@/lib/constants/status";
import { BUG_STATUSES, CASE_TYPES, PRIORITIES } from "@/lib/constants/testing";
import type { DateRange } from "@/lib/utils/date-range";

const LIST_LIMIT = 10;

/** The extra project report sections: coverage, timing, people, runs, defects and bugs. */
export async function getProjectInsights(projectId: string, range: DateRange) {
  const [statusRows, timing, testers, totalCases, executed, neverExecuted, typeGroups, defects, runs, bugStatusGroups, bugSeverityGroups, bugsOpened, bugsResolved] = await Promise.all([
    db.$queryRaw<{ status: TestStatus; count: bigint }[]>`
      SELECT res.status, COUNT(*) AS count
      FROM "TestResult" res
      JOIN "TestRunCase" rc ON rc.id = res."runCaseId"
      JOIN "TestRun" r ON r.id = rc."runId"
      WHERE r."projectId" = ${projectId} AND res."createdAt" >= ${range.start} AND res."createdAt" < ${range.end}
      GROUP BY res.status`,
    db.$queryRaw<{ average: number | null; total: bigint | null }[]>`
      SELECT AVG(res."elapsedSeconds")::float AS average, SUM(res."elapsedSeconds") AS total
      FROM "TestResult" res
      JOIN "TestRunCase" rc ON rc.id = res."runCaseId"
      JOIN "TestRun" r ON r.id = rc."runId"
      WHERE r."projectId" = ${projectId} AND res."createdAt" >= ${range.start} AND res."createdAt" < ${range.end}`,
    db.$queryRaw<{ name: string; total: bigint; passed: bigint; failed: bigint; seconds: bigint | null }[]>`
      SELECT u.name, COUNT(*) AS total,
             COUNT(*) FILTER (WHERE res.status = 'PASSED') AS passed,
             COUNT(*) FILTER (WHERE res.status = 'FAILED') AS failed,
             SUM(res."elapsedSeconds") AS seconds
      FROM "TestResult" res
      JOIN "TestRunCase" rc ON rc.id = res."runCaseId"
      JOIN "TestRun" r ON r.id = rc."runId"
      JOIN "User" u ON u.id = res."createdById"
      WHERE r."projectId" = ${projectId} AND res."createdAt" >= ${range.start} AND res."createdAt" < ${range.end}
      GROUP BY u.id, u.name
      ORDER BY total DESC
      LIMIT ${LIST_LIMIT}`,
    db.testCase.count({ where: { projectId } }),
    db.testCase.count({ where: { projectId, runCases: { some: { results: { some: { createdAt: { gte: range.start, lt: range.end } } } } } } }),
    db.testCase.findMany({
      where: { projectId, runCases: { none: { results: { some: { createdAt: { gte: range.start, lt: range.end } } } } } },
      select: { id: true, caseNumber: true, title: true, priority: true },
      orderBy: [{ priority: "asc" }, { caseNumber: "asc" }],
      take: LIST_LIMIT,
    }),
    db.testCase.groupBy({ by: ["type"], where: { projectId }, _count: { _all: true } }),
    db.$queryRaw<{ defect: string; count: bigint; last: Date }[]>`
      SELECT res."defectRef" AS defect, COUNT(*) AS count, MAX(res."createdAt") AS last
      FROM "TestResult" res
      JOIN "TestRunCase" rc ON rc.id = res."runCaseId"
      JOIN "TestRun" r ON r.id = rc."runId"
      WHERE r."projectId" = ${projectId} AND res."defectRef" IS NOT NULL AND res."createdAt" >= ${range.start} AND res."createdAt" < ${range.end}
      GROUP BY res."defectRef"
      ORDER BY count DESC, last DESC
      LIMIT ${LIST_LIMIT}`,
    db.testRun.findMany({
      where: { projectId, createdAt: { lt: range.end }, OR: [{ closedAt: null }, { closedAt: { gte: range.start } }] },
      select: { id: true, name: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: LIST_LIMIT,
    }),
    db.bug.groupBy({ by: ["status"], where: { projectId }, _count: { _all: true } }),
    db.bug.groupBy({ by: ["severity"], where: { projectId, status: { in: ["OPEN", "IN_PROGRESS"] } }, _count: { _all: true } }),
    db.bug.count({ where: { projectId, createdAt: { gte: range.start, lt: range.end } } }),
    db.bug.count({ where: { projectId, resolvedAt: { gte: range.start, lt: range.end } } }),
  ]);

  const runGroups = await db.testRunCase.groupBy({
    by: ["runId", "currentStatus"],
    where: { runId: { in: runs.map((run) => run.id) } },
    _count: { _all: true },
  });
  const runCounts = new Map<string, StatusCounts>();
  for (const group of runGroups) {
    const counts = runCounts.get(group.runId) ?? {};
    counts[group.currentStatus] = group._count._all;
    runCounts.set(group.runId, counts);
  }

  const statusCounts: StatusCounts = {};
  for (const row of statusRows) statusCounts[row.status] = Number(row.count);

  return {
    statusCounts,
    averageSeconds: timing[0]?.average === null || timing[0]?.average === undefined ? null : Math.round(timing[0].average),
    totalSeconds: Number(timing[0]?.total ?? 0),
    totalCases,
    executedCases: executed,
    coverage: totalCases === 0 ? null : Math.round((executed / totalCases) * 100),
    neverExecuted,
    testers: testers.map((row) => {
      const total = Number(row.total);
      return { name: row.name, total, passed: Number(row.passed), failed: Number(row.failed), seconds: Number(row.seconds ?? 0), passRate: total === 0 ? 0 : Math.round((Number(row.passed) / total) * 100) };
    }),
    types: CASE_TYPES.map((type: CaseType) => ({ type, count: typeGroups.find((group) => group.type === type)?._count._all ?? 0 })).filter((row) => row.count > 0),
    defects: defects.map((row) => ({ defect: row.defect, count: Number(row.count) })),
    runs: runs.map((run) => ({ ...run, counts: runCounts.get(run.id) ?? {} })),
    bugs: {
      byStatus: BUG_STATUSES.map((status: BugStatus) => ({ status, count: bugStatusGroups.find((group) => group.status === status)?._count._all ?? 0 })),
      openBySeverity: PRIORITIES.map((severity: Priority) => ({ severity, count: bugSeverityGroups.find((group) => group.severity === severity)?._count._all ?? 0 })),
      opened: bugsOpened,
      resolved: bugsResolved,
    },
  };
}
