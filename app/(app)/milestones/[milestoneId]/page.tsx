import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { MilestoneActions } from "@/components/features/milestones/milestone-actions";
import { MilestoneFormDialog } from "@/components/features/milestones/milestone-form-dialog";
import { RunProgress } from "@/components/features/runs/run-progress";
import { StatusBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { hasPermission } from "@/lib/auth/permissions";
import { getProjectForPage } from "@/lib/auth/project-access";
import { STATUS_ORDER, summarizeCounts } from "@/lib/constants/status";
import { formatDate, isOverdue } from "@/lib/utils/format";
import { getMilestoneDetail } from "@/server/queries/milestones";

export const metadata: Metadata = { title: "Milestone" };

const dayValue = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : "");

export default async function MilestonePage({ params }: { params: Promise<{ milestoneId: string }> }) {
  const { milestoneId } = await params;
  const milestone = await getMilestoneDetail(milestoneId);
  if (!milestone) notFound();
  const access = await getProjectForPage(milestone.projectId);
  if (!access) notFound();

  const canManage = hasPermission(access.role, "milestone:manage") && !access.project.archived;
  const overdue = isOverdue(milestone.dueDate, milestone.completed);
  const { total, done, percentDone, percentPassed } = summarizeCounts(milestone.combined);

  return (
    <>
      <Link href="/milestones" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Milestones
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight break-words md:text-3xl">{milestone.name}</h1>
          <p className={overdue ? "mt-1 text-sm font-medium text-status-failed" : "mt-1 text-sm text-muted-foreground"}>
            {milestone.completed ? "Completed" : overdue ? "Overdue" : "In progress"}
            {milestone.startDate && ` · Started ${formatDate(milestone.startDate)}`}
            {milestone.dueDate && ` · Due ${formatDate(milestone.dueDate)}`}
          </p>
          {milestone.description && <p className="mt-2 max-w-3xl text-sm whitespace-pre-wrap text-muted-foreground">{milestone.description}</p>}
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <MilestoneActions id={milestone.id} name={milestone.name} completed={milestone.completed} />
            <MilestoneFormDialog
              projectId={milestone.projectId}
              milestone={{
                id: milestone.id,
                name: milestone.name,
                description: milestone.description ?? "",
                startDate: dayValue(milestone.startDate),
                dueDate: dayValue(milestone.dueDate),
              }}
              trigger={
                <Button>
                  <Pencil /> Edit
                </Button>
              }
            />
          </div>
        )}
      </div>

      <GlassCard className="mb-5 p-5">
        <p className="text-sm text-muted-foreground tabular-nums">
          <span className="font-mono text-3xl font-semibold text-foreground">{percentDone}%</span>
          <span className="ml-2">{done} of {total} executed · {percentPassed}% passed</span>
        </p>
        <RunProgress counts={milestone.combined} className="mt-4 h-4" />
        <ul className="mt-4 flex flex-wrap gap-3">
          {STATUS_ORDER.map((status) => (
            <li key={status} className="flex items-center gap-1.5">
              <StatusBadge status={status} />
              <span className="font-mono text-sm tabular-nums">{milestone.combined[status] ?? 0}</span>
            </li>
          ))}
        </ul>
      </GlassCard>

      <h2 className="mb-3 font-semibold tracking-tight">Linked runs</h2>
      {milestone.runs.length === 0 ? (
        <GlassCard className="p-8 text-center text-sm text-muted-foreground">No runs are linked yet. Choose this milestone when you create a run.</GlassCard>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
          {milestone.runs.map((run) => {
            const progress = summarizeCounts(run.counts);
            return (
              <li key={run.id}>
                <Link href={`/runs/${run.id}`} className="block rounded-2xl">
                  <GlassCard className="p-4 transition-colors hover:bg-accent/40">
                    <p className="flex justify-between gap-3">
                      <span className="truncate font-medium">{run.name}</span>
                      <span className="shrink-0 font-mono text-sm text-muted-foreground tabular-nums">{progress.percentDone}%</span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {run.status === "COMPLETED" ? "Closed" : "Active"}
                      {run.environment && ` · ${run.environment}`}
                    </p>
                    <RunProgress counts={run.counts} className="mt-3" />
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
