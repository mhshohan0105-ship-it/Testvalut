"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FilePlus2, FolderKanban, Keyboard, ListChecks, Moon, PlayCircle, Sun, type LucideIcon } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { caseLabel } from "@/lib/utils/format";
import { setTheme, useTheme } from "@/lib/theme";
import type { SearchResults } from "@/server/queries/search";
import { NAV_ITEMS } from "./nav-items";
import { SHOW_SHORTCUTS_EVENT } from "./global-shortcuts";

const DEBOUNCE_MS = 250;
const NO_RESULTS: SearchResults = { projects: [], cases: [], runs: [] };

export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(NO_RESULTS);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const request = useRef<AbortController | null>(null);

  function run(action: () => void) {
    onOpenChange(false);
    setQuery("");
    setResults(NO_RESULTS);
    action();
  }

  function onQueryChange(value: string) {
    setQuery(value);
    clearTimeout(timer.current);
    request.current?.abort();
    if (!value.trim()) {
      setResults(NO_RESULTS);
      return;
    }
    timer.current = setTimeout(() => {
      const controller = new AbortController();
      request.current = controller;
      fetch(`/api/search?q=${encodeURIComponent(value.trim())}`, { signal: controller.signal })
        .then((response) => (response.ok ? (response.json() as Promise<SearchResults>) : NO_RESULTS))
        .then(setResults)
        .catch(() => {
          // A canceled or failed search just leaves the earlier results showing.
        });
    }, DEBOUNCE_MS);
  }

  const actions: { label: string; icon: LucideIcon; perform: () => void }[] = [
    { label: "New test case", icon: FilePlus2, perform: () => router.push("/cases/new") },
    { label: "New run", icon: PlayCircle, perform: () => router.push("/runs/new") },
    { label: "Keyboard shortcuts", icon: Keyboard, perform: () => window.dispatchEvent(new Event(SHOW_SHORTCUTS_EVENT)) },
    {
      label: `Switch to ${theme === "dark" ? "light" : "dark"} theme`,
      icon: theme === "dark" ? Sun : Moon,
      perform: () => setTheme(theme === "dark" ? "light" : "dark"),
    },
  ];

  const lowered = query.trim().toLowerCase();
  const matches = (label: string) => !lowered || label.toLowerCase().includes(lowered);
  const pages = NAV_ITEMS.filter((item) => matches(item.label));
  const visibleActions = actions.filter((action) => matches(action.label));

  return (
    // Results come from the server, so cmdk's own filtering is turned off.
    <CommandDialog open={open} onOpenChange={onOpenChange} shouldFilter={false} title="Search and commands" description="Jump to a project, case, run or action.">
      <CommandInput placeholder="Search cases, runs, projects, or type C123…" value={query} onValueChange={onQueryChange} />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        {results.cases.length > 0 && (
          <CommandGroup heading="Test cases">
            {results.cases.map((testCase) => (
              <CommandItem key={testCase.id} value={`case-${testCase.id}`} onSelect={() => run(() => router.push(`/cases/${testCase.id}`))}>
                <ListChecks />
                <span className="font-mono text-xs text-muted-foreground">{caseLabel(testCase.caseNumber)}</span>
                <span className="truncate">{testCase.title}</span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">{testCase.project.key}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.runs.length > 0 && (
          <CommandGroup heading="Test runs">
            {results.runs.map((testRun) => (
              <CommandItem key={testRun.id} value={`run-${testRun.id}`} onSelect={() => run(() => router.push(`/runs/${testRun.id}`))}>
                <PlayCircle />
                <span className="truncate">{testRun.name}</span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">{testRun.project.key}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.projects.length > 0 && (
          <CommandGroup heading="Projects">
            {results.projects.map((project) => (
              <CommandItem key={project.id} value={`project-${project.id}`} onSelect={() => run(() => router.push(`/projects/${project.id}`))}>
                <FolderKanban />
                <span className="truncate">{project.name}</span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">{project.key}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {visibleActions.length > 0 && (
          <CommandGroup heading="Actions">
            {visibleActions.map(({ label, icon: Icon, perform }) => (
              <CommandItem key={label} value={`action-${label}`} onSelect={() => run(perform)}>
                <Icon /> {label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {pages.length > 0 && (
          <CommandGroup heading="Go to">
            {pages.map(({ href, label, icon: Icon }) => (
              <CommandItem key={href} value={`page-${href}`} onSelect={() => run(() => router.push(href))}>
                <Icon /> {label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
