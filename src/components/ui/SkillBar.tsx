"use client";

import { useRef } from "react";
import { gsap } from "@/lib/gsap";
import { isReducedMotion, observeEntrance, useIsoLayoutEffect } from "@/lib/engine";

/** Proficiency bar that fills (transform: scaleX) when scrolled into view. */
export function SkillBar({ level }: { level: number }) {
  const bar = useRef<HTMLDivElement>(null);
  useIsoLayoutEffect(() => {
    const el = bar.current;
    if (!el || isReducedMotion()) return;
    let off = () => {};
    const ctx = gsap.context((self) => {
      const play = self.add("play", () => gsap.fromTo(el, { scaleX: 0 }, { scaleX: level / 100, duration: 1.6, ease: "expo.out" }));
      off = observeEntrance(el, () => play(), "top 95%");
    }, el);
    return () => { off(); ctx.revert(); };
  }, [level]);
  return (
    <div className="h-[3px] w-full overflow-hidden rounded-full bg-line" role="img" aria-label={`Proficiency ${level} percent`}>
      <div ref={bar} className="h-full w-full origin-left bg-ember-grad" style={{ transform: `scaleX(${level / 100})` }} />
    </div>
  );
}
