"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { NavList } from "./nav-list";

export function MobileNavSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetTitle className="px-3.5 pt-1 text-base">Navigate</SheetTitle>
        <div data-sidebar="expanded">
          <NavList onNavigate={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
