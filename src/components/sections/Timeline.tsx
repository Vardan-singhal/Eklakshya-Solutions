"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { isReducedMotion, useIsoLayoutEffect } from "@/lib/engine";

type Step = { step?: string; year?: string; title: string; text: string; out?: string };

/**
 * Vertical timeline on a strict 2-column grid. The centre line draws itself with scroll,
 * each marker lights up as it is reached, and cards fade in from alternating sides.
 * Odd steps sit left (right-aligned), even steps sit right (left-aligned) — a mirror.
 */
export function Timeline({ steps }: { steps: Step[] }) {
  const root = useRef<HTMLOListElement>(null);
  const line = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el || isReducedMotion()) {
      el?.querySelectorAll<HTMLElement>("[data-step-dot]").forEach((d) => (d.dataset.lit = "1"));
      if (line.current) line.current.style.transform = "scaleY(1)";
      return;
    }
    const triggers: ScrollTrigger[] = [];
    const isMobile = window.innerWidth < 768;
    const ctx = gsap.context(() => {
      gsap.fromTo(line.current, { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: el, start: "top 70%", end: "bottom 65%", scrub: true } });
      el.querySelectorAll<HTMLElement>("[data-step]").forEach((s, i) => {
        const dir = i % 2 === 0 ? -1 : 1;
        const dot = s.querySelector<HTMLElement>("[data-step-dot]");
        const initialVars = isMobile ? { opacity: 0, y: 32 } : { opacity: 0, x: 60 * dir };
        const targetVars = isMobile ? { opacity: 1, y: 0 } : { opacity: 1, x: 0 };
        gsap.fromTo(
          s.querySelector("[data-step-body]"),
          initialVars,
          { ...targetVars, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: s, start: "top 80%", toggleActions: "play none none reverse" } }
        );
        triggers.push(
          ScrollTrigger.create({
            trigger: s,
            start: "top 70%",
            onEnter: () => dot && (dot.dataset.lit = "1"),
            onLeaveBack: () => dot && (dot.dataset.lit = "0"),
          })
        );
      });
    }, el);
    return () => {
      triggers.forEach((t) => t.kill());
      ctx.revert();
    };
  }, []);

  return (
    <ol ref={root} className="relative mx-auto max-w-5xl list-none">
      <div aria-hidden className="absolute bottom-0 left-[1.1rem] top-0 w-px bg-line-strong md:left-1/2 md:-translate-x-1/2">
        <div ref={line} className="h-full origin-top bg-ember-grad" style={{ transform: "scaleY(0)" }} />
      </div>

      {steps.map((s, i) => {
        const left = i % 2 === 0;
        return (
          <li key={s.title} data-step className="relative grid gap-3 pb-12 pl-10 last:pb-0 sm:gap-4 sm:pb-16 sm:pl-12 md:grid-cols-2 md:gap-24 md:pl-0">
            <span
              data-step-dot
              data-lit="0"
              aria-hidden
              className="absolute left-[1.1rem] top-2.5 z-10 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-line-strong bg-bg transition-all duration-500 data-[lit=1]:scale-125 data-[lit=1]:border-ember data-[lit=1]:bg-ember data-[lit=1]:shadow-[0_0_24px_var(--c-ember)] sm:top-3 sm:h-5 sm:w-5 md:left-1/2"
            />
            <div data-step-body className={left ? "md:col-start-1 md:text-right" : "md:col-start-2"}>
              <p className="t-h2 sm:t-h1 text-stroke opacity-80">{s.step ?? s.year}</p>
              <h3 className="t-h4 mt-3 sm:mt-4">{s.title}</h3>
              <p className={`t-body mt-2 sm:mt-3 max-w-md ${left ? "md:ml-auto" : ""}`}>{s.text}</p>
              {s.out && <p className="t-label mt-4 sm:mt-5 inline-flex rounded-full border border-line-strong px-3.5 py-1.5 sm:px-4 sm:py-2 text-accent!">Output · {s.out}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
