import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { RunOverview } from "@/components/features/runs/run-overview";
import { hasPermission } from "@/lib/auth/permissions";
import { getProjectForPage } from "@/lib/auth/project-access";
import { formatDate } from "@/lib/utils/format";
import { getAssignableUsers, getRun, getRunStatusCounts, listRunCases } from "@/server/queries/runs";

export const metadata: Metadata = { title: "Test run" };

export default async function RunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = await getRun(runId);
  if (!run) notFound();
  const access = await getProjectForPage(run.projectId);
  if (!access) notFound();

  const [list, counts, people] = await Promise.all([
    listRunCases(runId, { status: null, assignee: null }),
    getRunStatusCounts(runId),
    getAssignableUsers(run.projectId),
  ]);
  const writable = !access.project.archived;

  return (
    <>
      <Link href="/runs" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Test Runs
      </Link>
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight break-words md:text-3xl">{run.name}</h1>
          {run.status === "COMPLETED" && (
            <span className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
              <Lock className="size-3" aria-hidden /> Closed {run.closedAt ? formatDate(run.closedAt) : ""}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {[run.environment, run.milestone?.name, run.assignedTo ? `Assigned to ${run.assignedTo.name}` : null].filter(Boolean).join(" · ") || "No details"}
        </p>
        {run.description && <p className="mt-2 max-w-3xl text-sm whitespace-pre-wrap text-muted-foreground">{run.description}</p>}
      </div>
      <RunOverview
        // A rerun navigates to another run on this same route, so state must reset with it.
        key={run.id}
        runId={run.id}
        runStatus={run.status}
        people={people}
        initialList={list}
        initialCounts={counts}
        canManage={hasPermission(access.role, "run:manage") && writable}
        canExecute={hasPermission(access.role, "result:create") && writable}
      />
    </>
  );
}
