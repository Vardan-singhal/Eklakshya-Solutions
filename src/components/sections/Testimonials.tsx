"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Testimonial } from "@/data/siteData";
import { Section, SectionHeader } from "@/components/ui/layout";

/** Auto-rotating quotes. All quotes stay in the DOM (crawlable); only the active one is visible. */
export function Testimonials({ items }: { items: Testimonial[] }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setIdx((v) => (v + 1) % items.length), 7000);
    return () => window.clearInterval(id);
  }, [paused, items.length]);

  return (
    <Section id="voices" label="Voices" labelledBy="voices-title">
      <SectionHeader headingId="voices-title" eyebrow="Kind words" title={"Trusted by founders\nand *factory floors.*"} />

      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} data-cursor="Read">
        <div className="lg:col-span-8">
          <div className="grid">
            {items.map((t, i) => (
              <motion.figure
                key={t.author}
                aria-hidden={i !== idx}
                initial={false}
                animate={{ opacity: i === idx ? 1 : 0, y: i === idx ? 0 : 28 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className={`col-start-1 row-start-1 ${i === idx ? "" : "pointer-events-none"}`}
              >
                <blockquote className="t-quote">“{t.quote}”</blockquote>
                <figcaption className="mt-8 flex items-center gap-3 sm:mt-10 sm:gap-4">
                  <span className="t-h4 grid h-11 w-11 place-items-center rounded-full bg-ember-grad text-sm font-semibold text-on-accent! sm:h-14 sm:w-14 sm:text-base">
                    {t.author
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div>
                    <span className="block text-sm font-semibold sm:text-base">{t.author}</span>
                    <span className="t-label mt-0.5 block">
                      {t.role} · {t.company}
                    </span>
                  </div>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>

        <div className="flex flex-row gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] sm:gap-3 lg:col-span-4 lg:flex-col lg:overflow-visible lg:pb-0" role="tablist" aria-label="Choose testimonial">
          {items.map((t, i) => (
            <button
              key={t.author}
              role="tab"
              aria-selected={i === idx}
              onClick={() => setIdx(i)}
              className={`relative min-w-[120px] flex-1 overflow-hidden rounded-xl border p-3.5 text-left transition-colors sm:min-w-0 sm:rounded-2xl sm:p-5 ${i === idx ? "border-ember bg-surface" : "border-line hover:border-line-strong"}`}
            >
              <span className="block truncate text-xs font-semibold sm:whitespace-normal sm:text-sm">{t.company}</span>
              <span className="t-label mt-1 hidden sm:block">{t.author}</span>
              {i === idx && !paused && (
                <motion.span
                  key={`bar-${idx}`}
                  className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-ember-grad"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 7, ease: "linear" }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </Section>
  );
}
