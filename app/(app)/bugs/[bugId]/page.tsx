import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BugAttachments } from "@/components/features/bugs/bug-attachments";
import { BugActions, BugTriage } from "@/components/features/bugs/bug-controls";
import { CommentsPanel } from "@/components/features/cases/comments-panel";
import { BugStatusBadge, PriorityBadge } from "@/components/ui/badges";
import { GlassCard } from "@/components/ui/glass-card";
import { hasPermission } from "@/lib/auth/permissions";
import { getProjectForPage } from "@/lib/auth/project-access";
import { caseLabel, formatDateTime } from "@/lib/utils/format";
import { getBug, getBugActivity, getBugComments } from "@/server/queries/bugs";
import { getAssignableUsers } from "@/server/queries/runs";

export const metadata: Metadata = { title: "Bug" };

export default async function BugPage({ params }: { params: Promise<{ bugId: string }> }) {
  const { bugId } = await params;
  const bug = await getBug(bugId);
  if (!bug) notFound();
  const access = await getProjectForPage(bug.projectId);
  if (!access) notFound();

  const writable = !access.project.archived;
  const canReport = hasPermission(access.role, "bug:report") && writable;
  const canManage = hasPermission(access.role, "case:manage") && writable;
  const [people, comments, activity] = await Promise.all([getAssignableUsers(bug.projectId), getBugComments(bugId), getBugActivity(bugId)]);
  const assignee = people.find((person) => person.id === bug.assignedToId);
  const label = `B${bug.bugNumber}`;

  return (
    <>
      <Link href="/bugs" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Bugs
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{label}</span>
            <PriorityBadge priority={bug.severity} />
            <BugStatusBadge status={bug.status} />
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight break-words md:text-3xl">{bug.title}</h1>
        </div>
        <BugActions bugId={bug.id} label={label} canEdit={canReport} canDelete={hasPermission(access.role, "bug:delete") && writable} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-5">
          <GlassCard className="space-y-4 p-5">
            <Block title="Description" text={bug.description} empty="No description." />
            <Block title="Steps to reproduce" text={bug.stepsToReproduce} empty="No steps recorded." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Block title="Expected result" text={bug.expectedResult} empty="Not recorded." />
              <Block title="Actual result" text={bug.actualResult} empty="Not recorded." />
            </div>
          </GlassCard>
          <GlassCard className="p-5">
            <h2 className="mb-3 font-semibold tracking-tight">Attachments</h2>
            <BugAttachments
              projectId={bug.projectId}
              bugId={bug.id}
              initial={bug.attachments}
              currentUserId={access.user.id}
              canUpload={hasPermission(access.role, "attachment:upload") && writable}
              canModerate={canManage}
            />
          </GlassCard>
          <GlassCard className="p-5">
            <h2 className="mb-3 font-semibold tracking-tight">Comments</h2>
            <CommentsPanel
              bugId={bug.id}
              comments={comments}
              currentUser={{ id: access.user.id, name: access.user.name }}
              canComment={hasPermission(access.role, "comment:create") && writable}
              canModerate={canManage}
            />
          </GlassCard>
        </div>

        <div className="space-y-5">
          <GlassCard className="p-5">
            {canReport ? (
              <BugTriage key={`${bug.status}-${bug.assignedToId}`} bugId={bug.id} status={bug.status} assignedToId={bug.assignedToId} people={people} />
            ) : (
              <p className="text-sm">
                <span className="text-muted-foreground">Assignee: </span>
                {assignee?.name ?? "Unassigned"}
              </p>
            )}
            <dl className="mt-4 space-y-2.5 border-t border-border pt-4 text-sm">
              <Fact label="Reported by">{bug.reportedBy.name}</Fact>
              <Fact label="Reported">{formatDateTime(bug.createdAt)}</Fact>
              {bug.resolvedAt && <Fact label="Resolved">{formatDateTime(bug.resolvedAt)}</Fact>}
              <Fact label="Environment">{bug.environment || "–"}</Fact>
              <Fact label="External">{bug.externalRef || "–"}</Fact>
              {bug.testCase && (
                <Fact label="Test case">
                  <Link href={`/cases/${bug.testCase.id}`} className="font-mono hover:text-primary">{caseLabel(bug.testCase.caseNumber)}</Link>
                </Fact>
              )}
              {bug.runCase && (
                <Fact label="Run">
                  <Link href={`/runs/${bug.runCase.run.id}`} className="hover:text-primary">{bug.runCase.run.name}</Link>
                </Fact>
              )}
            </dl>
          </GlassCard>
          <GlassCard className="p-5">
            <h2 className="mb-3 font-semibold tracking-tight">History</h2>
            <ul className="space-y-2.5">
              {activity.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <span className="font-medium">{entry.user.name}</span> {entry.action}
                  <p className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
                </li>
              ))}
              {activity.length === 0 && <li className="text-sm text-muted-foreground">No changes yet.</li>}
            </ul>
          </GlassCard>
        </div>
      </div>
    </>
  );
}

function Block({ title, text, empty }: { title: string; text: string | null; empty: string }) {
  return (
    <div>
      <h2 className="mb-1 text-sm font-semibold tracking-tight">{title}</h2>
      {text ? <p className="text-sm break-words whitespace-pre-wrap">{text}</p> : <p className="text-sm text-muted-foreground">{empty}</p>}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right break-words">{children}</dd>
    </div>
  );
}
