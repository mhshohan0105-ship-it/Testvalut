import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseForm } from "@/components/features/cases/case-form";
import { hasPermission } from "@/lib/auth/permissions";
import { getProjectForPage } from "@/lib/auth/project-access";
import { sanitizeRichText } from "@/lib/utils/sanitize";
import { getCaseAttachments, getCaseForEditor, getSections } from "@/server/queries/cases";

export const metadata: Metadata = { title: "Edit case" };

export default async function EditCasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const testCase = await getCaseForEditor(caseId);
  if (!testCase) notFound();

  const access = await getProjectForPage(testCase.projectId);
  if (!access || !hasPermission(access.role, "case:manage") || access.project.archived) notFound();

  const [sections, attachments] = await Promise.all([getSections(testCase.projectId), getCaseAttachments(caseId)]);

  return (
    <CaseForm
      currentUserId={access.user.id}
      initialAttachments={attachments}
      projectId={testCase.projectId}
      sections={sections}
      caseId={testCase.id}
      caseNumber={testCase.caseNumber}
      initialUpdatedAt={testCase.updatedAt.toISOString()}
      initial={{
        title: testCase.title,
        sectionId: testCase.sectionId,
        priority: testCase.priority,
        type: testCase.type,
        estimate: testCase.estimate,
        references: testCase.references ?? "",
        tags: testCase.tags,
        preconditions: testCase.preconditions ? sanitizeRichText(testCase.preconditions) : "",
        steps: testCase.steps,
      }}
    />
  );
}
