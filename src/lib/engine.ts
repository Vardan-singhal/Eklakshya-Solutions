import { useEffect, useLayoutEffect } from "react";
import type Lenis from "lenis";
import { SCROLL_MOTION, scrollEase } from "./motionSettings";

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

/** Resolve IDs without treating punctuation or encoded hashes as CSS selectors. */
export function resolveScrollTarget(target: string | HTMLElement): HTMLElement | null {
  if (typeof target !== "string") return target;
  if (target === "#") return document.documentElement;
  if (target.startsWith("#")) {
    let id = target.slice(1);
    try { id = decodeURIComponent(id); } catch { /* Keep malformed hashes literal. */ }
    return document.getElementById(id);
  }
  try { return document.querySelector<HTMLElement>(target); } catch { return null; }
}

/** The same alignment/easing applies to section dots, links and native fallbacks. */
export function scrollToTarget(
  target: string | HTMLElement | number,
  offset?: number,
  { immediate = false }: { immediate?: boolean } = {},
) {
  const element = typeof target === "number" ? null : resolveScrollTarget(target);
  if (typeof target !== "number" && !element) return;
  const margin = element ? Number.parseFloat(window.getComputedStyle(element).scrollMarginTop) || 0 : 0;
  const resolvedOffset = offset ?? -margin;
  const destination = Math.max(0, (typeof target === "number" ? target : element!.getBoundingClientRect().top + window.scrollY) + resolvedOffset);
  const instant = immediate || isReducedMotion();
  if (engine.lenis) {
    // Lenis also reads CSS scroll-margin for element targets; use the resolved
    // numeric position so clearance is applied exactly once in both paths.
    engine.lenis.scrollTo(destination, {
      offset: 0,
      duration: Math.min(SCROLL_MOTION.anchorMaxDuration, SCROLL_MOTION.anchorMinDuration + Math.abs(destination - window.scrollY) / 2800),
      easing: scrollEase,
      immediate: instant,
      force: true,
    });
    return;
  }
  window.scrollTo({ top: destination, behavior: instant ? "instant" : "smooth" });
}

/** One-shot entrances keep their viewport threshold correct after a resize. */
export function observeEntrance(element: Element, play: () => void, start = "top 88%") {
  const percent = Number.parseFloat(start.split(" ")[1]) || 88;
  let observer: IntersectionObserver;
  let stopped = false;
  let resizeFrame = 0;
  const stop = () => {
    stopped = true;
    observer?.disconnect();
    window.cancelAnimationFrame(resizeFrame);
    window.removeEventListener("resize", resize);
  };
  const observe = () => {
    if (stopped) return;
    observer?.disconnect();
    observer = new IntersectionObserver((entries) => {
      if (!stopped && entries.some((entry) => entry.isIntersecting)) {
        stop();
        play();
      }
    }, { rootMargin: "0px 0px " + Math.round(window.innerHeight * (percent / 100 - 1)) + "px 0px" });
    observer.observe(element);
  };
  const resize = () => {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(observe);
  };
  observe();
  window.addEventListener("resize", resize, { passive: true });
  return stop;
}

/** Visible section reveals wait for the page curtain/preloader to release them. */
export function observeReadyEntrance(element: Element, play: () => void, start = "top 88%") {
  let offReady = () => {};
  const offEntrance = observeEntrance(element, () => { offReady = onReady(play); }, start);
  return () => { offEntrance(); offReady(); };
}
