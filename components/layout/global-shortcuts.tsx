"use client";

import { useEffect, useState } from "react";

export const SHOW_SHORTCUTS_EVENT = "tv:show-shortcuts";

const loadDialog = () => import("./shortcuts-dialog").then((mod) => mod.ShortcutsDialog);
type DialogComponent = Awaited<ReturnType<typeof loadDialog>>;

export function GlobalShortcuts() {
  const [Dialog, setDialog] = useState<DialogComponent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () =>
      void loadDialog().then((loaded) => {
        setDialog(() => loaded);
        setOpen(true);
      });
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "?" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      event.preventDefault();
      show();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(SHOW_SHORTCUTS_EVENT, show);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(SHOW_SHORTCUTS_EVENT, show);
    };
  }, []);

  return Dialog ? <Dialog open={open} onOpenChange={setOpen} /> : null;
}
