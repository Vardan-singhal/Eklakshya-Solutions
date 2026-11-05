"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { SCROLL_MOTION } from "@/lib/motionSettings";
import { gsap, ScrollTrigger, requestScrollRefresh } from "@/lib/gsap";
import { engine, isFinePointer, isReducedMotion, observeEntrance, observeReadyEntrance, onReady, useIsoLayoutEffect } from "@/lib/engine";
import { cn } from "@/lib/utils";

/** Fade-and-rise. With `stagger`, animates the element's children instead of the element. */
export function Reveal({
  children,
  as = "div",
  className = "",
  y = 48,
  x = 0,
  delay = 0,
  duration = SCROLL_MOTION.revealDuration,
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
    const ctx = gsap.context((self) => {
      const from = { opacity: mode === "load" ? 0.65 : 0, y: reduced ? 0 : y, x: reduced ? 0 : x };
      const to = { opacity: 1, y: 0, x: 0, duration: reduced ? 0.5 : mode === "load" ? Math.min(duration, 1.1) : duration, delay: reduced ? 0 : delay + (mode === "scroll" ? SCROLL_MOTION.revealDelay : 0), ease: mode === "load" ? "expo.out" : "power2.out", stagger: stagger ?? 0 };
      if (mode === "load") {
        gsap.set(targets, from);
        const play = self.add("play", () => gsap.to(targets, to));
        off = onReady(() => play());
      } else {
        const play = self.add("play", () => gsap.fromTo(targets, from, to));
        off = observeReadyEntrance(el, () => play(), start);
      }
    }, el);
    return () => {
      off();
      ctx.revert();
    };
  }, []);

  const Tag = as;
  return <Tag ref={ref} className={cn(className)}>{children}</Tag>;
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
    let off = () => {};
    const ctx = gsap.context((self) => {
      const play = self.add("play", () => gsap.to(obj, {
        v: to,
        duration,
        ease: "power3.out",
        onUpdate: () => {
          el.textContent = fmt(obj.v);
        },
      }));
      off = observeEntrance(el, () => { el.textContent = fmt(0); play(); }, "top 92%");
    }, el);
    return () => {
      off();
      ctx.revert();
      el.textContent = fmt(to);
    };
  }, [to]);

  return (
    <span ref={ref} className={cn(className)}>
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
        { yPercent: parallax, ease: "none", scrollTrigger: { trigger: w, start: "top bottom", end: "bottom top", scrub: SCROLL_MOTION.scrub } }
      );
    }, w);
    return () => ctx.revert();
  }, [curtain, parallax, delay]);

  return (
    <div ref={wrap} className={cn("relative overflow-hidden", className)}>
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
      gsap.fromTo(el, { y: -amount }, { y: amount, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: SCROLL_MOTION.scrub } });
    }, el);
    return () => ctx.revert();
  }, [amount]);
  return (
    <div ref={ref} className={cn(className)}>
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
    let visible = false;
    let applied = 0;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    observer.observe(el);
    const tick = () => {
      if (!visible || document.hidden) return;
      const target = gsap.utils.clamp(-2.2, 2.2, engine.velocity * 0.08 * strength);
      cur += (target - cur) * 0.09;
      const next = Math.abs(cur) < 0.01 ? 0 : cur;
      if (next !== applied) { set(next); applied = next; }
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      observer.disconnect();
      gsap.set(el, { skewY: 0 });
    };
  }, [strength]);
  return (
    <div ref={ref} className={cn(className)}>
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
    let off = () => {};
    const ctx = gsap.context((self) => {
      const prepare = self.add("prepare", () => gsap.fromTo(
        el.querySelectorAll("[data-w]"),
        { opacity: 0.62 },
        { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: SCROLL_MOTION.scrub } }
      ));
      off = observeEntrance(el, () => prepare(), "top 120%");
    }, el);
    return () => { off(); ctx.revert(); };
  }, []);

  return (
    <p ref={ref} className={cn(className)}>
      {words.map((w, i) => (
        <span key={i} data-w className="inline-block" style={{ opacity: 0.62 }}>
          {w}&nbsp;
        </span>
      ))}
    </p>
  );
}

/** Refresh ScrollTrigger once images/fonts settle (call from pages with late layout shifts). */
export function useRefreshOnLoad() {
  useEffect(() => {
    let cancelRefresh = () => {};
    const off = onReady(() => { cancelRefresh = requestScrollRefresh(); });
    return () => { off(); cancelRefresh(); };
  }, []);
}
