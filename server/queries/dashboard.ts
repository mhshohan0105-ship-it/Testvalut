import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import type { StatusCounts } from "@/lib/constants/status";
import { getAccessibleProjects } from "./projects";

const CHART_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export type DailyResults = { day: string; passed: number; failed: number; other: number };

/** Every day in the window appears, including days with no results, so the chart's time axis stays honest. */
function fillDays(rows: { day: string; status: string; count: bigint }[]) {
  const today = new Date();
  const days: DailyResults[] = [];
  for (let offset = CHART_DAYS - 1; offset >= 0; offset--) {
    const day = new Date(today.getTime() - offset * DAY_MS).toISOString().slice(0, 10);
    days.push({ day, passed: 0, failed: 0, other: 0 });
  }
  const byDay = new Map(days.map((entry) => [entry.day, entry]));
  for (const row of rows) {
    const entry = byDay.get(row.day);
    if (!entry) continue;
    const key = row.status === "PASSED" ? "passed" : row.status === "FAILED" ? "failed" : "other";
    entry[key] += Number(row.count);
  }
  return days;
}

export async function getDashboard(user: CurrentUser) {
  const projects = await getAccessibleProjects(user);
  const ids = projects.map((project) => project.id);
  const since = new Date(Date.now() - (CHART_DAYS - 1) * DAY_MS);
  since.setUTCHours(0, 0, 0, 0);

  const [totalCases, activeRunCount, statusGroups, openFailures, activeRuns, assigned, assignedTotal, activity, daily] = await Promise.all([
    db.testCase.count({ where: { projectId: { in: ids } } }),
    db.testRun.count({ where: { projectId: { in: ids }, status: "ACTIVE" } }),
    db.testRunCase.groupBy({ by: ["currentStatus"], where: { run: { projectId: { in: ids } } }, _count: { _all: true } }),
    db.testRunCase.count({ where: { currentStatus: "FAILED", run: { projectId: { in: ids }, status: "ACTIVE" } } }),
    db.testRun.findMany({
      where: { projectId: { in: ids }, status: "ACTIVE" },
      select: { id: true, name: true, project: { select: { key: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.testRunCase.findMany({
      where: { assignedToId: user.id, currentStatus: { in: ["UNTESTED", "RETEST"] }, run: { projectId: { in: ids }, status: "ACTIVE" } },
      select: {
        id: true,
        runId: true,
        currentStatus: true,
        run: { select: { name: true } },
        testCase: { select: { caseNumber: true, title: true, priority: true } },
      },
      orderBy: [{ testCase: { priority: "asc" } }, { order: "asc" }],
      take: 8,
    }),
    db.testRunCase.count({ where: { assignedToId: user.id, currentStatus: { in: ["UNTESTED", "RETEST"] }, run: { projectId: { in: ids }, status: "ACTIVE" } } }),
    db.activityLog.findMany({
      where: { projectId: { in: ids } },
      select: { id: true, action: true, entityType: true, meta: true, createdAt: true, user: { select: { name: true } }, project: { select: { key: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 10,
    }),
    db.$queryRaw<{ day: string; status: string; count: bigint }[]>`
      SELECT to_char(res."createdAt", 'YYYY-MM-DD') AS day, res.status::text AS status, COUNT(*) AS count
      FROM "TestResult" res
      JOIN "TestRunCase" rc ON rc.id = res."runCaseId"
      JOIN "TestRun" r ON r.id = rc."runId"
      WHERE r."projectId" = ANY(${ids}) AND res."createdAt" >= ${since}
      GROUP BY 1, 2`,
  ]);

  const statusCounts: StatusCounts = {};
  for (const group of statusGroups) statusCounts[group.currentStatus] = group._count._all;
  const passed = statusCounts.PASSED ?? 0;
  const decided = passed + (statusCounts.FAILED ?? 0) + (statusCounts.BLOCKED ?? 0);

  const runGroups = await db.testRunCase.groupBy({
    by: ["runId", "currentStatus"],
    where: { runId: { in: activeRuns.map((run) => run.id) } },
    _count: { _all: true },
  });
  const runCounts = new Map<string, StatusCounts>();
  for (const group of runGroups) {
    const counts = runCounts.get(group.runId) ?? {};
    counts[group.currentStatus] = group._count._all;
    runCounts.set(group.runId, counts);
  }

  return {
    totalCases,
    activeRunCount,
    openFailures,
    passRate: decided === 0 ? null : Math.round((passed / decided) * 100),
    statusCounts,
    daily: fillDays(daily),
    activeRuns: activeRuns.map((run) => ({ ...run, counts: runCounts.get(run.id) ?? {} })),
    assigned,
    assignedTotal,
    activity,
  };
}
