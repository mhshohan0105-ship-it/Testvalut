"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { ACTIVE_PROJECT_COOKIE, getAccessibleProjects } from "@/server/queries/projects";

export async function setActiveProject(input: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const projectId = z.string().min(1).safeParse(input);
  if (!projectId.success) return { ok: false, error: "That project isn't valid." };

  const user = await requireUser();
  const projects = await getAccessibleProjects(user);
  if (!projects.some((project) => project.id === projectId.data)) {
    return { ok: false, error: "You don't have access to that project." };
  }

  const store = await cookies();
  store.set(ACTIVE_PROJECT_COOKIE, projectId.data, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
  revalidatePath("/", "layout");
  return { ok: true };
}
