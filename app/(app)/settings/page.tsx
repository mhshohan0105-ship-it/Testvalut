import type { Metadata } from "next";
import { HardDrive, TriangleAlert } from "lucide-react";
import { ChangePasswordForm } from "@/components/features/settings/change-password-form";
import { CleanUpFilesButton } from "@/components/features/settings/clean-up-files-button";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { hasPermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { STORAGE_LIMIT_BYTES, STORAGE_WARNING_RATIO, formatBytes } from "@/lib/constants/attachments";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const { _sum, _count } = await db.attachment.aggregate({ _sum: { sizeBytes: true }, _count: { _all: true } });
  const used = _sum.sizeBytes ?? 0;
  const ratio = Math.min(used / STORAGE_LIMIT_BYTES, 1);
  const warning = ratio >= STORAGE_WARNING_RATIO;

  return (
    <>
      <PageHeader title="Settings" description="Workspace preferences and storage." />
      <GlassCard className="max-w-2xl p-5">
        <div className="flex items-center gap-2.5">
          <HardDrive className="size-5 text-primary" aria-hidden />
          <h2 className="font-semibold tracking-tight">Attachment storage</h2>
        </div>
        <p className="mt-3 text-sm tabular-nums">
          <span className="font-mono text-2xl font-semibold">{formatBytes(used)}</span>
          <span className="text-muted-foreground"> of {formatBytes(STORAGE_LIMIT_BYTES)} · {_count._all} {_count._all === 1 ? "file" : "files"}</span>
        </p>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Storage used"
          aria-valuenow={Math.round(ratio * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={cn("h-full origin-left", warning ? "bg-status-blocked" : "bg-primary")} style={{ transform: `scaleX(${ratio})` }} />
        </div>
        {warning && (
          <p className="mt-3 flex items-start gap-2 text-sm text-status-blocked" role="alert">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            Storage is nearly full. The free tier allows 1 GB, so delete old attachments or upgrade your Blob plan before uploads start failing.
          </p>
        )}
        {hasPermission(user.role, "team:manage") && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="max-w-md text-sm text-muted-foreground">Files uploaded to a form that was never saved stay in storage. Clean up the ones older than a day.</p>
            <CleanUpFilesButton />
          </div>
        )}
      </GlassCard>
      <GlassCard className="mt-5 max-w-2xl p-5">
        <h2 className="font-semibold tracking-tight">Your password</h2>
        <ChangePasswordForm />
      </GlassCard>
    </>
  );
}
