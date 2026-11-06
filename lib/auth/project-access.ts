import "server-only";
import { db } from "@/lib/db";
import { ActionError } from "@/lib/utils/action";
import type { Role } from "@/generated/prisma/enums";
import { ForbiddenError, getCurrentUser, requireUser, type CurrentUser } from "./session";
import { hasPermission, type Permission } from "./permissions";

const PROJECT_SELECT = { id: true, name: true, key: true, color: true, description: true, archived: true, createdAt: true } as const;

async function loadProject(user: CurrentUser, projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { ...PROJECT_SELECT, members: { where: { userId: user.id }, select: { role: true } } },
  });
  if (!project) return null;
  const { members, ...rest } = project;
  // Admins can reach every project. Everyone else needs a membership, and that membership's role applies.
  const role: Role | undefined = user.role === "ADMIN" ? "ADMIN" : members[0]?.role;
  return role ? { project: rest, role } : null;
}

/**
 * For server actions and route handlers: every project-level operation goes through here.
 * Writes pass a permission, and they are refused on archived projects.
 */
export async function requireProjectAccess(projectId: string, permission?: Permission, options?: { allowArchived?: boolean }) {
  const user = await requireUser();
  const access = await loadProject(user, projectId);
  if (!access) throw new ForbiddenError("That project doesn't exist or you don't have access to it.");
  if (permission) {
    if (!hasPermission(access.role, permission)) throw new ForbiddenError();
    if (access.project.archived && !options?.allowArchived) throw new ActionError("This project is archived. Restore it to make changes.");
  }
  return { user, ...access };
}

/** For pages: returns null instead of throwing, so the page can show its 404. */
export async function getProjectForPage(projectId: string) {
  const user = await requireUser();
  const access = await loadProject(user, projectId);
  return access ? { user, ...access } : null;
}

/** For route handlers: null means respond 401 or 403. */
export async function getProjectForRoute(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return { status: 401 as const };
  const access = await loadProject(user, projectId);
  if (!access) return { status: 403 as const };
  return { status: 200 as const, user, ...access };
}
