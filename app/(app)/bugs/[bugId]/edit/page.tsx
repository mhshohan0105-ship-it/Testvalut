import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BugForm } from "@/components/features/bugs/bug-form";
import { hasPermission } from "@/lib/auth/permissions";
import { getProjectForPage } from "@/lib/auth/project-access";
import { getBug } from "@/server/queries/bugs";
import { getAssignableUsers } from "@/server/queries/runs";

export const metadata: Metadata = { title: "Edit bug" };

export default async function EditBugPage({ params }: { params: Promise<{ bugId: string }> }) {
  const { bugId } = await params;
  const bug = await getBug(bugId);
  if (!bug) notFound();
  const access = await getProjectForPage(bug.projectId);
  if (!access || !hasPermission(access.role, "bug:report") || access.project.archived) notFound();
  const people = await getAssignableUsers(bug.projectId);

  return (
    <BugForm
      projectId={bug.projectId}
      people={people}
      currentUserId={access.user.id}
      bugId={bug.id}
      bugNumber={bug.bugNumber}
      initial={{
        title: bug.title,
        severity: bug.severity,
        assignedToId: bug.assignedToId ?? "",
        environment: bug.environment ?? "",
        externalRef: bug.externalRef ?? "",
        description: bug.description ?? "",
        stepsToReproduce: bug.stepsToReproduce ?? "",
        expectedResult: bug.expectedResult ?? "",
        actualResult: bug.actualResult ?? "",
      }}
    />
  );
}
