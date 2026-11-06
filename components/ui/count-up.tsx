"use client";

import { useEffect, useRef } from "react";

const DURATION_MS = 700;

/** Renders the final number on the server, so there's no layout shift and it reads correctly without JavaScript. */
export function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || value === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const started = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const progress = Math.min(1, (now - started) / DURATION_MS);
      const eased = 1 - (1 - progress) ** 3;
      element.textContent = `${Math.round(value * eased).toLocaleString("en-US")}${suffix}`;
      if (progress < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, suffix]);

  return <span ref={ref}>{`${value.toLocaleString("en-US")}${suffix}`}</span>;
}
