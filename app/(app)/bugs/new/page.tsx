import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BugForm } from "@/components/features/bugs/bug-form";
import { hasPermission } from "@/lib/auth/permissions";
import { getProjectForPage } from "@/lib/auth/project-access";
import { requireUser } from "@/lib/auth/session";
import { getBugPrefill } from "@/server/queries/bugs";
import { getActiveProject } from "@/server/queries/projects";
import { getAssignableUsers } from "@/server/queries/runs";

export const metadata: Metadata = { title: "Report a bug" };

export default async function NewBugPage({ searchParams }: { searchParams: Promise<{ runCase?: string; case?: string }> }) {
  const { runCase, case: caseId } = await searchParams;
  const user = await requireUser();
  const prefill = await getBugPrefill({ runCaseId: runCase, caseId });
  const projectId = prefill?.projectId ?? (await getActiveProject(user))?.id;
  if (!projectId) redirect("/bugs");

  // Reaching the prefill requires access to its project, so a guessed id reveals nothing.
  const access = await getProjectForPage(projectId);
  if (!access || !hasPermission(access.role, "bug:report") || access.project.archived) notFound();

  const people = await getAssignableUsers(projectId);
  const steps = prefill?.steps.map((step, index) => `${index + 1}. ${step.action}`).join("\n") ?? "";
  const expected = prefill?.steps.map((step) => step.expectedResult).filter(Boolean).join("\n") ?? "";

  return (
    <BugForm
      projectId={projectId}
      people={people}
      currentUserId={user.id}
      linkedCase={prefill ? `${prefill.caseLabel} ${prefill.title}` : undefined}
      links={{ testCaseId: prefill?.testCaseId ?? null, runCaseId: prefill?.runCaseId ?? null }}
      initial={{
        title: prefill ? `${prefill.title} fails` : "",
        severity: prefill?.severity ?? "MEDIUM",
        assignedToId: "",
        environment: prefill?.environment ?? "",
        externalRef: prefill?.externalRef ?? "",
        description: "",
        stepsToReproduce: steps,
        expectedResult: expected,
        actualResult: prefill?.actualResult ?? "",
      }}
    />
  );
}
