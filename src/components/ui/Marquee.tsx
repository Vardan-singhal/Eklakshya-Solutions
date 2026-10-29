"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { engine, isReducedMotion } from "@/lib/engine";

/**
 * Infinite marquee whose speed and direction react to scroll velocity:
 * scrolling faster speeds it up, scrolling up reverses it.
 */
export function Marquee({
  items,
  speed = 55,
  reverse = false,
  outline = false,
  className = "",
}: {
  items: string[];
  speed?: number;
  reverse?: boolean;
  outline?: boolean;
  className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const reduced = isReducedMotion();
    let x = 0;
    const tick = (_t: number, delta: number) => {
      const half = el.scrollWidth / 2;
      if (!half) return;
      const dt = delta / 1000;
      const boost = Math.min(Math.abs(engine.velocity) * 16, 1200);
      const dir = (reverse ? 1 : -1) * engine.direction;
      x += dir * ((reduced ? 0 : speed) + boost) * dt;
      x = gsap.utils.wrap(-half, 0, x);
      el.style.transform = `translate3d(${x}px,0,0)`;
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [speed, reverse]);

  const row = (hidden: boolean) =>
    items.map((t, i) => (
      <span key={`${hidden}-${i}`} aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-8 pr-8 sm:gap-12 sm:pr-12">
        <span className={`t-h1 ${outline ? "text-stroke" : "text-fg"}`}>
          {t}
        </span>
        <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-ember sm:h-7 sm:w-7">
          <span className="h-1.5 w-1.5 rounded-full bg-ember" />
        </span>
      </span>
    ));

  return (
    <div className={`overflow-hidden ${className}`}>
      <div ref={track} className="flex w-max will-change-transform">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
