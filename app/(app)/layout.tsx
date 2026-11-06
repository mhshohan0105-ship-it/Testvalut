import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { TopBar } from "@/components/layout/top-bar";
import { requireUser } from "@/lib/auth/session";
import { ACTIVE_PROJECT_COOKIE, getAccessibleProjects } from "@/server/queries/projects";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [projects, store] = await Promise.all([getAccessibleProjects(user), cookies()]);

  const savedProjectId = store.get(ACTIVE_PROJECT_COOKIE)?.value;
  const activeProject = projects.find((project) => project.id === savedProjectId) ?? projects[0] ?? null;

  return (
    <AppShell
      defaultCollapsed={store.get("tv-sidebar")?.value === "collapsed"}
      topBar={<TopBar user={user} projects={projects} activeProjectId={activeProject?.id ?? null} />}
    >
      {children}
    </AppShell>
  );
}
