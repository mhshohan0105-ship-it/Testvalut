"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useActiveWhileVisible, useCanRender3D } from "@/lib/utils/webgl";

const EmptyScene = dynamic(() => import("@/components/features/three/empty-scene"), { ssr: false });

/** The icon tile is the first paint and the fallback. A floating 3D shape replaces it when the device can run one. */
export function EmptyShape({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const canRender = useCanRender3D();
  const active = useActiveWhileVisible(ref);
  const [ready, setReady] = useState(false);

  return (
    <div ref={ref} className="relative mb-5 flex size-24 items-center justify-center">
      <span className={cn("glass flex size-14 items-center justify-center rounded-2xl transition-opacity duration-300", ready && "opacity-0")}>{children}</span>
      {canRender && (
        <div className={cn("absolute inset-0 transition-opacity duration-300", ready ? "opacity-100" : "opacity-0")}>
          <EmptyScene active={active} onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  );
}
