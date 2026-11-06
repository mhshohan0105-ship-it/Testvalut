import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { RunForm } from "@/components/features/runs/run-form";
import { hasPermission } from "@/lib/auth/permissions";
import { getProjectForPage } from "@/lib/auth/project-access";
import { requireUser } from "@/lib/auth/session";
import { getActiveProject } from "@/server/queries/projects";
import { getAssignableUsers, getMilestoneOptions, getRunPickerData } from "@/server/queries/runs";

export const metadata: Metadata = { title: "New run" };

export default async function NewRunPage() {
  const user = await requireUser();
  const project = await getActiveProject(user);
  if (!project) redirect("/runs");

  const access = await getProjectForPage(project.id);
  if (!access || !hasPermission(access.role, "run:manage")) notFound();

  const [picker, milestones, people] = await Promise.all([getRunPickerData(project.id), getMilestoneOptions(project.id), getAssignableUsers(project.id)]);

  return (
    <RunForm
      project={{ id: project.id, name: project.name }}
      sections={picker.sections}
      priorityCounts={picker.priorityCounts}
      milestones={milestones}
      people={people}
      defaultAssigneeId={people.some((person) => person.id === user.id) ? user.id : ""}
    />
  );
}
