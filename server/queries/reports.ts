import "server-only";
import { db } from "@/lib/db";
import type { TestStatus } from "@/generated/prisma/enums";
import { PRIORITIES } from "@/lib/constants/testing";
import type { DateRange } from "@/lib/utils/date-range";

const MOST_FAILING_LIMIT = 10;
const FAILURE_LIST_LIMIT = 200;

export async function getProjectReport(projectId: string, range: DateRange) {
  const [daily, priorityGroups, failing, totals] = await Promise.all([
    db.$queryRaw<{ day: string; passed: bigint; decided: bigint }[]>`
      SELECT to_char(res."createdAt", 'YYYY-MM-DD') AS day,
             COUNT(*) FILTER (WHERE res.status = 'PASSED') AS passed,
             COUNT(*) FILTER (WHERE res.status IN ('PASSED', 'FAILED', 'BLOCKED')) AS decided
      FROM "TestResult" res
      JOIN "TestRunCase" rc ON rc.id = res."runCaseId"
      JOIN "TestRun" r ON r.id = rc."runId"
      WHERE r."projectId" = ${projectId} AND res."createdAt" >= ${range.start} AND res."createdAt" < ${range.end}
      GROUP BY 1
      ORDER BY 1`,
    db.testCase.groupBy({ by: ["priority"], where: { projectId }, _count: { _all: true } }),
    db.$queryRaw<{ id: string; caseNumber: number; title: string; failures: bigint; last: Date }[]>`
      SELECT c.id, c."caseNumber", c.title, COUNT(*) AS failures, MAX(res."createdAt") AS last
      FROM "TestResult" res
      JOIN "TestRunCase" rc ON rc.id = res."runCaseId"
      JOIN "TestCase" c ON c.id = rc."testCaseId"
      WHERE c."projectId" = ${projectId} AND res.status = 'FAILED' AND res."createdAt" >= ${range.start} AND res."createdAt" < ${range.end}
      GROUP BY c.id
      ORDER BY failures DESC, last DESC
      LIMIT ${MOST_FAILING_LIMIT}`,
    db.$queryRaw<{ results: bigint; passed: bigint; decided: bigint }[]>`
      SELECT COUNT(*) AS results,
             COUNT(*) FILTER (WHERE res.status = 'PASSED') AS passed,
             COUNT(*) FILTER (WHERE res.status IN ('PASSED', 'FAILED', 'BLOCKED')) AS decided
      FROM "TestResult" res
      JOIN "TestRunCase" rc ON rc.id = res."runCaseId"
      JOIN "TestRun" r ON r.id = rc."runId"
      WHERE r."projectId" = ${projectId} AND res."createdAt" >= ${range.start} AND res."createdAt" < ${range.end}`,
  ]);

  const summary = totals[0];
  const decided = Number(summary?.decided ?? 0);
  return {
    results: Number(summary?.results ?? 0),
    passRate: decided === 0 ? null : Math.round((Number(summary?.passed ?? 0) / decided) * 100),
    trend: daily.map((row) => ({
      day: row.day,
      passRate: Number(row.decided) === 0 ? null : Math.round((Number(row.passed) / Number(row.decided)) * 100),
      results: Number(row.decided),
    })),
    priorities: PRIORITIES.map((priority) => ({ priority, count: priorityGroups.find((group) => group.priority === priority)?._count._all ?? 0 })),
    mostFailing: failing.map((row) => ({ ...row, failures: Number(row.failures) })),
  };
}

export async function getRunReport(runId: string, range: DateRange) {
  const window = { gte: range.start, lt: range.end };
  const [failures, failureTotal, testers] = await Promise.all([
    // Each case's latest status decides whether it's listed, and its latest result explains why.
    db.testRunCase.findMany({
      where: { runId, currentStatus: { in: ["FAILED", "BLOCKED"] }, results: { some: { createdAt: window } } },
      select: {
        id: true,
        currentStatus: true,
        testCase: { select: { id: true, caseNumber: true, title: true, priority: true } },
        results: {
          where: { status: { in: ["FAILED", "BLOCKED"] }, createdAt: window },
          select: { comment: true, actualResult: true, defectRef: true, createdAt: true, createdBy: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { order: "asc" },
      take: FAILURE_LIST_LIMIT,
    }),
    db.testRunCase.count({ where: { runId, currentStatus: { in: ["FAILED", "BLOCKED"] }, results: { some: { createdAt: window } } } }),
    db.$queryRaw<{ name: string; status: TestStatus; count: bigint; seconds: bigint | null }[]>`
      SELECT u.name, res.status, COUNT(*) AS count, SUM(res."elapsedSeconds") AS seconds
      FROM "TestResult" res
      JOIN "TestRunCase" rc ON rc.id = res."runCaseId"
      JOIN "User" u ON u.id = res."createdById"
      WHERE rc."runId" = ${runId} AND res."createdAt" >= ${range.start} AND res."createdAt" < ${range.end}
      GROUP BY u.name, res.status`,
  ]);

  const byTester = new Map<string, { name: string; total: number; passed: number; failed: number; blocked: number; seconds: number }>();
  for (const row of testers) {
    const entry = byTester.get(row.name) ?? { name: row.name, total: 0, passed: 0, failed: 0, blocked: 0, seconds: 0 };
    const count = Number(row.count);
    entry.total += count;
    entry.seconds += Number(row.seconds ?? 0);
    if (row.status === "PASSED") entry.passed += count;
    if (row.status === "FAILED") entry.failed += count;
    if (row.status === "BLOCKED") entry.blocked += count;
    byTester.set(row.name, entry);
  }

  return {
    failures: failures.map((failure) => ({ ...failure, latest: failure.results[0] ?? null })),
    failureTotal,
    testers: [...byTester.values()].sort((a, b) => b.total - a.total),
  };
}

export async function getReportRunOptions(projectId: string) {
  return db.testRun.findMany({
    where: { projectId },
    select: { id: true, name: true, status: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
