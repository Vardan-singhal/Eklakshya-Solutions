"use client";

import { useEffect, useRef, useState } from "react";
import { TargetLogo } from "@/components/ui/brand";
import { engine, markReady } from "@/lib/engine";

/** CSS runs the counter, branding and split shutter from first paint. */
export function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const html = document.documentElement;
    const finish = () => {
      html.classList.remove("is-loading");
      if (html.dataset.loaderComplete !== "true") {
        html.dataset.loaderComplete = "true";
        performance.mark("preloader:complete");
      }
      if (!html.classList.contains("menu-open")) engine.lenis?.start();
      markReady();
      setGone(true);
    };
    // The head listener can release scrolling before React has hydrated.
    if (html.dataset.loaderComplete === "true") { finish(); return; }
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    engine.lenis?.stop();
    const completed = (event: AnimationEvent) => {
      if (event.animationName === "loader-bottom") finish();
    };
    el.addEventListener("animationend", completed);
    const timeout = window.setTimeout(finish, 2000);
    return () => {
      el.removeEventListener("animationend", completed);
      window.clearTimeout(timeout);
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
