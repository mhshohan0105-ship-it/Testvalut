import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { TopBar } from "@/components/layout/top-bar";
import { requireUser } from "@/lib/auth/session";
import { getAccessibleProjects, getActiveProject } from "@/server/queries/projects";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [projects, activeProject, store] = await Promise.all([getAccessibleProjects(user), getActiveProject(user), cookies()]);

  return (
    <AppShell
      defaultCollapsed={store.get("tv-sidebar")?.value === "collapsed"}
      topBar={<TopBar user={user} projects={projects} activeProjectId={activeProject?.id ?? null} />}
    >
      {children}
    </AppShell>
  );
}
