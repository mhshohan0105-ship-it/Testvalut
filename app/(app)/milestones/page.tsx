import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, CircleCheck, Flag, Plus } from "lucide-react";
import { MilestoneFormDialog } from "@/components/features/milestones/milestone-form-dialog";
import { RunProgress } from "@/components/features/runs/run-progress";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassCard } from "@/components/ui/glass-card";
import { hasPermission } from "@/lib/auth/permissions";
import { getProjectForPage } from "@/lib/auth/project-access";
import { requireUser } from "@/lib/auth/session";
import { summarizeCounts } from "@/lib/constants/status";
import { cn } from "@/lib/utils";
import { formatDate, isOverdue } from "@/lib/utils/format";
import { getMilestones } from "@/server/queries/milestones";
import { getActiveProject } from "@/server/queries/projects";

export const metadata: Metadata = { title: "Milestones" };

export default async function MilestonesPage() {
  const user = await requireUser();
  const project = await getActiveProject(user);

  if (!project) {
    return (
      <>
        <PageHeader title="Milestones" description="Track progress toward each release." />
        <EmptyState
          icon={Flag}
          title="No project to show"
          description="Milestones live inside a project. Create one, or ask an admin to add you to one."
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
  const canManage = access ? hasPermission(access.role, "milestone:manage") : false;
  const milestones = await getMilestones(project.id);
  const create = (
    <MilestoneFormDialog
      projectId={project.id}
      trigger={
        <Button>
          <Plus /> New milestone
        </Button>
      }
    />
  );

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Milestones" description={project.name} />
        {canManage && create}
      </div>

      {milestones.length === 0 ? (
        <EmptyState icon={Flag} title="No milestones yet" description={canManage ? "Add a milestone to track progress toward a release." : "A lead will add milestones as releases are planned."} action={canManage ? create : undefined} />
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
          {milestones.map((milestone, index) => {
            const overdue = isOverdue(milestone.dueDate, milestone.completed);
            const { total, percentDone, percentPassed } = summarizeCounts(milestone.counts);
            return (
              <li key={milestone.id} className="page-enter" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
                <Link href={`/milestones/${milestone.id}`} className="block rounded-2xl">
                  <GlassCard className={cn("p-5 transition-colors hover:bg-accent/40", overdue && "border-status-failed/50")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold tracking-tight">{milestone.name}</h2>
                        <p className={cn("mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground", overdue && "font-medium text-status-failed")}>
                          {milestone.completed ? <CircleCheck className="size-3.5 text-status-passed" aria-hidden /> : <CalendarClock className="size-3.5" aria-hidden />}
                          {milestone.completed ? "Completed" : overdue ? "Overdue · " : ""}
                          {!milestone.completed && (milestone.dueDate ? `Due ${formatDate(milestone.dueDate)}` : "No due date")}
                        </p>
                      </div>
                      <p className="shrink-0 font-mono text-2xl font-semibold tabular-nums">{percentDone}%</p>
                    </div>
                    <RunProgress counts={milestone.counts} className="mt-4" />
                    <p className="mt-2.5 text-xs text-muted-foreground tabular-nums">
                      {milestone._count.runs} {milestone._count.runs === 1 ? "run" : "runs"} · {total} cases · {percentPassed}% passed
                    </p>
                  </GlassCard>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
