import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CaseActions } from "@/components/features/cases/case-actions";
import { CaseAttachments } from "@/components/features/cases/case-attachments";
import { CommentsPanel } from "@/components/features/cases/comments-panel";
import { AttachmentGallery } from "@/components/ui/attachment-gallery";
import { BugStatusBadge, PriorityBadge, StatusBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { hasPermission } from "@/lib/auth/permissions";
import { getProjectForPage } from "@/lib/auth/project-access";
import { CASE_TYPE_LABELS } from "@/lib/constants/testing";
import { cn } from "@/lib/utils";
import { diffSnapshots } from "@/lib/utils/case-diff";
import { caseLabel, formatDateTime, formatDuration } from "@/lib/utils/format";
import { richTextToPlain, sanitizeRichText } from "@/lib/utils/sanitize";
import { sectionPath } from "@/lib/utils/tree";
import { getCaseBugs } from "@/server/queries/bugs";
import { getCaseAttachments, getCaseComments, getCaseDetail, getCaseResults, getCaseVersions, getSections } from "@/server/queries/cases";

export const metadata: Metadata = { title: "Test case" };

const TABS = [
  { id: "details", label: "Details" },
  { id: "history", label: "History" },
  { id: "results", label: "Results" },
  { id: "bugs", label: "Bugs" },
  { id: "comments", label: "Comments" },
] as const;

export default async function CasePage({
  params,
  searchParams,
}: {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ tab?: string; cursor?: string }>;
}) {
  const { caseId } = await params;
  const { tab: tabParam, cursor } = await searchParams;
  const tab = TABS.find((entry) => entry.id === tabParam)?.id ?? "details";

  const testCase = await getCaseDetail(caseId);
  if (!testCase) notFound();
  const access = await getProjectForPage(testCase.projectId);
  if (!access) notFound();

  const sections = await getSections(testCase.projectId);
  const canManage = hasPermission(access.role, "case:manage") && !access.project.archived;
  const label = caseLabel(testCase.caseNumber);

  return (
    <>
      <Link href="/cases" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Test Cases
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{label}</span> · {sectionPath(sections, testCase.sectionId)}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight break-words md:text-3xl">{testCase.title}</h1>
        </div>
        {canManage && <CaseActions caseId={testCase.id} projectId={testCase.projectId} label={label} />}
      </div>

      <nav aria-label="Case sections" className="mb-5 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((entry) => (
          <Link
            key={entry.id}
            href={entry.id === "details" ? `/cases/${caseId}` : `/cases/${caseId}?tab=${entry.id}`}
            scroll={false}
            aria-current={tab === entry.id ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              tab === entry.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {entry.label}
          </Link>
        ))}
      </nav>

      {tab === "details" && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="space-y-5">
            {testCase.preconditions && (
              <GlassCard className="p-5">
                <h2 className="mb-2 font-semibold tracking-tight">Preconditions</h2>
                <div className="rich-text text-sm" dangerouslySetInnerHTML={{ __html: sanitizeRichText(testCase.preconditions) }} />
              </GlassCard>
            )}
            <GlassCard className="p-5">
              <h2 className="mb-3 font-semibold tracking-tight">Steps</h2>
              {testCase.steps.length === 0 ? (
                <p className="text-sm text-muted-foreground">This case has no steps yet.</p>
              ) : (
                <ol className="divide-y divide-border">
                  {testCase.steps.map((step, index) => (
                    <li key={step.id} className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[2rem_1fr_1fr]">
                      <span className="font-mono text-sm text-muted-foreground tabular-nums">{index + 1}</span>
                      <p className="text-sm whitespace-pre-wrap">{step.action}</p>
                      <p className="text-sm whitespace-pre-wrap text-muted-foreground">{step.expectedResult}</p>
                    </li>
                  ))}
                </ol>
              )}
            </GlassCard>
            <GlassCard className="p-5">
              <h2 className="mb-3 font-semibold tracking-tight">Attachments</h2>
              <CaseAttachments
                projectId={testCase.projectId}
                caseId={testCase.id}
                initial={await getCaseAttachments(caseId)}
                currentUserId={access.user.id}
                canUpload={hasPermission(access.role, "attachment:upload") && !access.project.archived}
                canModerate={canManage}
              />
            </GlassCard>
          </div>
          <GlassCard className="h-fit p-5">
            <dl className="space-y-3 text-sm">
              <Fact label="Priority"><PriorityBadge priority={testCase.priority} /></Fact>
              <Fact label="Type">{CASE_TYPE_LABELS[testCase.type]}</Fact>
              <Fact label="Estimate">{testCase.estimate === null ? "–" : `${testCase.estimate} min`}</Fact>
              <Fact label="References">{testCase.references || "–"}</Fact>
              <Fact label="Tags">
                {testCase.tags.length ? (
                  <span className="flex flex-wrap justify-end gap-1">
                    {testCase.tags.map((tag) => (
                      <span key={tag} className="rounded-md bg-accent px-1.5 py-0.5 text-xs">{tag}</span>
                    ))}
                  </span>
                ) : (
                  "–"
                )}
              </Fact>
              <Fact label="Created">{testCase.createdBy.name}<br /><span className="text-xs text-muted-foreground">{formatDateTime(testCase.createdAt)}</span></Fact>
              <Fact label="Updated">{testCase.updatedBy.name}<br /><span className="text-xs text-muted-foreground">{formatDateTime(testCase.updatedAt)}</span></Fact>
            </dl>
          </GlassCard>
        </div>
      )}

      {tab === "history" && <HistoryTab caseId={caseId} />}
      {tab === "results" && <ResultsTab caseId={caseId} cursor={cursor} />}
      {tab === "bugs" && <BugsTab caseId={caseId} canReport={hasPermission(access.role, "bug:report") && !access.project.archived} />}
      {tab === "comments" && (
        <GlassCard className="p-5">
          <CommentsPanel
            caseId={caseId}
            comments={await getCaseComments(caseId)}
            currentUser={{ id: access.user.id, name: access.user.name }}
            canComment={hasPermission(access.role, "comment:create") && !access.project.archived}
            canModerate={canManage}
          />
        </GlassCard>
      )}
    </>
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

async function HistoryTab({ caseId }: { caseId: string }) {
  const versions = await getCaseVersions(caseId);
  return (
    <ol className="space-y-3">
      {versions.map((version, index) => {
        const isFirst = !version.previous && index === versions.length - 1;
        const changes = version.snapshot && version.previous ? diffSnapshots(version.previous, version.snapshot, richTextToPlain) : [];
        return (
          <li key={version.id}>
            <GlassCard className="p-4">
              <p className="text-sm">
                <span className="font-medium">{version.changedBy.name}</span> {isFirst ? "created this case" : "made changes"}
                <span className="ml-2 text-xs text-muted-foreground">{formatDateTime(version.createdAt)}</span>
              </p>
              {changes.length > 0 && (
                <dl className="mt-3 space-y-2">
                  {changes.map((change) => (
                    <div key={change.field} className="grid gap-1 text-sm sm:grid-cols-[7rem_1fr]">
                      <dt className="text-xs font-medium text-muted-foreground sm:pt-1">{change.field}</dt>
                      <dd className="min-w-0 space-y-1">
                        {change.before && (
                          <p className="rounded-md bg-status-failed/10 px-2 py-1 break-words whitespace-pre-wrap">
                            <span className="sr-only">Before: </span>
                            <span aria-hidden className="mr-1.5 font-mono text-status-failed">−</span>
                            {change.before}
                          </p>
                        )}
                        {change.after && (
                          <p className="rounded-md bg-status-passed/10 px-2 py-1 break-words whitespace-pre-wrap">
                            <span className="sr-only">After: </span>
                            <span aria-hidden className="mr-1.5 font-mono text-status-passed">+</span>
                            {change.after}
                          </p>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </GlassCard>
          </li>
        );
      })}
      {versions.length === 0 && <p className="text-sm text-muted-foreground">No history recorded yet.</p>}
    </ol>
  );
}

async function BugsTab({ caseId, canReport }: { caseId: string; canReport: boolean }) {
  const bugs = await getCaseBugs(caseId);
  return (
    <GlassCard className="p-5">
      {bugs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bugs are linked to this case.</p>
      ) : (
        <ul className="divide-y divide-border">
          {bugs.map((bug) => (
            <li key={bug.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
              <span className="font-mono text-xs text-muted-foreground">B{bug.bugNumber}</span>
              <Link href={`/bugs/${bug.id}`} className="min-w-0 flex-1 truncate font-medium hover:text-primary">{bug.title}</Link>
              <PriorityBadge priority={bug.severity} />
              <BugStatusBadge status={bug.status} />
            </li>
          ))}
        </ul>
      )}
      {canReport && (
        <Button asChild variant="outline" className="mt-4">
          <Link href={`/bugs/new?case=${caseId}`}>Report a bug</Link>
        </Button>
      )}
    </GlassCard>
  );
}

async function ResultsTab({ caseId, cursor }: { caseId: string; cursor?: string }) {
  const { rows, nextCursor } = await getCaseResults(caseId, cursor);
  return (
    <>
      <ul className="space-y-3">
        {rows.map((result) => (
          <li key={result.id}>
            <GlassCard className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={result.status} />
                <Link href={`/runs/${result.runCase.run.id}`} className="text-sm font-medium hover:text-primary">{result.runCase.run.name}</Link>
                {result.runCase.run.environment && <span className="text-xs text-muted-foreground">{result.runCase.run.environment}</span>}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {result.createdBy.name} · {formatDateTime(result.createdAt)}
                {result.elapsedSeconds !== null && ` · ${formatDuration(result.elapsedSeconds)}`}
                {result.defectRef && <> · Defect <span className="font-mono">{result.defectRef}</span></>}
              </p>
              {result.comment && <p className="mt-2 text-sm whitespace-pre-wrap">{result.comment}</p>}
              {result.actualResult && (
                <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
                  <span className="font-medium">Actual:</span> {result.actualResult}
                </p>
              )}
              {result.attachments.length > 0 && (
                <div className="mt-3">
                  <AttachmentGallery items={result.attachments} readOnly />
                </div>
              )}
            </GlassCard>
          </li>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">This case hasn&apos;t been executed in a run yet.</p>}
      </ul>
      {(nextCursor || cursor) && (
        <div className="mt-4 flex gap-2">
          {cursor && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/cases/${caseId}?tab=results`} scroll={false}>Newest</Link>
            </Button>
          )}
          {nextCursor && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/cases/${caseId}?tab=results&cursor=${nextCursor}`} scroll={false}>Older</Link>
            </Button>
          )}
        </div>
      )}
    </>
  );
}
