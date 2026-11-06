"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Ban, Bug, Check, ChevronLeft, ChevronRight, CircleSlash, Lock, PartyPopper, RotateCw, Timer, X, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { AttachmentGallery } from "@/components/ui/attachment-gallery";
import { PriorityBadge, StatusBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/ui/file-uploader";
import { Textarea } from "@/components/ui/form-controls";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { TestStatus } from "@/generated/prisma/enums";
import type { AttachmentView } from "@/lib/constants/attachments";
import { STATUS_ORDER, summarizeCounts, type StatusCounts } from "@/lib/constants/status";
import { CASE_TYPE_LABELS, STATUS_LABELS } from "@/lib/constants/testing";
import { cn } from "@/lib/utils";
import { caseLabel, formatDateTime, formatDuration } from "@/lib/utils/format";
import { closeRun, recordResult } from "@/server/actions/runs";
import type { RunCaseDetail } from "@/server/queries/runs";
import { ResultFlip } from "./result-flip";
import { RunProgress } from "./run-progress";

type QueueItem = { id: string; status: TestStatus };
type StepMark = "PASSED" | "FAILED";
type Draft = { comment: string; actualResult: string; defectRef: string; marks: Record<number, StepMark>; attachments: AttachmentView[] };

const EMPTY_DRAFT: Draft = { comment: "", actualResult: "", defectRef: "", marks: {}, attachments: [] };

type ResultStatus = Exclude<TestStatus, "UNTESTED">;

const STATUS_BUTTONS: { status: ResultStatus; key: string; icon: LucideIcon; className: string }[] = [
  { status: "PASSED", key: "P", icon: Check, className: "border-status-passed/40 bg-status-passed/10 text-status-passed hover:bg-status-passed/20" },
  { status: "FAILED", key: "F", icon: X, className: "border-status-failed/40 bg-status-failed/10 text-status-failed hover:bg-status-failed/20" },
  { status: "BLOCKED", key: "B", icon: Ban, className: "border-status-blocked/40 bg-status-blocked/10 text-status-blocked hover:bg-status-blocked/20" },
  { status: "RETEST", key: "R", icon: RotateCw, className: "border-status-retest/40 bg-status-retest/10 text-status-retest hover:bg-status-retest/20" },
  { status: "SKIPPED", key: "S", icon: CircleSlash, className: "border-status-skipped/40 bg-status-skipped/10 text-status-skipped hover:bg-status-skipped/20" },
];

// Typed but unsubmitted notes survive moving between cases, and leave with the page.
const drafts = new Map<string, Draft>();

function saveDraft(runCaseId: string, draft: Draft) {
  drafts.set(runCaseId, draft);
  return draft;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function ExecutionView({
  run,
  currentUserId,
  initialQueue,
  initialId,
  canExecute,
  canManage,
  closed,
}: {
  run: { id: string; projectId: string; name: string; environment: string | null };
  currentUserId: string;
  initialQueue: QueueItem[];
  initialId: string | null;
  canExecute: boolean;
  canManage: boolean;
  closed: boolean;
}) {
  const router = useRouter();
  const [queue, setQueue] = useState(initialQueue);
  const [currentId, setCurrentId] = useState(initialId);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [finished, setFinished] = useState(false);
  const [details, setDetails] = useState<Record<string, RunCaseDetail>>({});
  const [failedLoad, setFailedLoad] = useState<string | null>(null);
  const [flip, setFlip] = useState<{ key: number; status: ResultStatus; title: string; comment: string } | null>(null);
  const requested = useRef(new Set<string>());
  const openedAt = useRef(0);

  const index = queue.findIndex((item) => item.id === currentId);
  const current = index >= 0 ? queue[index] : undefined;
  const detail = currentId ? details[currentId] : undefined;

  const counts: StatusCounts = {};
  for (const item of queue) counts[item.status] = (counts[item.status] ?? 0) + 1;
  const { total, done } = summarizeCounts(counts);

  async function loadDetail(id: string) {
    if (requested.current.has(id)) return;
    requested.current.add(id);
    try {
      const response = await fetch(`/api/runs/${run.id}/cases/${id}`);
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as RunCaseDetail;
      setDetails((existing) => ({ ...existing, [id]: data }));
    } catch (error) {
      console.error(error);
      requested.current.delete(id);
      setFailedLoad(id);
    }
  }

  // Loads the case on screen and the likely next ones, so moving forward shows no loading state.
  useEffect(() => {
    if (index < 0) return;
    const nextUntested = [...queue.slice(index + 1), ...queue.slice(0, index)].filter((item) => item.status === "UNTESTED").slice(0, 2);
    const nearby = [...queue.slice(index, index + 2), ...queue.slice(Math.max(index - 1, 0), index), ...nextUntested];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state only changes after the fetch resolves
    for (const item of nearby) void loadDetail(item.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to moving between cases only
  }, [currentId]);

  // The timer restarts each time a case opens.
  useEffect(() => {
    openedAt.current = Date.now();
    if (currentId) window.history.replaceState(null, "", `/runs/${run.id}/execute?case=${currentId}`);
  }, [currentId, run.id]);

  function goTo(id: string, nextDirection: "next" | "prev") {
    setDirection(nextDirection);
    setFinished(false);
    setCurrentId(id);
  }

  function move(offset: 1 | -1) {
    const target = queue[index + offset];
    if (target) goTo(target.id, offset === 1 ? "next" : "prev");
  }

  function setStatus(status: ResultStatus) {
    if (!canExecute || !current || !currentId) return;
    const runCaseId = currentId;
    const previousStatus = current.status;
    const draft = drafts.get(runCaseId) ?? EMPTY_DRAFT;
    const elapsedSeconds = Math.round((Date.now() - openedAt.current) / 1000);

    const nextQueue = queue.map((item) => (item.id === runCaseId ? { ...item, status } : item));
    setQueue(nextQueue);
    drafts.delete(runCaseId);
    setFlip({ key: Date.now(), status, title: detail?.testCase.title ?? "", comment: draft.comment });

    // Next untested case after this one, wrapping around to any that were skipped over.
    const after = [...nextQueue.slice(index + 1), ...nextQueue.slice(0, index)];
    const next = after.find((item) => item.status === "UNTESTED");
    if (next) goTo(next.id, "next");
    else setFinished(true);

    void (async () => {
      const result = await recordResult({
        runCaseId,
        status,
        comment: draft.comment,
        actualResult: draft.actualResult,
        defectRef: draft.defectRef,
        elapsedSeconds,
        stepResults: Object.entries(draft.marks).map(([order, mark]) => ({ order: Number(order), status: mark })),
        attachmentIds: draft.attachments.map((attachment) => attachment.id),
      });
      if (result.ok) {
        // The history shown for this case is now out of date.
        requested.current.delete(runCaseId);
        setDetails((existing) => {
          const rest = { ...existing };
          delete rest[runCaseId];
          return rest;
        });
        return;
      }
      setQueue((items) => items.map((item) => (item.id === runCaseId ? { ...item, status: previousStatus } : item)));
      drafts.set(runCaseId, draft);
      setFinished(false);
      toast.error(result.error);
    })();
  }

  // After an optimistic result clears the cache, a revisit has to load the case again.
  useEffect(() => {
    if (currentId && !details[currentId] && !requested.current.has(currentId)) void loadDetail(currentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the cache entry disappears
  }, [details]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) {
        if (event.key === "Escape") (event.target as HTMLElement).blur();
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "j") move(1);
      else if (key === "k") move(-1);
      else if (key === "c" && canExecute) {
        event.preventDefault();
        document.getElementById("result-comment")?.focus();
      } else {
        const match = STATUS_BUTTONS.find((button) => button.key.toLowerCase() === key);
        if (match) setStatus(match.status);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function close() {
    const result = await closeRun(run.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Run closed. It's now read only.");
    router.push(`/runs/${run.id}`);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {flip && <ResultFlip key={flip.key} status={flip.status} title={flip.title} comment={flip.comment} onDone={() => setFlip(null)} />}
      <header className="sticky top-0 z-30 border-b border-(--glass-border) bg-(--topbar-surface) backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3 px-3 md:px-6">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/runs/${run.id}`}>
              <ChevronLeft /> <span className="hidden sm:inline">Exit</span>
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{run.name}</p>
            {run.environment && <p className="truncate text-xs text-muted-foreground">{run.environment}</p>}
          </div>
          {closed && (
            <span className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
              <Lock className="size-3" aria-hidden /> Read only
            </span>
          )}
          {canExecute && currentId && !finished && <ElapsedTimer key={currentId} />}
          <p className="font-mono text-sm tabular-nums" aria-label={`${done} of ${total} executed`}>
            {done}<span className="text-muted-foreground">/{total}</span>
          </p>
        </div>
        <RunProgress counts={counts} className="h-1 rounded-none" />
      </header>

      {total === 0 ? (
        <p className="p-10 text-center text-muted-foreground">This run has no cases.</p>
      ) : finished ? (
        <main className="flex flex-1 items-center justify-center p-6">
          <GlassCard className="slide-next w-full max-w-lg p-8 text-center">
            <PartyPopper className="mx-auto size-10 text-primary" aria-hidden />
            <h1 className="mt-3 text-2xl font-bold tracking-tight">Every case has a result</h1>
            <ul className="mt-5 flex flex-wrap justify-center gap-2">
              {STATUS_ORDER.filter((status) => counts[status]).map((status) => (
                <li key={status} className="flex items-center gap-1.5">
                  <StatusBadge status={status} />
                  <span className="font-mono text-sm tabular-nums">{counts[status]}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={() => setFinished(false)}>
                Review cases
              </Button>
              {canManage && (
                <Button variant="outline" onClick={() => void close()}>
                  <Lock /> Close run
                </Button>
              )}
              <Button asChild>
                <Link href={`/runs/${run.id}`}>Back to overview</Link>
              </Button>
            </div>
          </GlassCard>
        </main>
      ) : (
        <main className="mx-auto w-full max-w-7xl flex-1 overflow-x-hidden p-3 md:p-6">
          {!detail || !current ? (
            failedLoad === currentId ? (
              <GlassCard className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Couldn&apos;t load this case.</p>
                <Button
                  className="mt-3"
                  variant="outline"
                  onClick={() => {
                    setFailedLoad(null);
                    if (currentId) void loadDetail(currentId);
                  }}
                >
                  Try again
                </Button>
              </GlassCard>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]" aria-busy="true" aria-label="Loading case">
                <Skeleton className="h-96 rounded-2xl" />
                <Skeleton className="h-96 rounded-2xl" />
              </div>
            )
          ) : (
            <CasePanel
              key={current.id}
              detail={detail}
              projectId={run.projectId}
              currentUserId={currentUserId}
              status={current.status}
              direction={direction}
              canExecute={canExecute}
              position={`${index + 1} of ${total}`}
              onStatus={setStatus}
              onPrev={index > 0 ? () => move(-1) : undefined}
              onNext={index < queue.length - 1 ? () => move(1) : undefined}
            />
          )}
        </main>
      )}

      {canExecute && current && detail && !finished && (
        // On phones the buttons stay within reach of a thumb. This sits outside the sliding panel, whose transform would otherwise capture position: fixed.
        <div className="glass-overlay fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-1.5 rounded-t-2xl p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden" role="group" aria-label="Set result">
          {STATUS_BUTTONS.map(({ status: value, icon: Icon, className }) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              aria-label={STATUS_LABELS[value]}
              className={cn("flex h-13 flex-col items-center justify-center gap-0.5 rounded-xl border text-[11px] font-semibold active:scale-[0.97]", className)}
            >
              <Icon className="size-5" aria-hidden />
              {STATUS_LABELS[value]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ElapsedTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  const minutes = Math.floor(seconds / 60);
  return (
    <span className="hidden items-center gap-1 font-mono text-sm text-muted-foreground tabular-nums sm:flex" role="timer" aria-label="Time on this case">
      <Timer className="size-3.5" aria-hidden />
      {String(minutes).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
    </span>
  );
}

function CasePanel({
  detail,
  projectId,
  currentUserId,
  status,
  direction,
  canExecute,
  position,
  onStatus,
  onPrev,
  onNext,
}: {
  detail: RunCaseDetail;
  projectId: string;
  currentUserId: string;
  status: TestStatus;
  direction: "next" | "prev";
  canExecute: boolean;
  position: string;
  onStatus: (status: ResultStatus) => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const { testCase, results } = detail;
  const [draft, setDraft] = useState<Draft>(() => drafts.get(detail.id) ?? EMPTY_DRAFT);

  function update(change: Partial<Draft>) {
    const next = { ...draft, ...change };
    setDraft(next);
    drafts.set(detail.id, next);
  }

  function mark(order: number, value: StepMark) {
    const marks = { ...draft.marks };
    if (marks[order] === value) delete marks[order];
    else marks[order] = value;
    update({ marks });
  }

  return (
    <div className={cn("grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]", canExecute && "pb-20 lg:pb-0", direction === "next" ? "slide-next" : "slide-prev")}>
      <div className="min-w-0 space-y-4">
        <GlassCard className="p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono text-sm">{caseLabel(testCase.caseNumber)}</span>
            <PriorityBadge priority={testCase.priority} />
            <span>{CASE_TYPE_LABELS[testCase.type]}</span>
            {testCase.estimate !== null && <span>{testCase.estimate} min</span>}
            {testCase.references && <span className="font-mono">{testCase.references}</span>}
            <span className="ml-auto"><StatusBadge status={status} /></span>
          </div>
          <h1 className="mt-2.5 text-xl font-bold tracking-tight break-words md:text-2xl">{testCase.title}</h1>
          {testCase.preconditions && (
            <div className="mt-3 rounded-xl bg-muted px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">Preconditions</p>
              <div className="rich-text mt-0.5 text-sm" dangerouslySetInnerHTML={{ __html: testCase.preconditions }} />
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <h2 className="mb-3 font-semibold tracking-tight">Steps</h2>
          {testCase.steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">This case has no steps.</p>
          ) : (
            <ol className="divide-y divide-border">
              {testCase.steps.map((step, order) => {
                const value = draft.marks[order];
                return (
                  <li key={step.id} className="grid gap-x-3 gap-y-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1.5rem_1fr_1fr_auto]">
                    <span className="font-mono text-sm text-muted-foreground tabular-nums">{order + 1}</span>
                    <p className="text-sm whitespace-pre-wrap">{step.action}</p>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">{step.expectedResult}</p>
                    {canExecute && (
                      <div className="flex gap-1" role="group" aria-label={`Mark step ${order + 1}`}>
                        <button
                          type="button"
                          aria-pressed={value === "PASSED"}
                          aria-label={`Step ${order + 1} passed`}
                          onClick={() => mark(order, "PASSED")}
                          className={cn(
                            "flex size-7 items-center justify-center rounded-md border border-border transition-colors hover:bg-status-passed/15",
                            value === "PASSED" && "border-status-passed bg-status-passed/20 text-status-passed",
                          )}
                        >
                          <Check className="size-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          aria-pressed={value === "FAILED"}
                          aria-label={`Step ${order + 1} failed`}
                          onClick={() => mark(order, "FAILED")}
                          className={cn(
                            "flex size-7 items-center justify-center rounded-md border border-border transition-colors hover:bg-status-failed/15",
                            value === "FAILED" && "border-status-failed bg-status-failed/20 text-status-failed",
                          )}
                        >
                          <X className="size-4" aria-hidden />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </GlassCard>

        {results.length > 0 && (
          <GlassCard className="p-5">
            <h2 className="mb-3 font-semibold tracking-tight">Earlier results</h2>
            <ul className="space-y-3">
              {results.map((result) => (
                <li key={result.id} className="text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={result.status} />
                    <span className="text-xs text-muted-foreground">
                      {result.createdBy.name} · {formatDateTime(result.createdAt)}
                      {result.elapsedSeconds !== null && ` · ${formatDuration(result.elapsedSeconds)}`}
                    </span>
                    {result.defectRef && <span className="font-mono text-xs">{result.defectRef}</span>}
                  </div>
                  {result.comment && <p className="mt-1 whitespace-pre-wrap">{result.comment}</p>}
                  {result.actualResult && (
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                      <span className="font-medium">Actual:</span> {result.actualResult}
                    </p>
                  )}
                  {result.attachments.length > 0 && (
                    <div className="mt-2">
                      <AttachmentGallery items={result.attachments} readOnly />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </GlassCard>
        )}
      </div>

      <div className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
        {canExecute && (
          <GlassCard className="space-y-3 p-4">
            <div className="hidden grid-cols-2 gap-2 lg:grid">
              {STATUS_BUTTONS.map(({ status: value, key, icon: Icon, className }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onStatus(value)}
                  className={cn(
                    "flex h-12 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-[background-color,transform] duration-150 active:scale-[0.97]",
                    value === "PASSED" && "col-span-2 h-14 text-base",
                    className,
                  )}
                >
                  <Icon className="size-5 shrink-0" aria-hidden />
                  {STATUS_LABELS[value]}
                  <kbd className="ml-auto rounded border border-current/30 px-1.5 font-mono text-xs opacity-80">{key}</kbd>
                </button>
              ))}
            </div>
            <div>
              <Label htmlFor="result-comment" className="mb-1.5">Comment</Label>
              <Textarea id="result-comment" className="min-h-16" value={draft.comment} onChange={(event) => update({ comment: event.target.value })} />
            </div>
            <div>
              <Label htmlFor="result-actual" className="mb-1.5">Actual result</Label>
              <Textarea id="result-actual" className="min-h-16" value={draft.actualResult} onChange={(event) => update({ actualResult: event.target.value })} />
            </div>
            <div>
              <Label htmlFor="result-defect" className="mb-1.5">Defect reference</Label>
              <Input id="result-defect" placeholder="SHOP-123 or a URL" className="rounded-xl" value={draft.defectRef} onChange={(event) => update({ defectRef: event.target.value })} />
            </div>
            <div className="space-y-2">
              <AttachmentGallery
                items={draft.attachments}
                currentUserId={currentUserId}
                onDeleted={(id) => setDraft((current) => saveDraft(detail.id, { ...current, attachments: current.attachments.filter((attachment) => attachment.id !== id) }))}
              />
              <FileUploader
                projectId={projectId}
                pasteTarget
                hint="Drop or paste a screenshot, or click"
                onUploaded={(attachment) => setDraft((current) => saveDraft(detail.id, { ...current, attachments: [...current.attachments, attachment] }))}
              />
            </div>
          </GlassCard>
        )}
        {canExecute && (
          <Button asChild variant="outline" className="w-full">
            <a href={`/bugs/new?runCase=${detail.id}`} target="_blank" rel="noreferrer">
              <Bug /> Report a bug
            </a>
          </Button>
        )}
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" onClick={onPrev} disabled={!onPrev}>
            <ChevronLeft /> Prev <kbd className="font-mono text-xs opacity-70">K</kbd>
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">{position}</span>
          <Button variant="outline" onClick={onNext} disabled={!onNext}>
            Next <kbd className="font-mono text-xs opacity-70">J</kbd> <ChevronRight />
          </Button>
        </div>
        {canExecute && <p className="hidden text-center text-xs text-muted-foreground lg:block">Press C to comment, Esc to leave a field.</p>}
      </div>
    </div>
  );
}
