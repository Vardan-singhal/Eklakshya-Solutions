"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { engine, isReducedMotion } from "@/lib/engine";

/**
 * Site-wide living background (fixed, behind all content, clipped to <main>):
 *  • fine grid that rotates/scales with scroll
 *  • two ember glow orbs that drift across the page
 *  • ember tint that fades ink → ember → ink across the whole scroll
 *  • a light 2D particle field with depth; scroll velocity stretches particles into streaks
 * Transform/opacity only — no layout work.
 */
export function BackgroundField() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const orbA = useRef<HTMLDivElement>(null);
  const orbB = useRef<HTMLDivElement>(null);
  const tint = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cv = canvas.current;
    const ctx2d = cv?.getContext("2d");
    if (!cv || !ctx2d) return;
    const reduced = isReducedMotion();

    type P = { x: number; y: number; z: number; s: number; warm: boolean };
    let w = 0;
    let h = 0;
    let ps: P[] = [];

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = w * dpr;
      cv.height = h * dpr;
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = w < 768 ? 24 : 58;
      ps = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: 0.25 + Math.random() * 0.75,
        s: Math.random() * 100,
        warm: Math.random() > 0.35,
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    let isLight = typeof document !== "undefined" && document.documentElement.dataset.theme === "light";
    const observer = typeof MutationObserver !== "undefined" ? new MutationObserver(() => {
      isLight = document.documentElement.dataset.theme === "light";
    }) : null;
    if (observer) {
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    }

    const draw = () => {
      ctx2d.clearRect(0, 0, w, h);
      const light = isLight;
      const v = engine.velocity;
      for (const p of ps) {
        if (!reduced) {
          p.y -= 0.15 + p.z * 0.4 + v * p.z * 0.5;
          p.x += Math.sin((p.y + p.s) * 0.012) * 0.18 * p.z;
        }
        if (p.y < -12) {
          p.y = h + 12;
          p.x = Math.random() * w;
        } else if (p.y > h + 12) {
          p.y = -12;
          p.x = Math.random() * w;
        }
        const a = (light ? 0.5 : 0.6) * p.z;
        ctx2d.globalAlpha = a;
        ctx2d.fillStyle = p.warm ? (light ? "#99670f" : "#e9b949") : light ? "#0077b6" : "#39bfff";
        ctx2d.beginPath();
        ctx2d.arc(p.x, p.y, p.z * 1.7, 0, Math.PI * 2);
        ctx2d.fill();
        if (Math.abs(v) > 6) {
          ctx2d.globalAlpha = a * 0.5;
          ctx2d.fillRect(p.x - 0.4, p.y, 0.8, v * p.z * 1.6);
        }
      }
      ctx2d.globalAlpha = 1;
    };
    if (reduced) draw();
    else gsap.ticker.add(draw);

    const update = (progress: number) => {
      const a = orbA.current;
      const b = orbB.current;
      const t = tint.current;
      const g = grid.current;
      if (a) a.style.transform = `translate3d(${-progress * 32}vw, ${progress * 60}vh, 0) scale(${1 + progress * 0.7})`;
      if (b) b.style.transform = `translate3d(${progress * 28}vw, ${-progress * 50}vh, 0) scale(${1.2 - progress * 0.4})`;
      if (t) t.style.opacity = String(Math.pow(Math.sin(Math.PI * progress), 1.4));
      if (g) g.style.transform = `rotate(${progress * 7}deg) scale(${1 + progress * 0.25})`;
    };
    update(0);
    const st = ScrollTrigger.create({ start: 0, end: "max", onUpdate: (self) => update(self.progress) });

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      gsap.ticker.remove(draw);
      st.kill();
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div ref={grid} className="grid-lines absolute -inset-[20%] opacity-70" />
      <div
        ref={orbA}
        className="absolute -left-[10vw] -top-[20vh] h-[70vmax] w-[70vmax] rounded-full opacity-[0.16] will-change-transform"
        style={{ background: "radial-gradient(circle, var(--c-ember) 0%, transparent 62%)" }}
      />
      <div
        ref={orbB}
        className="absolute -bottom-[25vh] -right-[15vw] h-[60vmax] w-[60vmax] rounded-full opacity-[0.14] will-change-transform"
        style={{ background: "radial-gradient(circle, var(--c-ember) 0%, transparent 62%)" }}
      />
      <div ref={tint} className="absolute inset-0 opacity-0">
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, var(--c-ember), transparent 70%)", opacity: "var(--tint-max)" }}
        />
      </div>
      <canvas ref={canvas} className="absolute inset-0" />
    </div>
  );
}
