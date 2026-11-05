"use client";

import { Fragment, useRef, type ElementType } from "react";
import { SCROLL_MOTION } from "@/lib/motionSettings";
import { gsap } from "@/lib/gsap";
import { isReducedMotion, observeReadyEntrance, onReady, useIsoLayoutEffect } from "@/lib/engine";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  as?: ElementType;
  id?: string;
  className?: string;
  /** "scroll" reveals when scrolled into view, "load" waits for the preloader/page curtain */
  mode?: "scroll" | "load";
  by?: "words" | "chars";
  delay?: number;
  stagger?: number;
  start?: string;
};

/** "*gradient words*" are highlighted, "\n" forces a line break. */
function parse(text: string) {
  return text.split("\n").map((line) => {
    const out: { w: string; hl: boolean }[] = [];
    let hl = false;
    line
      .split(/\s+/)
      .filter(Boolean)
      .forEach((tok) => {
        let w = tok;
        if (w.startsWith("*")) {
          hl = true;
          w = w.slice(1);
        }
        let closing = false;
        if (w.endsWith("*")) {
          closing = true;
          w = w.slice(0, -1);
        }
        out.push({ w, hl });
        if (closing) hl = false;
      });
    return out;
  });
}

/**
 * Masked word / character reveal. Words are rendered as real text in the DOM
 * (SSR-friendly, crawlable); GSAP only animates transforms.
 */
export function SplitText({
  text,
  as: Tag = "h2",
  id,
  className = "",
  mode = "scroll",
  by = "words",
  delay = 0,
  stagger,
  start = "top 88%",
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const lines = parse(text);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const targets = el.querySelectorAll("[data-split]");
    let off = () => {};

    const ctx = gsap.context((self) => {
      if (isReducedMotion()) {
        const fade = self.add("fade", () => gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.6 }));
        off = mode === "load" ? onReady(() => fade()) : observeReadyEntrance(el, () => fade(), start);
        return;
      }
      const from = { yPercent: 118, rotate: 5, transformOrigin: "0% 100%" };
      const play = self.add("play", () =>
        gsap.fromTo(targets, from, {
          yPercent: 0,
          rotate: 0,
          duration: mode === "load" ? 0.8 : SCROLL_MOTION.headingDuration,
          delay: delay + (mode === "scroll" ? SCROLL_MOTION.revealDelay : 0),
          ease: mode === "load" ? "expo.out" : "power2.out",
          stagger: stagger ?? (by === "chars" ? 0.03 : mode === "load" ? 0.07 : SCROLL_MOTION.wordStagger),
        }));
      if (mode === "load") {
        gsap.set(targets, from);
        off = onReady(() => play());
      } else off = observeReadyEntrance(el, () => play(), start);
    }, el);

    return () => {
      off();
      ctx.revert();
    };
  }, []);

  return (
    <Tag ref={ref} id={id} className={cn(className)}>
      {lines.map((words, li) => (
        <Fragment key={li}>
          {words.map((w, wi) => (
            <Fragment key={wi}>
              <span className="mr-[0.13em] inline-block overflow-hidden align-bottom" style={{ paddingBottom: "0.16em", marginBottom: "-0.16em" }}>
                {by === "chars" ? (
                  w.w.split("").map((c, ci) => (
                    <span key={ci} data-split className={cn("inline-block", w.hl && "text-gradient")}>
                      {c}
                    </span>
                  ))
                ) : (
                  <span data-split className={cn("inline-block", w.hl && "text-gradient")}>
                    {w.w}
                  </span>
                )}
              </span>{" "}
            </Fragment>
          ))}
          {li < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </Tag>
  );
}
