"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { LogoMark } from "@/components/layout/logo";
import { cn } from "@/lib/utils";
import { useActiveWhileVisible, useCanRender3D } from "@/lib/utils/webgl";

const LoginScene = dynamic(() => import("./login-scene"), { ssr: false });

/** The flat logo paints first. It cross-fades to the 3D scene once that's ready, and stays if WebGL can't run. */
export function AuthVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const canRender = useCanRender3D();
  const active = useActiveWhileVisible(ref);
  const [ready, setReady] = useState(false);

  return (
    <div ref={ref} className="relative size-80">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgb(124_58_237/0.35),rgb(34_211_238/0.1)_45%,transparent_70%)]" />
      <div className={cn("orb-float absolute inset-14 transition-opacity duration-500", ready && "opacity-0")}>
        <LogoMark className="size-full" />
      </div>
      {canRender && (
        <div className={cn("absolute -inset-10 transition-opacity duration-500", ready ? "opacity-100" : "opacity-0")}>
          <LoginScene active={active} onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  );
}
