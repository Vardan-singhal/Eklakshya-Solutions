"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { engine, markReady, scrollToTarget } from "@/lib/engine";
import { ScrollTrigger } from "@/lib/gsap";
import { TargetLogo } from "@/components/ui/brand";

const COLS = 5;
const ease: [number, number, number, number] = [0.76, 0, 0.24, 1];

const strip: Variants = {
  hidden: { scaleY: 0, originY: 1 },
  cover: (i: number) => ({
    scaleY: 1,
    originY: 1,
    transition: { duration: 0.38, ease, delay: i * 0.035, originY: { duration: 0 } },
  }),
  reveal: (i: number) => ({
    scaleY: 0,
    originY: 0,
    transition: { duration: 0.45, ease, delay: i * 0.035, originY: { duration: 0 } },
  }),
};

const LABELS: Record<string, string> = {
  "/": "Home",
  "/services": "Services",
  "/portfolio": "Work",
  "/catalogues": "Catalogues",
  "/about": "About",
  "/pricing": "Pricing",
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

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Intercept internal navigation
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || a.hasAttribute("download") || (a.target && a.target !== "_self")) return;
      if (/^(mailto:|tel:|https?:|\/\/)/.test(href)) return;

      if (href.startsWith("#")) {
        e.preventDefault();
        e.stopPropagation();
        scrollToTarget(href);
        return;
      }

      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;

      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new Event("ek:nav-click"));
      if (phaseRef.current !== "idle") return;

      if (url.pathname === window.location.pathname) {
        if (url.hash) scrollToTarget(url.hash);
        else scrollToTarget(0, 0);
        return;
      }

      pending.current = url.pathname + url.search + url.hash;
      engine.ready = false;
      setLabel(labelFor(url.pathname));
      setPhase("cover");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const onCovered = () => {
    if (!pending.current) return;
    router.push(pending.current);
    // failsafe if navigation never lands
    window.setTimeout(() => {
      if (phaseRef.current === "cover") {
        setPhase("reveal");
        markReady();
      }
    }, 2000);
  };

  // New route mounted → scroll to top, refresh triggers, lift the curtain
  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    window.scrollTo(0, 0);
    engine.lenis?.scrollTo(0, { immediate: true, force: true });
    const hash = pending.current ? new URL(pending.current, window.location.origin).hash : window.location.hash;
    pending.current = null;

    const t = window.setTimeout(() => {
      ScrollTrigger.refresh();
      if (phaseRef.current === "cover") setPhase("reveal");
      window.setTimeout(markReady, 150);
      if (hash) window.setTimeout(() => scrollToTarget(hash), 600);
    }, 100);
    return () => window.clearTimeout(t);
  }, [pathname]);

  const animate = phase === "cover" ? "cover" : phase === "reveal" ? "reveal" : "hidden";

  return (
    <>
      {children}
      <div aria-hidden="true" className={`fixed inset-0 z-[150] ${phase === "idle" ? "pointer-events-none" : ""}`}>
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
                if (def === "reveal") setPhase("idle");
              }}
              className="-mr-px h-full flex-1 bg-ember will-change-transform"
            />
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "cover" ? 1 : 0, y: phase === "cover" ? 0 : -24 }}
          transition={{ duration: 0.45, delay: phase === "cover" ? 0.4 : 0 }}
          className="absolute inset-0 grid place-items-center text-on-accent"
        >
          <div className="flex flex-col items-center gap-5">
            <TargetLogo size={60} mono />
            <span className="font-display text-5xl font-semibold tracking-tight md:text-7xl">{label}</span>
          </div>
        </motion.div>
      </div>
    </>
  );
}
