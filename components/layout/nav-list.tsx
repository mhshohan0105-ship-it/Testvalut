"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";

export const ROW_CLASS =
  "sb-row group relative flex h-10 w-full items-center rounded-xl pl-3.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground data-[active=true]:text-foreground";
const ROW_BG_CLASS = "sb-rowbg absolute inset-0 rounded-xl bg-accent";
export const CHIP_CLASS = "sb-chip absolute -inset-2.5 rounded-xl bg-accent";

export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            data-active={active}
            aria-current={active ? "page" : undefined}
            aria-label={label}
            className={ROW_CLASS}
          >
            <span className={ROW_BG_CLASS} />
            <span className="sb-pin relative size-5 shrink-0">
              <span className={CHIP_CLASS} />
              <Icon className={`relative size-5 ${active ? "text-primary" : ""}`} aria-hidden />
              <span className="sb-tip glass-overlay pointer-events-none absolute top-1/2 left-full z-50 ml-5 rounded-lg px-2.5 py-1 text-xs whitespace-nowrap text-popover-foreground">
                {label}
              </span>
            </span>
            <span className="sb-label relative ml-3 truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
