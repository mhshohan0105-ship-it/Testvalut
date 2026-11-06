"use client";

import { useState } from "react";
import { initials } from "@/lib/utils";

export const USER_TRIGGER_CLASS = "btn-gradient flex size-9 items-center justify-center rounded-full text-xs font-semibold text-white";

/** Starts with the visible initials, so voice-control users can say what they see. */
export function userMenuLabel(name: string) {
  return `${initials(name)}, account menu for ${name}`;
}

const loadMenu = () => import("./user-menu-dropdown").then((mod) => mod.UserMenuDropdown);
type Menu = Awaited<ReturnType<typeof loadMenu>>;

export function UserMenu({ name, email, roleLabel }: { name: string; email: string; roleLabel: string }) {
  const [Menu, setMenu] = useState<Menu | null>(null);

  if (Menu) return <Menu name={name} email={email} roleLabel={roleLabel} />;

  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-label={userMenuLabel(name)}
      className={USER_TRIGGER_CLASS}
      onPointerEnter={() => void loadMenu()}
      onFocus={() => void loadMenu()}
      onClick={() => void loadMenu().then((loaded) => setMenu(() => loaded))}
    >
      {initials(name)}
    </button>
  );
}
