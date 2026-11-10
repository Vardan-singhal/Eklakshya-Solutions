"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { observeStackOcclusion } from "@/lib/modelVisibility";

let webglCache: boolean | null = null;
function hasWebGL() {
  if (webglCache !== null) return webglCache;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") as WebGL2RenderingContext | null;
    webglCache = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglCache = false;
  }
  return webglCache;
}

/**
 * Probe actual renderer support. Viewport size, input type and hardware estimates
 * never substitute a different experience for a supported device.
 */
export function useCanRender3D(onResolved?: (capable: boolean) => void) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const available = hasWebGL();
      setOk(available);
      onResolved?.(available);
    });
    return () => cancelAnimationFrame(frame);
  }, [onResolved]);
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

/** Prepare a scene ahead of scrolling, then keep its renderer for return visits.
 * Distant models must not compete with the hero's first draw or initial hydration.
 */
export function useSceneProximity(ref: RefObject<HTMLElement | null>) {
  const [prepare, setPrepare] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setPrepare(true);
      observer.disconnect();
    }, { rootMargin: "2400px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return prepare;
}

/** Hidden warm-up uses fewer pixels; restore normal quality before viewport entry. */
export function servicePixelRatio(active: boolean): number | [number, number] {
  return active ? [1, 1.5] : 0.5;
}
