"use client";

import { useEffect, useRef, useState } from "react";

let webglCache: boolean | null = null;
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
export function useCanRender3D(minWidth = 768) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const force = new URLSearchParams(window.location.search).has("force3d");
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowMem = typeof nav.deviceMemory === "number" && nav.deviceMemory < 4;
    const lowCpu = typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency < 4;
    const saveData = !!nav.connection?.saveData;
    const capable = force || (!reduced && !lowMem && !lowCpu && !saveData && window.innerWidth >= minWidth);
    const t = window.setTimeout(() => setOk(capable && hasWebGL()), 0);
    return () => window.clearTimeout(t);
  }, [minWidth]);
  return ok;
}

/** True while the element is within `margin` of the viewport. */
export function useInView<T extends HTMLElement>(margin = "200px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, inView] as const;
}
