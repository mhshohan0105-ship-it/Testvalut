import "server-only";
import { cache } from "react";
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
