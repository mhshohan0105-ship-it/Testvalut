"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { Check, ChevronsUpDown, FolderKanban } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setActiveProject } from "@/server/actions/preferences";

type ProjectOption = { id: string; name: string; key: string; color: string };

export function ProjectSwitcher({ projects, activeId }: { projects: ProjectOption[]; activeId: string | null }) {
  const [optimisticId, setOptimisticId] = useOptimistic(activeId);
  const [, startTransition] = useTransition();
  const active = projects.find((project) => project.id === optimisticId);

  function select(id: string) {
    startTransition(async () => {
      setOptimisticId(id);
      const result = await setActiveProject(id);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="glass flex h-9 max-w-56 min-w-0 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors hover:bg-accent">
        {active ? (
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: active.color }} aria-hidden />
        ) : (
          <FolderKanban className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <span className="truncate">{active?.name ?? "No project"}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Switch project</DropdownMenuLabel>
        {projects.length === 0 && <p className="px-2 py-1.5 text-sm text-muted-foreground">You&apos;re not on a project yet.</p>}
        {projects.map((project) => (
          <DropdownMenuItem key={project.id} onSelect={() => select(project.id)}>
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} aria-hidden />
            <span className="truncate">{project.name}</span>
            <span className="ml-auto font-mono text-xs text-muted-foreground">{project.key}</span>
            {project.id === optimisticId && <Check className="text-primary" aria-label="Current project" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/projects">
            <FolderKanban /> All projects
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
