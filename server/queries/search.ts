import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import { getAccessibleProjects } from "./projects";

const LIMIT = 6;

/** Finds projects, cases and runs the user can see. A case matches on its title or its number, as in "C123". */
export async function searchEverything(user: CurrentUser, query: string) {
  const projects = await getAccessibleProjects(user);
  const ids = projects.map((project) => project.id);
  const lowered = query.toLowerCase();
  const number = /^c?(\d{1,9})$/i.exec(query)?.[1];

  const [cases, runs] = await Promise.all([
    db.testCase.findMany({
      where: {
        projectId: { in: ids },
        OR: [{ title: { contains: query, mode: "insensitive" } }, ...(number ? [{ caseNumber: Number(number) }] : [])],
      },
      select: { id: true, caseNumber: true, title: true, project: { select: { key: true } } },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: LIMIT,
    }),
    db.testRun.findMany({
      where: { projectId: { in: ids }, name: { contains: query, mode: "insensitive" } },
      select: { id: true, name: true, status: true, project: { select: { key: true } } },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    }),
  ]);

  return {
    projects: projects.filter((project) => project.name.toLowerCase().includes(lowered) || project.key.toLowerCase().includes(lowered)).slice(0, LIMIT),
    cases: cases.sort((a, b) => Number(b.caseNumber === Number(number)) - Number(a.caseNumber === Number(number))),
    runs,
  };
}

export type SearchResults = Awaited<ReturnType<typeof searchEverything>>;
