"use client";

import { useState } from "react";
import { Menu as MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const loadSheet = () => import("./mobile-nav-sheet").then((mod) => mod.MobileNavSheet);
type Sheet = Awaited<ReturnType<typeof loadSheet>>;

export function MobileNav() {
  const [SheetComponent, setSheetComponent] = useState<Sheet | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() =>
          void loadSheet().then((loaded) => {
            setSheetComponent(() => loaded);
            setOpen(true);
          })
        }
      >
        <MenuIcon />
      </Button>
      {SheetComponent && <SheetComponent open={open} onOpenChange={setOpen} />}
    </>
  );
}
