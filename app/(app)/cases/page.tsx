import type { Metadata } from "next";
import Link from "next/link";
import { ListChecks } from "lucide-react";
import { CaseRepository } from "@/components/features/cases/case-repository";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { hasPermission } from "@/lib/auth/permissions";
import { getProjectForPage } from "@/lib/auth/project-access";
import { requireUser } from "@/lib/auth/session";
import { parseCaseQuery } from "@/lib/validations/case-query";
import { getActiveRunOptions, getProjectTags, getSectionsWithCounts, listCases } from "@/server/queries/cases";
import { getActiveProject } from "@/server/queries/projects";

export const metadata: Metadata = { title: "Test Cases" };

export default async function CasesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const activeProject = await getActiveProject(user);

  if (!activeProject) {
    return (
      <>
        <PageHeader title="Test Cases" description="Your case repository, organized by section." />
        <EmptyState
          icon={ListChecks}
          title="No project to show"
          description="Test cases live inside a project. Create one, or ask an admin to add you to one."
          action={
            <Button asChild>
              <Link href="/projects">Go to projects</Link>
            </Button>
          }
        />
      </>
    );
  }

  const access = await getProjectForPage(activeProject.id);
  if (!access) return null;

  const params = await searchParams;
  const query = parseCaseQuery((key) => {
    const value = params[key];
    return typeof value === "string" ? value : null;
  });

  const [tree, list, tags, activeRuns] = await Promise.all([
    getSectionsWithCounts(activeProject.id),
    listCases(activeProject.id, query),
    getProjectTags(activeProject.id),
    getActiveRunOptions(activeProject.id),
  ]);

  return (
    <CaseRepository
      // Remount when the project switcher changes, so no state leaks between projects.
      key={activeProject.id}
      project={{ id: activeProject.id, name: activeProject.name }}
      initialSections={tree.sections}
      initialCounts={tree.counts}
      initialList={list}
      initialQuery={query}
      tags={tags}
      activeRuns={activeRuns}
      canManage={hasPermission(access.role, "case:manage")}
      canManageRuns={hasPermission(access.role, "run:manage")}
    />
  );
}
