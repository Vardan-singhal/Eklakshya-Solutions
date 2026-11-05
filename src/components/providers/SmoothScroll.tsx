"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { SCROLL_MOTION } from "@/lib/motionSettings";
import { gsap, ScrollTrigger, requestScrollRefresh } from "@/lib/gsap";
import { engine, markReady, onReady, scrollToTarget, useIsoLayoutEffect } from "@/lib/engine";

/** One animation clock for scrolling, scroll triggers and velocity-driven effects. */
export function SmoothScroll() {
  const pathname = usePathname();

  useIsoLayoutEffect(() => {
    let lenis: Lenis | null = null;
    let lastY = window.scrollY;
    let disposed = false;
    let cancelReadyRefresh = () => {};
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const configure = () => {
      lenis?.destroy();
      lenis = null;
      engine.lenis = null;
      if (preference.matches) return;
      lenis = new Lenis({ lerp: SCROLL_MOTION.wheelLerp, smoothWheel: true, wheelMultiplier: SCROLL_MOTION.wheelMultiplier, syncTouch: false });
      engine.lenis = lenis;
      if (!engine.ready || document.documentElement.classList.contains("menu-open")) lenis.stop();
      lenis.on("scroll", ScrollTrigger.update);
    };
    configure();
    preference.addEventListener("change", configure);

    const tick = (time: number, delta: number) => {
      if (document.hidden) return;
      lenis?.raf(time * 1000);
      const frames = Math.max(0.1, Math.min(delta, 64) / (1000 / 60));
      const y = window.scrollY;
      const dy = (y - lastY) / frames;
      lastY = y;
      engine.velocity += (dy - engine.velocity) * (1 - Math.pow(0.88, frames));
      if (Math.abs(dy) > 0.2) engine.direction = dy > 0 ? 1 : -1;
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(500, 33);
    const syncDimensions = () => lenis?.resize();
    ScrollTrigger.addEventListener("refresh", syncDimensions);

    const failsafe = window.setTimeout(() => {
      if (!engine.ready) {
        document.documentElement.classList.remove("is-loading");
        lenis?.start();
        markReady();
      }
    }, 8000);

    const initialPath = window.location.pathname;
    const initialHash = window.location.hash;
    let initialAlignment = true;
    const offReady = onReady(() => {
      window.clearTimeout(failsafe);
      cancelReadyRefresh = requestScrollRefresh(() => {
        if (!disposed && initialAlignment && initialPath === window.location.pathname && initialHash) {
          scrollToTarget(initialHash, undefined, { immediate: true });
        }
        initialAlignment = false;
      });
    });
    const onAssetLoad = () => { if (!disposed) requestScrollRefresh(); };
    const onVisibility = () => {
      lastY = window.scrollY;
      engine.velocity = 0;
      if (!document.hidden) onAssetLoad();
    };
    window.addEventListener("load", onAssetLoad);
    document.addEventListener("visibilitychange", onVisibility);
    document.fonts?.ready.then(onAssetLoad);


    return () => {
      disposed = true;
      offReady();
      cancelReadyRefresh();
      window.clearTimeout(failsafe);
      window.removeEventListener("load", onAssetLoad);
      document.removeEventListener("visibilitychange", onVisibility);
      preference.removeEventListener("change", configure);
      ScrollTrigger.removeEventListener("refresh", syncDimensions);
      gsap.ticker.remove(tick);
      lenis?.destroy();
      engine.lenis = null;
      engine.velocity = 0;
    };
  }, []);

  // Observe only layout size, not animated transforms. Debounce expanding content.
  useEffect(() => {
    let timer = 0;
    let disposed = false;
    let cancelRefresh = () => {};
    let waitingForScroll = false;
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (disposed || !engine.ready) return;
        if (ScrollTrigger.isScrolling()) { waitingForScroll = true; return; }
        waitingForScroll = false;
        cancelRefresh = requestScrollRefresh();
      }, 120);
    };
    const onScrollEnd = () => { if (waitingForScroll) refresh(); };
    ScrollTrigger.addEventListener("scrollEnd", onScrollEnd);
    const header = document.querySelector<HTMLElement>("[data-scroll-header]");
    const sectionNav = document.querySelector<HTMLElement>("[data-section-navigation]");
    const setClearance = () => {
      if (disposed) return;
      document.documentElement.style.setProperty("--nav-height", `${header?.offsetHeight ?? 80}px`);
      document.documentElement.style.setProperty("--section-nav-height", `${sectionNav?.offsetHeight ?? 0}px`);
    };
    const chrome = new ResizeObserver(setClearance);
    if (header) chrome.observe(header);
    if (sectionNav) chrome.observe(sectionNav);
    setClearance();
    const sizes = new WeakMap<Element, string>();
    const layout = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        const size = `${Math.round(entry.contentRect.width)}:${Math.round(entry.contentRect.height)}`;
        if (sizes.get(entry.target) !== size) { sizes.set(entry.target, size); changed = true; }
      }
      if (changed) refresh();
    });
    document.querySelectorAll("main, footer").forEach((element) => layout.observe(element));
    document.addEventListener("load", refresh, true);
    refresh();
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      cancelRefresh();
      ScrollTrigger.removeEventListener("scrollEnd", onScrollEnd);
      chrome.disconnect();
      layout.disconnect();
      document.removeEventListener("load", refresh, true);
    };
  }, [pathname]);

  return null;
}
