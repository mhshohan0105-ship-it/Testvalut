import "server-only";
import { db } from "@/lib/db";
import type { StatusCounts } from "@/lib/constants/status";

export async function getMilestones(projectId: string) {
  const milestones = await db.milestone.findMany({
    where: { projectId },
    select: { id: true, name: true, description: true, startDate: true, dueDate: true, completed: true, _count: { select: { runs: true } } },
    orderBy: [{ completed: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }, { name: "asc" }],
  });
  const groups = await db.$queryRaw<{ milestoneId: string; status: StatusKey; count: bigint }[]>`
    SELECT r."milestoneId", rc."currentStatus"::text AS status, COUNT(*) AS count
    FROM "TestRunCase" rc
    JOIN "TestRun" r ON r.id = rc."runId"
    WHERE r."projectId" = ${projectId} AND r."milestoneId" IS NOT NULL
    GROUP BY 1, 2`;

  const counts = new Map<string, StatusCounts>();
  for (const group of groups) {
    const entry = counts.get(group.milestoneId) ?? {};
    entry[group.status] = Number(group.count);
    counts.set(group.milestoneId, entry);
  }
  return milestones.map((milestone) => ({ ...milestone, counts: counts.get(milestone.id) ?? {} }));
}

type StatusKey = keyof StatusCounts;

export async function getMilestoneDetail(milestoneId: string) {
  const milestone = await db.milestone.findUnique({
    where: { id: milestoneId },
    select: {
      id: true,
      projectId: true,
      name: true,
      description: true,
      startDate: true,
      dueDate: true,
      completed: true,
      runs: { select: { id: true, name: true, status: true, environment: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!milestone) return null;

  const groups = await db.testRunCase.groupBy({
    by: ["runId", "currentStatus"],
    where: { run: { milestoneId } },
    _count: { _all: true },
  });
  const combined: StatusCounts = {};
  const byRun = new Map<string, StatusCounts>();
  for (const group of groups) {
    combined[group.currentStatus] = (combined[group.currentStatus] ?? 0) + group._count._all;
    const entry = byRun.get(group.runId) ?? {};
    entry[group.currentStatus] = group._count._all;
    byRun.set(group.runId, entry);
  }
  return { ...milestone, combined, runs: milestone.runs.map((run) => ({ ...run, counts: byRun.get(run.id) ?? {} })) };
}
