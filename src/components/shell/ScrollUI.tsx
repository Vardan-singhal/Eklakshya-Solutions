"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { scrollToTarget } from "@/lib/engine";

void gsap;

/** Thin ember scroll progress bar pinned to the top of the viewport. */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        el.style.transform = `scaleX(${self.progress})`;
      },
    });
    return () => st.kill();
  }, []);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px]">
      <div ref={bar} className="h-full origin-left bg-ember-grad" style={{ transform: "scaleX(0)" }} />
    </div>
  );
}

type Item = { id: string; label: string };

/** Side dot indicator that highlights the section currently in view (`[data-section]`). */
export function SectionDots() {
  const pathname = usePathname();
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const [hidden, setHidden] = useState(false);

  // fade the dots out once the reveal footer is showing
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const st = ScrollTrigger.create({ trigger: main, start: "bottom bottom+=260", onEnter: () => setHidden(true), onLeaveBack: () => setHidden(false) });
    return () => st.kill();
  }, [pathname]);

  useEffect(() => {
    let triggers: ScrollTrigger[] = [];
    const t = window.setTimeout(() => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-section]"));
      setItems(nodes.map((n) => ({ id: n.id, label: n.dataset.section ?? "" })));
      setActive(0);
      triggers = nodes.map((n, i) =>
        ScrollTrigger.create({
          trigger: n,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => {
            if (self.isActive) setActive(i);
          },
        })
      );
    }, 1400);
    return () => {
      window.clearTimeout(t);
      triggers.forEach((s) => s.kill());
      setItems([]);
    };
  }, [pathname]);

  if (items.length < 2) return null;

  return (
    <nav aria-label="Page sections" className={`fixed right-5 top-1/2 z-[55] hidden -translate-y-1/2 flex-col items-end gap-3.5 transition-opacity duration-500 xl:flex ${hidden ? "pointer-events-none opacity-0" : ""}`}>
      {items.map((it, i) => (
        <button
          key={`${it.id}-${i}`}
          type="button"
          onClick={() => it.id && scrollToTarget(`#${it.id}`)}
          aria-label={`Go to ${it.label}`}
          aria-current={active === i ? "true" : undefined}
          className="group flex items-center gap-3"
        >
          <span
            className={`font-mono text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${
              active === i ? "translate-x-0 text-accent opacity-100" : "translate-x-2 text-muted opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
            }`}
          >
            {it.label}
          </span>
          <span
            className={`block rounded-full border transition-all duration-300 ${
              active === i ? "h-3 w-3 border-ember bg-ember shadow-[0_0_14px_var(--c-ember)]" : "h-2 w-2 border-line-strong bg-transparent group-hover:border-ember"
            }`}
          />
        </button>
      ))}
    </nav>
  );
}
