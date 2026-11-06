"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const SHOW_SHORTCUTS_EVENT = "tv:show-shortcuts";

const GROUPS: { title: string; items: [keys: string[], label: string][] }[] = [
  {
    title: "Anywhere",
    items: [
      [["Ctrl", "K"], "Search and commands"],
      [["?"], "Show this help"],
    ],
  },
  {
    title: "Executing a run",
    items: [
      [["P"], "Passed"],
      [["F"], "Failed"],
      [["B"], "Blocked"],
      [["R"], "Retest"],
      [["S"], "Skipped"],
      [["J"], "Next case"],
      [["K"], "Previous case"],
      [["C"], "Write a comment"],
      [["Esc"], "Leave a text field"],
      [["Ctrl", "V"], "Paste a screenshot"],
    ],
  },
  {
    title: "Editing a case",
    items: [[["Ctrl", "S"], "Save"]],
  },
];

export function GlobalShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "?" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      event.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(SHOW_SHORTCUTS_EVENT, show);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(SHOW_SHORTCUTS_EVENT, show);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription className="sr-only">Keys you can press to work faster.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">{group.title}</h3>
              <ul className="space-y-1.5">
                {group.items.map(([keys, label]) => (
                  <li key={label} className="flex items-center justify-between gap-4 text-sm">
                    {label}
                    <span className="flex gap-1">
                      {keys.map((key) => (
                        <kbd key={key} className="min-w-6 rounded-md border border-border bg-muted px-1.5 py-0.5 text-center font-mono text-xs">
                          {key}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
