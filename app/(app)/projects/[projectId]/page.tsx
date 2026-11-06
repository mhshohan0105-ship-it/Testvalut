import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ListChecks, Pencil } from "lucide-react";
import { ArchiveButton } from "@/components/features/projects/archive-button";
import { MembersPanel } from "@/components/features/projects/members-panel";
import { ProjectFormButton } from "@/components/features/projects/project-form-button";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { hasPermission } from "@/lib/auth/permissions";
import { readableTextOn } from "@/lib/utils";
import { getProjectForPage } from "@/lib/auth/project-access";
import { DEMO_MODE } from "@/lib/demo";
import { describeActivity } from "@/lib/utils/activity";
import { formatDateTime } from "@/lib/utils/format";
import { openProjectCases } from "@/server/actions/projects";
import { getProjectActivity, getProjectMembers, getUsersOutsideProject } from "@/server/queries/projects";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ activity?: string }>;
}) {
  const { projectId } = await params;
  const { activity: activityCursor } = await searchParams;
  const access = await getProjectForPage(projectId);
  if (!access) notFound();
  const { project, role } = access;
  const canManage = hasPermission(role, "project:manage") && !project.archived;

  const [members, candidates, activity] = await Promise.all([
    getProjectMembers(projectId),
    canManage && !DEMO_MODE ? getUsersOutsideProject(projectId) : Promise.resolve([]),
    getProjectActivity(projectId, activityCursor),
  ]);

  return (
    <>
      <Link href="/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Projects
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold" style={{ backgroundColor: project.color, color: readableTextOn(project.color) }}>
              {project.key}
            </span>
            {project.archived && <span className="rounded-md border px-1.5 py-0.5 text-xs text-muted-foreground">Archived</span>}
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">{project.name}</h1>
          {project.description && <p className="mt-1.5 max-w-2xl text-muted-foreground">{project.description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasPermission(role, "project:manage") && !DEMO_MODE && <ArchiveButton projectId={project.id} archived={project.archived} name={project.name} />}
          {canManage && (
            <ProjectFormButton
              project={{ id: project.id, name: project.name, key: project.key, description: project.description ?? "", color: project.color }}
              trigger={
                <Button variant="outline">
                  <Pencil /> Edit
                </Button>
              }
            />
          )}
          {!project.archived && (
            <form action={openProjectCases.bind(null, project.id)}>
              <Button type="submit">
                <ListChecks /> Open test cases
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <MembersPanel projectId={project.id} members={members} candidates={candidates} canManage={canManage && !DEMO_MODE} />
        <GlassCard className="p-5">
          <h2 className="font-semibold tracking-tight">Activity</h2>
          <ul className="mt-3 space-y-3">
            {activity.rows.map((entry) => (
              <li key={entry.id} className="text-sm">
                <p>
                  <span className="font-medium">{entry.user.name}</span> {describeActivity(entry)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
              </li>
            ))}
            {activity.rows.length === 0 && <li className="text-sm text-muted-foreground">Nothing has happened here yet.</li>}
          </ul>
          {(activity.nextCursor || activityCursor) && (
            <div className="mt-4 flex gap-2">
              {activityCursor && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/projects/${project.id}`} scroll={false}>Newest</Link>
                </Button>
              )}
              {activity.nextCursor && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/projects/${project.id}?activity=${activity.nextCursor}`} scroll={false}>Older</Link>
                </Button>
              )}
            </div>
          )}
        </GlassCard>
      </div>
    </>
  );
}
