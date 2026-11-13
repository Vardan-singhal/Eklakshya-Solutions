"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Variants } from "framer-motion";
import * as motion from "framer-motion/m";
import { engine, markReady, scrollToTarget } from "@/lib/engine";
import { requestScrollRefresh } from "@/lib/gsap";
import { TargetLogo } from "@/components/ui/brand";

const COLS = 5;
const ease: [number, number, number, number] = [0.76, 0, 0.24, 1];

const strip: Variants = {
  hidden: { scaleY: 0, originY: 1 },
  cover: (i: number) => ({
    scaleY: 1,
    originY: 1,
    transition: { duration: 0.5, ease, delay: i * 0.045, originY: { duration: 0 } },
  }),
  reveal: (i: number) => ({
    scaleY: 0,
    originY: 0,
    transition: { duration: 0.65, ease, delay: i * 0.045, originY: { duration: 0 } },
  }),
};

const LABELS: Record<string, string> = {
  "/": "Home",
  "/services": "Services",
  "/portfolio": "Work",
  "/catalogues": "Catalogues",
  "/about": "About",
  "/blog": "Journal",
  "/contact": "Contact",
};
const labelFor = (p: string) =>
  LABELS[p] ?? (p.startsWith("/portfolio/") ? "Case Study" : p.startsWith("/blog/") ? "Article" : "Eklakshya");

type Phase = "idle" | "cover" | "reveal";

/**
 * Route transitions with Framer Motion. A capture-phase click listener intercepts
 * internal links, an ember curtain wipes up (showing the destination name), the
 * route changes underneath, then the curtain lifts and the new page animates in.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const [label, setLabel] = useState("");
  const phaseRef = useRef<Phase>("idle");
  const pending = useRef<string | null>(null);
  const prevPath = useRef(pathname);
  const navigationTimer = useRef(0);
  const anchorFrame = useRef(0);
  const changePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);
  const finishReveal = () => {
    changePhase("idle");
    if (!document.documentElement.classList.contains("menu-open")) engine.lenis?.start();
    markReady();
  };

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a");
      const href = link?.getAttribute("href");
      if (!link || !href || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin || !["http:", "https:"].includes(url.protocol)) return;
      // Query-only updates retain Next's normal handling; pathname cannot signal their completion.
      if (url.pathname === window.location.pathname && url.search !== window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      if (phaseRef.current !== "idle") return;
      window.dispatchEvent(new Event("ek:nav-click"));
      if (url.pathname === window.location.pathname) {
        window.cancelAnimationFrame(anchorFrame.current);
        anchorFrame.current = window.requestAnimationFrame(() => {
          // Let the mobile menu release its scroll lock before the anchor animation.
          scrollToTarget(url.hash || 0);
          if (url.hash) history.replaceState(history.state, "", url.pathname + url.search + url.hash);
        });
        return;
      }
      pending.current = url.pathname + url.search + url.hash;
      document.documentElement.removeAttribute("data-initial-entrance");
      router.prefetch(url.pathname + url.search);
      engine.ready = false;
      engine.velocity = 0;
      engine.lenis?.stop();
      setLabel(labelFor(url.pathname));
      changePhase("cover");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router, changePhase]);

  useEffect(() => () => {
    window.clearTimeout(navigationTimer.current);
    window.cancelAnimationFrame(anchorFrame.current);
  }, []);

  const onCovered = () => {
    if (!pending.current) return;
    router.push(pending.current, { scroll: false });
    window.clearTimeout(navigationTimer.current);
    navigationTimer.current = window.setTimeout(() => {
      if (phaseRef.current === "cover") {
        markReady();
        changePhase("reveal");
      }
    }, 8000);
  };

  useEffect(() => {
    if (prevPath.current === pathname) return;
    document.documentElement.removeAttribute("data-initial-entrance");
    prevPath.current = pathname;
    window.clearTimeout(navigationTimer.current);
    const hash = pending.current ? new URL(pending.current, window.location.origin).hash : window.location.hash;
    pending.current = null;
    engine.velocity = 0;
    engine.direction = 1;
    engine.lenis?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo({ top: 0, behavior: "instant" });
    let disposed = false;
    let cancelRefresh = () => {};
    const frame = window.requestAnimationFrame(() => {
      // Let ready-dependent pins mount, then measure and align underneath the curtain.
      markReady();
      cancelRefresh = requestScrollRefresh(() => {
        if (disposed) return;
        if (hash) scrollToTarget(hash, undefined, { immediate: true });
        if (phaseRef.current === "cover") changePhase("reveal");
        else if (!document.documentElement.classList.contains("menu-open")) engine.lenis?.start();
      });
    });
    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      cancelRefresh();
    };
  }, [pathname, changePhase]);

  const animate = phase === "cover" ? "cover" : phase === "reveal" ? "reveal" : "hidden";

  return (
    <>
      {children}
      {phase !== "idle" && <div aria-hidden="true" className="fixed inset-0 z-[150]">
        <div className="absolute inset-0 flex">
          {Array.from({ length: COLS }).map((_, i) => (
            <motion.div
              key={i}
              custom={i}
              variants={strip}
              initial="hidden"
              animate={animate}
              onAnimationComplete={(def) => {
                if (i !== COLS - 1) return;
                if (def === "cover") onCovered();
                if (def === "reveal") finishReveal();
              }}
              className="-mr-px h-full flex-1 bg-ember will-change-transform"
            />
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "cover" ? 1 : 0, y: phase === "cover" ? 0 : -24 }}
          transition={{ duration: 0.5, delay: phase === "cover" ? 0.2 : 0 }}
          className="absolute inset-0 grid place-items-center text-on-accent"
        >
          <div className="flex flex-col items-center gap-5">
            <TargetLogo size={60} mono />
            <span className="font-display text-5xl font-semibold tracking-tight md:text-7xl">{label}</span>
          </div>
        </motion.div>
      </div>}
    </>
  );
}
