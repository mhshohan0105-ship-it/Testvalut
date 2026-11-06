"use client";

import { Ban, CircleSlash, RotateCw, X, type LucideIcon } from "lucide-react";
import type { TestStatus } from "@/generated/prisma/enums";
import { STATUS_LABELS } from "@/lib/constants/testing";
import { cn } from "@/lib/utils";

const TONE: Partial<Record<TestStatus, { icon?: LucideIcon; className: string }>> = {
  PASSED: { className: "text-status-passed" },
  FAILED: { icon: X, className: "text-status-failed result-shake" },
  BLOCKED: { icon: Ban, className: "text-status-blocked" },
  RETEST: { icon: RotateCw, className: "text-status-retest" },
  SKIPPED: { icon: CircleSlash, className: "text-status-skipped" },
};

/**
 * Plays over the screen after a status is set: the case on the front turns over to show the result.
 * It's decoration, so it's hidden from assistive tech, ignores the pointer, and never delays the next case.
 */
export function ResultFlip({ status, title, comment, onDone }: { status: TestStatus; title: string; comment: string; onDone: () => void }) {
  const tone = TONE[status];
  const Icon = tone?.icon;

  return (
    <div className="result-flip" aria-hidden onAnimationEnd={(event) => event.target === event.currentTarget && onDone()}>
      <div className="result-flip-inner">
        <div className="result-face">
          <p className="truncate text-sm font-semibold">{title}</p>
        </div>
        <div className="result-face result-face-back">
          <span className={cn("shrink-0", tone?.className)}>
            {Icon ? (
              <Icon className="size-8" />
            ) : (
              <svg viewBox="0 0 24 24" className="result-check size-8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>
          <div className="min-w-0">
            <p className={cn("font-semibold", tone?.className?.split(" ")[0])}>{STATUS_LABELS[status]}</p>
            <p className="truncate text-xs text-muted-foreground">{comment || title}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
