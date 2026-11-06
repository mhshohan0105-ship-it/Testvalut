"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronsLeft } from "lucide-react";
import { DemoBanner } from "./demo-banner";
import { LogoMark, Wordmark } from "./logo";
import { CHIP_CLASS, NavList, ROW_CLASS } from "./nav-list";

const ONE_YEAR = 60 * 60 * 24 * 365;

export function AppShell({
  defaultCollapsed,
  topBar,
  children,
}: {
  defaultCollapsed: boolean;
  topBar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `tv-sidebar=${next ? "collapsed" : "expanded"}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  }

  return (
    <div data-sidebar={collapsed ? "collapsed" : "expanded"}>
      <aside
        className="sb-panel fixed inset-y-0 left-0 z-40 hidden w-(--sidebar-width) flex-col border-r border-(--glass-border) bg-(--sidebar-surface) p-3 shadow-[inset_-1px_0_0_var(--glass-highlight)] backdrop-blur-xl md:flex"
        aria-label="Sidebar"
      >
        <Link href="/dashboard" aria-label="TestVault home" className="mb-5 flex h-10 items-center rounded-xl pl-1.5">
          <span className="sb-pin flex shrink-0">
            <LogoMark />
          </span>
          <span className="sb-label ml-2.5">
            <Wordmark className="text-[17px]" />
          </span>
        </Link>

        <NavList />

        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`${ROW_CLASS} mt-auto`}
        >
          <span className="sb-rowbg absolute inset-0 rounded-xl bg-accent" />
          <span className="sb-pin relative size-5 shrink-0">
            <span className={CHIP_CLASS} />
            <ChevronsLeft className="sb-collapse-icon relative size-5" aria-hidden />
          </span>
          <span className="sb-label relative ml-3">Collapse</span>
        </button>
      </aside>

      <div className="shell-main flex min-h-dvh flex-col">
        <DemoBanner />
        {topBar}
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
