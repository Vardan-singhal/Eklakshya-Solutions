"use client";

import { createElement, useEffect, useRef, type ElementType, type ReactNode } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { engine, isFinePointer, isReducedMotion, onReady, useIsoLayoutEffect } from "@/lib/engine";

/** Fade-and-rise. With `stagger`, animates the element's children instead of the element. */
export function Reveal({
  children,
  as = "div",
  className = "",
  y = 48,
  x = 0,
  delay = 0,
  duration = 1.1,
  stagger,
  start = "top 88%",
  mode = "scroll",
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  y?: number;
  x?: number;
  delay?: number;
  duration?: number;
  stagger?: number;
  start?: string;
  mode?: "scroll" | "load";
}) {
  const ref = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const targets = stagger !== undefined ? Array.from(el.children) : [el];
    const reduced = isReducedMotion();
    let off = () => {};
    const ctx = gsap.context(() => {
      const from = { opacity: 0, y: reduced ? 0 : y, x: reduced ? 0 : x };
      const to = { opacity: 1, y: 0, x: 0, duration: reduced ? 0.5 : duration, delay, ease: "expo.out", stagger: stagger ?? 0 };
      if (mode === "load") {
        gsap.set(targets, from);
        off = onReady(() => gsap.to(targets, to));
      } else {
        gsap.fromTo(targets, from, { ...to, scrollTrigger: { trigger: el, start, once: true } });
      }
    }, el);
    return () => {
      off();
      ctx.revert();
    };
  }, []);

  return createElement(as as "div", { ref: ref as React.Ref<HTMLDivElement>, className }, children);
}

/** Number that counts up when it enters the viewport. Final value is server-rendered. */
export function Counter({
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
  duration = 2.2,
}: {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const fmt = (n: number) =>
    prefix + n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || isReducedMotion()) return;
    const obj = { v: 0 };
    el.textContent = fmt(0);
    const ctx = gsap.context(() => {
      gsap.to(obj, {
        v: to,
        duration,
        ease: "power3.out",
        onUpdate: () => {
          el.textContent = fmt(obj.v);
        },
        scrollTrigger: { trigger: el, start: "top 92%", once: true },
      });
    }, el);
    return () => {
      ctx.revert();
      el.textContent = fmt(to);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to]);

  return (
    <span ref={ref} className={className}>
      {fmt(to)}
    </span>
  );
}

/**
 * Parallax image frame: clip-path curtain reveal on entry, then the image drifts
 * at a different speed than the page while scrolling. Put an <Image fill /> inside.
 */
export function ImageReveal({
  children,
  className = "",
  parallax = 9,
  curtain = true,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  parallax?: number;
  curtain?: boolean;
  delay?: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const mid = useRef<HTMLDivElement>(null);
  const zoom = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const w = wrap.current;
    const m = mid.current;
    const z = zoom.current;
    if (!w || !m || !z || isReducedMotion()) return;
    const ctx = gsap.context(() => {
      if (curtain) {
        gsap.fromTo(
          w,
          { clipPath: "inset(100% 0% 0% 0%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, delay, ease: "expo.inOut", scrollTrigger: { trigger: w, start: "top 90%", once: true } }
        );
        gsap.fromTo(z, { scale: 1.35 }, { scale: 1, duration: 1.8, delay, ease: "expo.out", scrollTrigger: { trigger: w, start: "top 90%", once: true } });
      }
      gsap.fromTo(
        m,
        { yPercent: -parallax },
        { yPercent: parallax, ease: "none", scrollTrigger: { trigger: w, start: "top bottom", end: "bottom top", scrub: true } }
      );
    }, w);
    return () => ctx.revert();
  }, [curtain, parallax, delay]);

  return (
    <div ref={wrap} className={`relative overflow-hidden ${className}`}>
      <div ref={mid} className="absolute inset-x-0 -top-[10%] h-[120%] will-change-transform">
        <div ref={zoom} className="absolute inset-0">
          {children}
        </div>
      </div>
    </div>
  );
}

/** Generic vertical parallax drift for decorative elements. */
export function ParallaxY({ children, className = "", amount = 80 }: { children: ReactNode; className?: string; amount?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || isReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(el, { y: -amount }, { y: amount, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
    }, el);
    return () => ctx.revert();
  }, [amount]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Scroll-velocity skew: the wrapper leans slightly with scroll speed and settles when it stops. */
export function ScrollSkew({ children, className = "", strength = 1 }: { children: ReactNode; className?: string; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || isReducedMotion() || !isFinePointer()) return;
    const set = gsap.quickSetter(el, "skewY", "deg") as (v: number) => void;
    let cur = 0;
    const tick = () => {
      const target = gsap.utils.clamp(-2.2, 2.2, engine.velocity * 0.08 * strength);
      cur += (target - cur) * 0.12;
      set(Math.abs(cur) < 0.01 ? 0 : cur);
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      gsap.set(el, { skewY: 0 });
    };
  }, [strength]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Scroll-linked text fill: words fade from muted to full colour as the block scrolls through. */
export function ScrollFill({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = text.split(/\s+/).filter(Boolean);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || isReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll("[data-w]"),
        { opacity: 0.16 },
        { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true } }
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <span key={i} data-w className="inline-block">
          {w}&nbsp;
        </span>
      ))}
    </p>
  );
}

/** Refresh ScrollTrigger once images/fonts settle (call from pages with late layout shifts). */
export function useRefreshOnLoad() {
  useEffect(() => {
    const off = onReady(() => window.setTimeout(() => ScrollTrigger.refresh(), 200));
    return off;
  }, []);
}
