"use client";

import { LazyDialogTrigger } from "@/components/ui/lazy-dialog-trigger";
import type { ProjectFormInput } from "@/lib/validations/project";

const load = () => import("./project-form-dialog").then((mod) => mod.ProjectFormDialog);

export function ProjectFormButton({ project, trigger }: { project?: ProjectFormInput & { id: string }; trigger: React.ReactElement<{ onClick?: () => void }> }) {
  return <LazyDialogTrigger load={load} props={{ project }} trigger={trigger} />;
}
