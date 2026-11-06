import type { Metadata } from "next";
import Link from "next/link";
import { Bug } from "lucide-react";
import { BugList } from "@/components/features/bugs/bug-list";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { hasPermission } from "@/lib/auth/permissions";
import { getProjectForPage } from "@/lib/auth/project-access";
import { requireUser } from "@/lib/auth/session";
import { parseBugQuery } from "@/lib/validations/bug-query";
import { listBugs } from "@/server/queries/bugs";
import { getActiveProject } from "@/server/queries/projects";
import { getAssignableUsers } from "@/server/queries/runs";

export const metadata: Metadata = { title: "Bugs" };

export default async function BugsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const project = await getActiveProject(user);

  if (!project) {
    return (
      <>
        <PageHeader title="Bugs" description="Track what testing turns up." />
        <EmptyState
          icon={Bug}
          title="No project to show"
          description="Bugs live inside a project. Create one, or ask an admin to add you to one."
          action={
            <Button asChild>
              <Link href="/projects">Go to projects</Link>
            </Button>
          }
        />
      </>
    );
  }

  const access = await getProjectForPage(project.id);
  const params = await searchParams;
  const query = parseBugQuery((key) => {
    const value = params[key];
    return typeof value === "string" ? value : null;
  });
  const [list, people] = await Promise.all([listBugs(project.id, query), getAssignableUsers(project.id)]);

  return (
    <BugList
      key={project.id}
      project={{ id: project.id, name: project.name }}
      people={people}
      initialList={list}
      initialQuery={query}
      canReport={access ? hasPermission(access.role, "bug:report") : false}
    />
  );
}
