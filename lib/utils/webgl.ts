"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

const noSubscribe = () => () => {};

function supportsScene() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if ((memory !== undefined && memory < 4) || navigator.hardwareConcurrency < 4) return false;
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

/** False during server rendering, for reduced motion, on weak devices, and without WebGL. Those keep the CSS version. */
export function useCanRender3D() {
  return useSyncExternalStore(noSubscribe, supportsScene, () => false);
}

/** True while the element is on screen and the tab is showing, so 3D scenes stop rendering otherwise. */
export function useActiveWhileVisible(ref: RefObject<Element | null>) {
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)));
    observer.observe(element);
    const onVisibility = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ref]);

  return inView && tabVisible;
}
