"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

const CommandMenu = dynamic(() => import("./command-menu").then((mod) => mod.CommandMenu), { ssr: false });

export function SearchButton() {
  const [open, setOpen] = useState(false);
  // The palette's code only loads the first time it is opened.
  const [loaded, setLoaded] = useState(false);

  function show() {
    setLoaded(true);
    setOpen(true);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setLoaded(true);
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="glass flex h-9 items-center gap-2 rounded-xl px-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:w-64 sm:px-3"
        aria-label="Search or jump to… Ctrl K"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="hidden sm:inline">Search or jump to…</span>
        <kbd className="ml-auto hidden rounded-md border px-1.5 py-0.5 font-mono text-[10px] sm:inline">Ctrl K</kbd>
      </button>
      {loaded && <CommandMenu open={open} onOpenChange={setOpen} />}
    </>
  );
}
