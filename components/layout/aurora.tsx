"use client";

import { useEffect, useRef } from "react";

const PARALLAX_PX = 14;

export function Aurora() {
  const layerA = useRef<HTMLDivElement>(null);
  const layerB = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const allowed = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches;
    if (!allowed) return;

    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let frame = 0;

    const tick = () => {
      x += (targetX - x) * 0.06;
      y += (targetY - y) * 0.06;
      if (layerA.current) layerA.current.style.transform = `translate3d(${x * PARALLAX_PX}px, ${y * PARALLAX_PX}px, 0)`;
      if (layerB.current) layerB.current.style.transform = `translate3d(${x * -PARALLAX_PX * 0.6}px, ${y * -PARALLAX_PX * 0.6}px, 0)`;
      const settled = Math.abs(targetX - x) < 0.001 && Math.abs(targetY - y) < 0.001;
      frame = settled ? 0 : requestAnimationFrame(tick);
    };

    const onPointerMove = (event: PointerEvent) => {
      targetX = event.clientX / window.innerWidth - 0.5;
      targetY = event.clientY / window.innerHeight - 0.5;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="aurora" aria-hidden>
      <div ref={layerA} className="aurora-layer">
        <div className="aurora-blob aurora-blob-a" />
        <div className="aurora-blob aurora-blob-c" />
      </div>
      <div ref={layerB} className="aurora-layer">
        <div className="aurora-blob aurora-blob-b" />
      </div>
    </div>
  );
}
