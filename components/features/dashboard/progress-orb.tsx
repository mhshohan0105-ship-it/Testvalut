"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { useActiveWhileVisible, useCanRender3D } from "@/lib/utils/webgl";

// three.js only downloads for browsers that will actually show the scene.
const OrbScene = dynamic(() => import("./orb-scene"), { ssr: false });

export function ProgressOrb({ percent }: { percent: number | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const canRender = useCanRender3D();
  const active = useActiveWhileVisible(ref);
  const value = percent ?? 0;
  const showScene = canRender && percent !== null;

  return (
    <div ref={ref} className="relative size-40 shrink-0 md:size-48" role="img" aria-label={percent === null ? "No results yet" : `Overall pass rate ${percent}%`}>
      {showScene ? (
        <div className="absolute inset-0">
          {/* Sits behind the transparent canvas, so the number stays readable while three.js loads. */}
          <div className="absolute inset-[28%] rounded-full bg-indigo-700" />
          <OrbScene percent={value} active={active} />
        </div>
      ) : (
        // The first paint, and the fallback without WebGL or with reduced motion.
        <div
          className="absolute inset-3 rounded-full"
          style={{
            background: `conic-gradient(var(--status-passed) ${value}%, var(--muted) ${value}% 100%)`,
            mask: "radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px))",
          }}
        />
      )}
      <div className={cn("pointer-events-none absolute inset-0 flex flex-col items-center justify-center", showScene && "text-white")}>
        <span className="font-mono text-3xl font-semibold tabular-nums">{percent === null ? "–" : `${percent}%`}</span>
        <span className={cn("text-xs", showScene ? "text-white/80" : "text-muted-foreground")}>pass rate</span>
      </div>
    </div>
  );
}
