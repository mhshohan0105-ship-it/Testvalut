"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Fades and lifts its content the first time it scrolls into view. */
export function Reveal({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setShown(true);
      observer.disconnect();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("transition-[opacity,transform] duration-300 ease-out motion-reduce:translate-y-0", shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0 print:translate-y-0 print:opacity-100", className)}>
      {children}
    </div>
  );
}
