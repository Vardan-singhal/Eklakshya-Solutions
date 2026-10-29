import { useEffect, useLayoutEffect } from "react";
import type Lenis from "lenis";

/** useLayoutEffect on the client, useEffect on the server (no SSR warning). */
export const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Shared, mutable animation state. Read inside rAF / useFrame loops, so it
 * deliberately lives outside React state (no re-renders at 60fps).
 */
export const engine = {
  lenis: null as Lenis | null,
  /** smoothed scroll velocity in px per frame */
  velocity: 0,
  /** last non-zero scroll direction: 1 = down, -1 = up */
  direction: 1 as 1 | -1,
  /** true once the preloader / page curtain has finished and content may animate in */
  ready: false,
  /** 0..1 progress of the pinned home hero (drives the 3D camera) */
  heroProgress: 0,
};

export const isReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const isFinePointer = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

export function markReady() {
  if (engine.ready) return;
  engine.ready = true;
  window.dispatchEvent(new Event("ek:ready"));
}

/** Run `cb` as soon as the page is allowed to animate in. Returns an unsubscribe fn. */
export function onReady(cb: () => void) {
  if (engine.ready) {
    cb();
    return () => {};
  }
  const handler = () => cb();
  window.addEventListener("ek:ready", handler, { once: true });
  return () => window.removeEventListener("ek:ready", handler);
}

export function scrollToTarget(target: string | HTMLElement | number, offset = -96) {
  if (engine.lenis) {
    engine.lenis.scrollTo(target, { offset, duration: 1.4 });
    return;
  }
  if (typeof target === "number") {
    window.scrollTo({ top: target, behavior: "smooth" });
    return;
  }
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}
