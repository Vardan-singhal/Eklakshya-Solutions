"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { gsap } from "@/lib/gsap";
import { isReducedMotion } from "@/lib/engine";
import { cn } from "@/lib/utils";

/** High-rate mice need only one geometry read and update per painted frame. */
function pointerFrames(el: HTMLElement, move: (event: PointerEvent) => void, leave: () => void) {
  let frame = 0;
  let latest: PointerEvent;
  const onMove = (event: PointerEvent) => {
    latest = event;
    if (!frame) frame = window.requestAnimationFrame(() => { frame = 0; move(latest); });
  };
  const onLeave = () => {
    window.cancelAnimationFrame(frame);
    frame = 0;
    leave();
    delete el.dataset.touching;
  };
  const onDown = (event: PointerEvent) => {
    if (event.pointerType !== "touch") return;
    el.dataset.touching = "true";
    onMove(event);
  };
  const onUp = (event: PointerEvent) => { if (event.pointerType === "touch") onLeave(); };
  el.addEventListener("pointermove", onMove, { passive: true });
  el.addEventListener("pointerleave", onLeave);
  el.addEventListener("pointerdown", onDown, { passive: true });
  el.addEventListener("pointerup", onUp, { passive: true });
  el.addEventListener("pointercancel", onUp, { passive: true });
  return () => {
    window.cancelAnimationFrame(frame);
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerleave", onLeave);
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("pointerup", onUp);
    el.removeEventListener("pointercancel", onUp);
    delete el.dataset.touching;
  };
}

/** Pulls its child toward the cursor with an elastic settle. */
export function Magnetic({ children, strength = 0.35, className = "inline-block" }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || isReducedMotion()) return;
    let xTo: ReturnType<typeof gsap.quickTo> | undefined;
    let yTo: ReturnType<typeof gsap.quickTo> | undefined;
    const move = (e: PointerEvent) => {
      xTo ??= gsap.quickTo(el, "x", { duration: 0.7, ease: "elastic.out(1, 0.45)" });
      yTo ??= gsap.quickTo(el, "y", { duration: 0.7, ease: "elastic.out(1, 0.45)" });
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => {
      xTo?.(0);
      yTo?.(0);
    };
    const stopPointer = pointerFrames(el, move, leave);
    return () => {
      stopPointer();
      xTo?.tween.kill();
      yTo?.tween.kill();
      if (xTo || yTo) gsap.set(el, { x: 0, y: 0 });
    };
  }, [strength]);
  return (
    <span ref={ref} className={className}>
      {children}
    </span>
  );
}

type ButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "outline" | "ghost";
  size?: "md" | "lg";
  icon?: boolean;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  cursor?: string;
  external?: boolean;
};

/** Magnetic button with gradient sweep. Renders a Link, <a> or <button>. */
export function Button({
  children,
  href,
  onClick,
  variant = "primary",
  size = "md",
  icon = true,
  className = "",
  type = "button",
  disabled,
  cursor,
  external,
}: ButtonProps) {
  const sizes = { md: "px-6 py-3.5 text-[11px]", lg: "px-8 py-5 text-xs" };
  const variants = {
    primary: "bg-ember-grad text-on-accent shadow-[0_14px_44px_-14px_var(--c-ember)] overflow-hidden",
    outline: "border border-line-strong text-fg hover:border-ember hover:text-accent bg-surface/40 backdrop-blur",
    ghost: "text-fg hover:text-accent",
  };
  const cls = cn(
    "group relative inline-flex select-none items-center justify-center gap-3 rounded-full font-mono font-semibold uppercase tracking-[0.14em] transition-colors duration-300 disabled:opacity-60",
    sizes[size],
    variants[variant],
    className
  );

  const inner = (
    <>
      {variant === "primary" && (
        <span aria-hidden className="absolute inset-0 -translate-x-[101%] bg-fg/20 transition-transform duration-500 ease-out group-hover:translate-x-0 group-active:translate-x-0" />
      )}
      <span className="relative">{children}</span>
      {icon && <ArrowUpRight className="relative h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-active:-translate-y-0.5 group-hover:translate-x-0.5 group-active:translate-x-0.5" aria-hidden />}
    </>
  );

  let el: ReactNode;
  if (href) {
    const isExternal = external || /^(https?:|mailto:|tel:)/.test(href);
    el = isExternal ? (
      <a href={href} className={cls} target={external || href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" data-cursor={cursor}>
        {inner}
      </a>
    ) : (
      <Link href={href} prefetch={false} className={cls} data-cursor={cursor}>
        {inner}
      </Link>
    );
  } else {
    el = (
      <button type={type} onClick={onClick} disabled={disabled} className={cls} data-cursor={cursor}>
        {inner}
      </button>
    );
  }
  const isFull = className.includes("w-full");
  return <Magnetic className={isFull ? "w-full block" : "inline-block"}>{el}</Magnetic>;
}

/** 3D tilt-on-hover with a pointer-following glare. */
export function TiltCard({ children, className = "", max = 7, glare = true }: { children: ReactNode; className?: string; max?: number; glare?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || isReducedMotion()) return;
    let rx: ReturnType<typeof gsap.quickTo> | undefined;
    let ry: ReturnType<typeof gsap.quickTo> | undefined;
    const move = (e: PointerEvent) => {
      if (!rx) {
        gsap.set(el, { transformPerspective: 1000 });
        rx = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3.out" });
        ry = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3.out" });
      }
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      ry!((px - 0.5) * max * 2);
      rx(-(py - 0.5) * max * 2);
      el.style.setProperty("--mx", `${px * 100}%`);
      el.style.setProperty("--my", `${py * 100}%`);
    };
    const leave = () => {
      rx?.(0);
      ry?.(0);
    };
    const stopPointer = pointerFrames(el, move, leave);
    return () => {
      stopPointer();
      rx?.tween.kill();
      ry?.tween.kill();
      if (rx || ry) gsap.set(el, { clearProps: "transform" });
    };
  }, [max]);

  return (
    <div ref={ref} className={cn("group/tilt relative", className)}>
      {children}
      {glare && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/tilt:opacity-100 group-data-[touching=true]/tilt:opacity-100"
          style={{ background: "radial-gradient(520px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.10), transparent 45%)" }}
        />
      )}
    </div>
  );
}
