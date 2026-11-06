"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { TiltEngine } from "./tilt-engine";

export function TiltCard({ className, children }: { className?: string; children: React.ReactNode }) {
  const card = useRef<HTMLDivElement>(null);
  const shine = useRef<HTMLSpanElement>(null);
  const engine = useRef<TiltEngine | null>(null);
  const requested = useRef(false);
  const pointer = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => () => engine.current?.destroy(), []);

  function trackPointer(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    pointer.current = { x: (event.clientX - rect.left) / rect.width - 0.5, y: (event.clientY - rect.top) / rect.height - 0.5 };
  }

  function onPointerEnter(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || requested.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    requested.current = true;
    trackPointer(event);
    void import("./tilt-engine").then(({ createTilt }) => {
      if (!card.current || !shine.current) return;
      engine.current = createTilt(card.current, shine.current);
      if (pointer.current) engine.current.move(pointer.current.x, pointer.current.y);
    });
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    trackPointer(event);
    if (pointer.current) engine.current?.move(pointer.current.x, pointer.current.y);
  }

  function onPointerLeave() {
    pointer.current = null;
    engine.current?.leave();
  }

  return (
    <div className="h-full [perspective:900px]">
      <div ref={card} onPointerEnter={onPointerEnter} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} className={cn("glass relative overflow-hidden rounded-2xl", className)}>
        {children}
        <span ref={shine} aria-hidden className="tilt-shine pointer-events-none absolute inset-0 opacity-0" />
      </div>
    </div>
  );
}
