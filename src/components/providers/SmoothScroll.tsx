"use client";

import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { engine, isReducedMotion, markReady, useIsoLayoutEffect } from "@/lib/engine";

/**
 * Lenis inertia scrolling driven by GSAP's ticker and wired into ScrollTrigger:
 *   lenis.on('scroll', ScrollTrigger.update)  +  gsap.ticker → lenis.raf
 * Also tracks smoothed scroll velocity/direction for the marquee, skew and particles.
 */
export function SmoothScroll() {
  useIsoLayoutEffect(() => {
    let lenis: Lenis | null = null;
    let lastY = window.scrollY;

    const trackVelocity = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      engine.velocity += (dy - engine.velocity) * 0.12;
      if (Math.abs(dy) > 0.2) engine.direction = dy > 0 ? 1 : -1;
    };
    gsap.ticker.add(trackVelocity);

    let tick: ((time: number) => void) | null = null;
    if (!isReducedMotion()) {
      lenis = new Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 1 });
      engine.lenis = lenis;
      if (!engine.ready) lenis.stop(); // the preloader releases the lock
      lenis.on("scroll", ScrollTrigger.update);
      tick = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(500, 33);
    }

    // Failsafe: never leave content un-animated if the preloader fails
    const failsafe = window.setTimeout(() => {
      if (!engine.ready) {
        document.documentElement.classList.remove("is-loading");
        engine.lenis?.start();
        markReady();
      }
    }, 8000);

    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      window.clearTimeout(failsafe);
      window.removeEventListener("load", onLoad);
      gsap.ticker.remove(trackVelocity);
      if (tick) gsap.ticker.remove(tick);
      lenis?.destroy();
      engine.lenis = null;
    };
  }, []);

  return null;
}
