"use client";

import { useEffect, useRef, useState } from "react";
import { observeStackOcclusion } from "@/lib/modelVisibility";

let webglCache: boolean | null = null;
// Preserve activation across route changes and late-mounted service cards.
let graphicsInteractionStarted = false;
function hasWebGL() {
  if (webglCache !== null) return webglCache;
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    webglCache = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglCache = false;
  }
  return webglCache;
}

/**
 * Decides whether to mount a WebGL scene. Low-end devices, small screens,
 * reduced-motion, data-saver and no-WebGL browsers get the static SVG fallback.
 * Add ?force3d to the URL to bypass the heuristics when testing.
 */
export function useCanRender3D(minWidth = 768, onInteraction = false, onResolved?: (capable: boolean) => void) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const force = new URLSearchParams(window.location.search).has("force3d");
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowMem = typeof nav.deviceMemory === "number" && nav.deviceMemory < 4;
    const lowCpu = typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency < 4;
    const saveData = !!nav.connection?.saveData;
    const capable = force || (!reduced && !lowMem && !lowCpu && !saveData && window.innerWidth >= minWidth);
    if (!capable) { onResolved?.(false); return; }
    // Keep the animated SVG visible until the interactive renderer is needed.
    const events = ["pointermove", "pointerdown", "keydown", "wheel", "scroll"] as const;
    let frame = 0;
    const removeListeners = () => events.forEach((event) => window.removeEventListener(event, activate));
    const activate = (event?: Event) => {
      if (event) graphicsInteractionStarted = true;
      removeListeners();
      frame = requestAnimationFrame(() => {
        const available = hasWebGL();
        setOk(available);
        onResolved?.(available);
      });
    };
    if (onInteraction && !force && !graphicsInteractionStarted) {
      events.forEach((event) => window.addEventListener(event, activate, { passive: true, once: true }));
    } else {
      activate();
    }
    return () => { removeListeners(); cancelAnimationFrame(frame); };
  }, [minWidth, onInteraction, onResolved]);
  return ok;
}

/** Track visibility only; service renderer lifetime does not depend on this flag. */
export function useInView<T extends HTMLElement>(margin = "200px", stackAware = false) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let intersects = false;
    let covered = false;
    const update = () => setInView(intersects && !covered && !document.hidden);
    const stopOcclusion = stackAware ? observeStackOcclusion(el, () => intersects, (value) => { covered = value; update(); }) : () => {};
    const io = new IntersectionObserver(([entry]) => { intersects = entry.isIntersecting; update(); }, { rootMargin: margin });
    io.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => { io.disconnect(); stopOcclusion(); document.removeEventListener("visibilitychange", update); };
  }, [margin, stackAware]);
  return [ref, inView] as const;
}

/** Hidden warm-up uses fewer pixels; restore normal quality before viewport entry. */
export function servicePixelRatio(active: boolean): number | [number, number] {
  return active ? [1, 1.5] : 0.5;
}
