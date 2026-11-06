"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useActiveWhileVisible, useCanRender3D } from "@/lib/utils/webgl";

const LoginScene = dynamic(() => import("./login-scene"), { ssr: false });

/** The CSS orb paints first. It cross-fades to the 3D scene once that's ready, and stays if WebGL can't run. */
export function AuthVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const canRender = useCanRender3D();
  const active = useActiveWhileVisible(ref);
  const [ready, setReady] = useState(false);

  return (
    <div ref={ref} className="relative size-80">
      <div className={cn("orb-placeholder orb-float absolute inset-4 transition-opacity duration-500", ready && "opacity-0")} />
      {canRender && (
        <div className={cn("absolute -inset-10 transition-opacity duration-500", ready ? "opacity-100" : "opacity-0")}>
          <LoginScene active={active} onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  );
}
