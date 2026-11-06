import type { Metadata } from "next";
import Link from "next/link";
import { PlayCircle, Plus } from "lucide-react";
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
import { formatDate } from "@/lib/utils/format";
import { getActiveProject } from "@/server/queries/projects";
import { getRunList } from "@/server/queries/runs";

export const metadata: Metadata = { title: "Test Runs" };

const TABS = [
  { status: "ACTIVE", label: "Active", href: "/runs" },
  { status: "COMPLETED", label: "Closed", href: "/runs?status=COMPLETED" },
] as const;

export default async function RunsPage({ searchParams }: { searchParams: Promise<{ status?: string; cursor?: string }> }) {
  const { status: statusParam, cursor } = await searchParams;
  const status = statusParam === "COMPLETED" ? "COMPLETED" : "ACTIVE";
  const user = await requireUser();
  const project = await getActiveProject(user);

  if (!project) {
    return (
      <>
        <PageHeader title="Test Runs" description="Plan, execute and track test runs." />
        <EmptyState
          icon={PlayCircle}
          title="No project to show"
          description="Runs live inside a project. Create one, or ask an admin to add you to one."
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
  const canCreate = access ? hasPermission(access.role, "run:manage") : false;
  const { rows, nextCursor } = await getRunList(project.id, status, cursor);
  const newRun = (
    <Button asChild>
      <Link href="/runs/new">
        <Plus /> New run
      </Link>
    </Button>
  );

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Test Runs" description={project.name} />
        {canCreate && newRun}
      </div>

      <nav aria-label="Run status" className="mb-5 flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <Link
            key={tab.status}
            href={tab.href}
            aria-current={status === tab.status ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              status === tab.status ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 && !cursor ? (
        <EmptyState
          icon={PlayCircle}
          title={status === "ACTIVE" ? "No active runs" : "No closed runs yet"}
          description={status === "ACTIVE" ? (canCreate ? "Start a run to execute your test cases." : "A lead will start a run when it's time to test.") : "Runs show up here once they're closed."}
          action={status === "ACTIVE" && canCreate ? newRun : undefined}
        />
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
          {rows.map((run, index) => {
            const { total, percentDone, percentPassed } = summarizeCounts(run.counts);
            return (
              <li key={run.id} className="page-enter" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
                <Link href={`/runs/${run.id}`} className="block rounded-2xl">
                  <GlassCard className="p-5 transition-colors hover:bg-accent/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold tracking-tight">{run.name}</h2>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {[run.environment, run.milestone?.name, run.assignedTo?.name].filter(Boolean).join(" · ") || "No details"}
                        </p>
                      </div>
                      <p className="shrink-0 font-mono text-2xl font-semibold tabular-nums">{percentDone}%</p>
                    </div>
                    <RunProgress counts={run.counts} className="mt-4" />
                    <p className="mt-2.5 flex justify-between gap-3 text-xs text-muted-foreground">
                      <span className="tabular-nums">
                        {total} cases · {percentPassed}% passed
                      </span>
                      <span>{run.closedAt ? `Closed ${formatDate(run.closedAt)}` : `Started ${formatDate(run.createdAt)}`}</span>
                    </p>
                  </GlassCard>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {(nextCursor || cursor) && (
        <div className="mt-5 flex gap-2">
          {cursor && (
            <Button asChild variant="outline" size="sm">
              <Link href={status === "ACTIVE" ? "/runs" : "/runs?status=COMPLETED"}>Newest</Link>
            </Button>
          )}
          {nextCursor && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/runs?${status === "COMPLETED" ? "status=COMPLETED&" : ""}cursor=${nextCursor}`}>Older</Link>
            </Button>
          )}
        </div>
      )}
    </>
  );
}
