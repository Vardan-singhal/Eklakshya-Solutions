"use client";

import { useRef, useState } from "react";
import { TargetLogo } from "@/components/ui/brand";
import { gsap } from "@/lib/gsap";
import { engine, isReducedMotion, markReady, useIsoLayoutEffect } from "@/lib/engine";

/**
 * Page-load preloader: every fresh visit and reload gets a visible 0–100 counter.
 * Once the progress animation and font wait finish, a shutter
 * splits open. It is server-rendered (covers the page from the first byte) and the
 * real content stays in the DOM underneath for crawlers.
 */
export function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);

  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = isReducedMotion();
    const html = document.documentElement;
    engine.ready = false;
    html.classList.add("is-loading");
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    engine.lenis?.stop();

    const all = <T extends Element>(sel: string) => Array.from(el.querySelectorAll<T>(sel));
    const counter = el.querySelector<HTMLElement>("[data-count]");
    const bar = el.querySelector<HTMLElement>("[data-bar]");
    const state = { v: 0 };
    let cancelled = false;
    let exitAnimation: gsap.core.Animation | undefined;
    const timers: number[] = [];
    const wait = (ms: number) => new Promise<void>((resolve) => {
      timers.push(window.setTimeout(resolve, ms));
    });

    const render = () => {
      if (counter) counter.textContent = String(Math.round(state.v)).padStart(3, "0");
      if (bar) bar.style.transform = `scaleX(${state.v / 100})`;
    };

    const finish = () => {
      if (cancelled) return;
      html.classList.remove("is-loading");
      engine.lenis?.start();
      markReady();
      setGone(true);
    };

    const exit = () => {
      if (cancelled) return;
      if (reduced) {
        exitAnimation = gsap.to(el, { opacity: 0, duration: 0.25, onComplete: finish });
        return;
      }
      exitAnimation = gsap
        .timeline({ onComplete: finish })
        .to(all("[data-content]"), { scale: 1.4, opacity: 0, duration: 0.35, ease: "power3.in" }, 0)
        .to(all("[data-seam]"), { scaleX: 0, duration: 0.25, ease: "power3.in" }, 0.1)
        .to(all("[data-panel='top']"), { yPercent: -100, duration: 0.5, ease: "power4.inOut" }, 0.2)
        .to(all("[data-panel='bottom']"), { yPercent: 100, duration: 0.5, ease: "power4.inOut" }, 0.2);
    };

    const ctx = gsap.context(() => {
      if (reduced) return;
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(all("[data-logo]"), { opacity: 0, scale: 0.9, duration: 0.8 }, 0)
        .from(all("[data-brand]"), { opacity: 0, y: 16, duration: 0.6 }, 0.35)
        .from(all("[data-tag]"), { opacity: 0, y: 12, duration: 0.5 }, 0.6);
    }, el);

    // Always show steady progress, including when all assets are cached.
    render();
    const fontsReady = (document.fonts?.ready ?? Promise.resolve()).then(() => undefined);
    const fonts = Promise.race([fontsReady, wait(3000)]);
    const progress = new Promise<void>((resolve) => {
      gsap.to(state, { v: 90, duration: 2.4, ease: "none", onUpdate: render, onComplete: resolve });
    });

    Promise.all([progress, fonts]).then(() => {
      if (cancelled) return;
      gsap.to(state, {
        v: 100,
        duration: 0.6,
        ease: "none",
        onUpdate: render,
        onComplete: () => { timers.push(window.setTimeout(exit, 300)); },
      });
    });

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      gsap.killTweensOf(state);
      exitAnimation?.revert();
      ctx.revert();
      html.classList.remove("is-loading");
    };
  }, []);

  if (gone) return null;

  return (
    <div
      ref={root}
      role="status"
      aria-live="polite"
      aria-label="Loading Eklakshya Solutions"
      className="preloader fixed inset-0 z-[200]"
    >
      <div data-panel="top" className="absolute inset-x-0 top-0 h-1/2 bg-bg" />
      <div data-panel="bottom" className="absolute inset-x-0 bottom-0 h-1/2 bg-bg" />
      <div data-seam className="absolute left-0 right-0 top-1/2 h-px origin-center bg-ember-grad" />

      <div data-content className="absolute inset-0 grid place-items-center">
        <div className="grid-lines absolute inset-0 opacity-70" aria-hidden />
        <div className="absolute h-[60vmin] w-[60vmin] rounded-full bg-ember/20 blur-[110px]" aria-hidden />

        <div className="relative flex flex-col items-center px-6 text-center">
          <div data-logo>
            <TargetLogo size={240} className="h-44 w-44 sm:h-60 sm:w-60" />
          </div>

          <p data-brand className="mt-4 max-w-full font-display text-2xl font-semibold uppercase tracking-[0.1em] text-fg sm:mt-6 sm:text-4xl sm:tracking-[0.14em]">
            Eklakshya Solutions
          </p>
          <p data-tag className="mt-3 font-mono text-[11px] uppercase tracking-[0.35em] text-muted">
            Ek Lakshya · One Target
          </p>
        </div>

        <div className="absolute inset-x-0 bottom-0 px-6 pb-6 sm:px-10 sm:pb-8">
          <div className="mb-3 flex items-end justify-between font-mono text-[11px] uppercase tracking-[0.25em] text-muted">
            <span>Calibrating</span>
            <span className="text-fg">
              <span data-count>000</span>%
            </span>
          </div>
          <div className="h-[2px] w-full bg-line">
            <div data-bar className="h-full origin-left bg-ember-grad" style={{ transform: "scaleX(0)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
