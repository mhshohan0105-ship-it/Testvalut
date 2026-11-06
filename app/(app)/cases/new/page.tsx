import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FolderTree } from "lucide-react";
import { CaseForm } from "@/components/features/cases/case-form";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { hasPermission } from "@/lib/auth/permissions";
import { getProjectForPage } from "@/lib/auth/project-access";
import { requireUser } from "@/lib/auth/session";
import { flattenSections } from "@/lib/utils/tree";
import { getSections } from "@/server/queries/cases";
import { getActiveProject } from "@/server/queries/projects";

export const metadata: Metadata = { title: "New case" };

export default async function NewCasePage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const user = await requireUser();
  const activeProject = await getActiveProject(user);
  if (!activeProject) redirect("/cases");

  const access = await getProjectForPage(activeProject.id);
  if (!access || !hasPermission(access.role, "case:manage")) notFound();

  const { section } = await searchParams;
  const sections = await getSections(activeProject.id);
  const first = flattenSections(sections)[0]?.item.id;

  if (!first) {
    return (
      <>
        <PageHeader title="New case" />
        <EmptyState
          icon={FolderTree}
          title="Create a section first"
          description="Every case lives in a section. Add one from the section tree, then come back."
          action={
            <Button asChild>
              <Link href="/cases">Go to Test Cases</Link>
            </Button>
          }
        />
      </>
    );
  }

  return (
    <CaseForm
      currentUserId={user.id}
      projectId={activeProject.id}
      sections={sections}
      initial={{
        title: "",
        sectionId: sections.some((item) => item.id === section) ? (section as string) : first,
        priority: "MEDIUM",
        type: "FUNCTIONAL",
        estimate: null,
        references: "",
        tags: [],
        preconditions: "",
        steps: [{ action: "", expectedResult: "" }],
      }}
    />
  );
}
