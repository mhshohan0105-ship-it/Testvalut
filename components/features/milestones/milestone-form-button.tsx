"use client";

import { LazyDialogTrigger } from "@/components/ui/lazy-dialog-trigger";
import type { MilestoneFormInput } from "@/lib/validations/milestone";

const load = () => import("./milestone-form-dialog").then((mod) => mod.MilestoneFormDialog);

export function MilestoneFormButton({
  projectId,
  milestone,
  trigger,
}: {
  projectId: string;
  milestone?: MilestoneFormInput & { id: string };
  trigger: React.ReactElement<{ onClick?: () => void }>;
}) {
  return <LazyDialogTrigger load={load} props={{ projectId, milestone }} trigger={trigger} />;
}
