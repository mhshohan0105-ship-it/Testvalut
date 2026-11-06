import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";

export const ACTIVE_PROJECT_COOKIE = "tv-project";

/** Admins see every project. Everyone else sees the projects they are a member of. */
export function projectScope(user: Pick<CurrentUser, "id" | "role">) {
  return user.role === "ADMIN" ? {} : { members: { some: { userId: user.id } } };
}

export const getAccessibleProjects = cache(async (user: CurrentUser) =>
  db.project.findMany({
    where: { archived: false, ...projectScope(user) },
    select: { id: true, name: true, key: true, color: true },
    orderBy: { name: "asc" },
  }),
);

export const getActiveProject = cache(async (user: CurrentUser) => {
  const [projects, store] = await Promise.all([getAccessibleProjects(user), cookies()]);
  const saved = store.get(ACTIVE_PROJECT_COOKIE)?.value;
  return projects.find((project) => project.id === saved) ?? projects[0] ?? null;
});

export async function getProjectCards(user: CurrentUser, archived: boolean) {
  const projects = await db.project.findMany({
    where: { archived, ...projectScope(user) },
    select: { id: true, name: true, key: true, color: true, description: true, archived: true, _count: { select: { cases: true, members: true } } },
    orderBy: { name: "asc" },
  });
  if (projects.length === 0) return [];

  const ids = projects.map((project) => project.id);
  const groups = await db.$queryRaw<{ projectId: string; status: string; count: bigint }[]>`
    SELECT r."projectId", rc."currentStatus"::text AS status, COUNT(*) AS count
    FROM "TestRunCase" rc
    JOIN "TestRun" r ON r.id = rc."runId"
    WHERE r."projectId" = ANY(${ids})
    GROUP BY r."projectId", rc."currentStatus"`;

  return projects.map((project) => {
    const countOf = (status: string) => Number(groups.find((group) => group.projectId === project.id && group.status === status)?.count ?? 0);
    const passed = countOf("PASSED");
    const decided = passed + countOf("FAILED") + countOf("BLOCKED");
    return { ...project, passRate: decided === 0 ? null : Math.round((passed / decided) * 100) };
  });
}

export async function getProjectMembers(projectId: string) {
  return db.projectMember.findMany({
    where: { projectId },
    select: { role: true, user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });
}

export async function getUsersOutsideProject(projectId: string) {
  return db.user.findMany({
    where: { deactivatedAt: null, memberships: { none: { projectId } } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

const ACTIVITY_PAGE_SIZE = 20;

export async function getProjectActivity(projectId: string, cursor?: string) {
  const rows = await db.activityLog.findMany({
    where: { projectId },
    select: { id: true, action: true, entityType: true, meta: true, createdAt: true, user: { select: { name: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: ACTIVITY_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > ACTIVITY_PAGE_SIZE;
  const page = rows.slice(0, ACTIVITY_PAGE_SIZE);
  return { rows: page, nextCursor: hasMore ? page[page.length - 1]?.id : undefined };
}
