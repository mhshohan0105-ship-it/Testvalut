"use client";

import { useState } from "react";
import { LazyMotion, domAnimation, m, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

const MAX_TILT = 8;
const SPRING = { stiffness: 260, damping: 26, mass: 0.6 };

export function TiltCard({ className, children }: { className?: string; children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  const [shine, setShine] = useState(false);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [MAX_TILT, -MAX_TILT]), SPRING);
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-MAX_TILT, MAX_TILT]), SPRING);
  const shineX = useTransform(pointerX, [-0.5, 0.5], ["-50%", "50%"]);
  const shineY = useTransform(pointerY, [-0.5, 0.5], ["-50%", "50%"]);

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || reducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
    setShine(true);
  }

  function onPointerLeave() {
    pointerX.set(0);
    pointerY.set(0);
    setShine(false);
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className="h-full [perspective:900px]">
        <m.div
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          style={reducedMotion ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
          whileHover={reducedMotion ? undefined : { scale: 1.02 }}
          transition={{ type: "spring", ...SPRING }}
          className={cn("glass relative overflow-hidden rounded-2xl", className)}
        >
          {children}
          <m.span
            aria-hidden
            style={{ x: shineX, y: shineY, opacity: shine ? 1 : 0 }}
            className="tilt-shine pointer-events-none absolute inset-0 scale-150"
          />
        </m.div>
      </div>
    </LazyMotion>
  );
}
