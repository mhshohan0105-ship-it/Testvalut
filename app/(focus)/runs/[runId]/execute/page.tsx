import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExecutionView } from "@/components/features/runs/execution-view";
import { hasPermission } from "@/lib/auth/permissions";
import { getProjectForPage } from "@/lib/auth/project-access";
import { getRun, getRunQueue } from "@/server/queries/runs";

export const metadata: Metadata = { title: "Execute run" };

export default async function ExecutePage({
  params,
  searchParams,
}: {
  params: Promise<{ runId: string }>;
  searchParams: Promise<{ case?: string }>;
}) {
  const { runId } = await params;
  const { case: requestedCase } = await searchParams;
  const run = await getRun(runId);
  if (!run) notFound();
  const access = await getProjectForPage(run.projectId);
  if (!access) notFound();

  const queue = await getRunQueue(runId);
  const initialId = queue.find((item) => item.id === requestedCase)?.id ?? queue.find((item) => item.status === "UNTESTED")?.id ?? queue[0]?.id ?? null;

  return (
    <ExecutionView
      key={run.id}
      run={{ id: run.id, name: run.name, environment: run.environment }}
      initialQueue={queue}
      initialId={initialId}
      canExecute={run.status === "ACTIVE" && hasPermission(access.role, "result:create") && !access.project.archived}
      canManage={run.status === "ACTIVE" && hasPermission(access.role, "run:manage") && !access.project.archived}
      closed={run.status === "COMPLETED"}
    />
  );
}
