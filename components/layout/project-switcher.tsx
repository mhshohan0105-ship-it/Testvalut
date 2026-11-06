"use client";

import { useState } from "react";
import { ChevronsUpDown, FolderKanban } from "lucide-react";

export type ProjectOption = { id: string; name: string; key: string; color: string };

export const PROJECT_TRIGGER_CLASS = "glass flex h-9 max-w-56 min-w-0 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors hover:bg-accent";

export function ProjectTriggerContent({ active }: { active?: ProjectOption }) {
  return (
    <>
      {active ? (
        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: active.color }} aria-hidden />
      ) : (
        <FolderKanban className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      )}
      <span className="truncate">{active?.name ?? "No project"}</span>
      <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
    </>
  );
}

const loadMenu = () => import("./project-switcher-menu").then((mod) => mod.ProjectSwitcherMenu);
type Menu = Awaited<ReturnType<typeof loadMenu>>;

/** A plain button until first used, so the top bar doesn't download the menu library on every page. */
export function ProjectSwitcher({ projects, activeId }: { projects: ProjectOption[]; activeId: string | null }) {
  const [Menu, setMenu] = useState<Menu | null>(null);

  if (Menu) return <Menu projects={projects} activeId={activeId} />;

  return (
    <button
      type="button"
      aria-haspopup="menu"
      className={PROJECT_TRIGGER_CLASS}
      onPointerEnter={() => void loadMenu()}
      onFocus={() => void loadMenu()}
      onClick={() => void loadMenu().then((loaded) => setMenu(() => loaded))}
    >
      <ProjectTriggerContent active={projects.find((project) => project.id === activeId)} />
    </button>
  );
}
