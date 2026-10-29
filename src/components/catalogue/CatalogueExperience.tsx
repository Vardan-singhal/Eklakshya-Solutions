"use client";

import { useState } from "react";
import type { CatalogueItem } from "@/data/siteData";
import { ScrollTrigger } from "@/lib/gsap";
import { scrollToTarget } from "@/lib/engine";
import { TiltCard } from "@/components/ui/interactive";
import { Section } from "@/components/ui/layout";
import { FlipBook } from "./FlipBook";

/** Catalogue gallery (pick a design) + the scroll-driven flipbook stage. */
export function CatalogueExperience({ catalogues }: { catalogues: CatalogueItem[] }) {
  const [id, setId] = useState(catalogues[0].id);
  const active = catalogues.find((c) => c.id === id) ?? catalogues[0];

  const select = (next: string) => {
    if (next === id) {
      scrollToTarget("#catalogue-stage", 0);
      return;
    }
    setId(next);
    window.setTimeout(() => {
      ScrollTrigger.refresh();
      scrollToTarget("#catalogue-stage", 0);
    }, 250);
  };

  return (
    <>
      <Section id="gallery" label="Gallery" ariaLabel="Catalogue designs" className="!pt-0">
        <h2 className="sr-only">Catalogue designs</h2>
        <div className="grid gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {catalogues.map((c, i) => {
            const on = c.id === id;
            return (
              <TiltCard key={c.id} className="rounded-[1.75rem]" max={8}>
                <button
                  type="button"
                  onClick={() => select(c.id)}
                  aria-pressed={on}
                  data-cursor="Open"
                  className={`group relative block h-full w-full overflow-hidden rounded-[1.5rem] border p-3 sm:p-4 text-left transition-colors sm:rounded-[1.75rem] ${on ? "border-ember bg-surface" : "border-line bg-surface/60 hover:border-line-strong"}`}
                >
                  <div className="relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-2xl bg-[#0d0c0a] p-5 sm:p-8 text-[#f5efe3]">
                    <svg viewBox="0 0 200 200" className="absolute -bottom-10 -right-14 w-[110%] transition-transform duration-700 group-hover:rotate-12 group-hover:scale-110" fill="none" aria-hidden>
                      {[90, 68, 46, 24].map((r, k) => (
                        <circle key={r} cx="100" cy="100" r={r} stroke={k % 2 ? "#39bfff" : "#e9b949"} strokeWidth="1.3" opacity={0.9 - k * 0.12} />
                      ))}
                      <circle cx="100" cy="100" r="5" fill="#e9b949" />
                    </svg>
                    <p className="t-eyebrow relative text-[#39bfff]!">
                      No. {String(i + 1).padStart(2, "0")} · {c.year}
                    </p>
                    <div className="relative">
                      <p className="t-h3">{c.title}</p>
                      <p className="t-label mt-2 sm:mt-3 text-[#a39e92]!">{c.client}</p>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-5 flex items-start justify-between gap-3 sm:gap-4 px-1 pb-1 sm:px-2 sm:pb-2">
                    <div>
                      <h3 className="t-h4">{c.industry}</h3>
                      <p className="t-small mt-1">
                        {c.plates.length + 4} pages · {c.plates.reduce((a, p) => a + p.sku, 0)} SKUs
                      </p>
                    </div>
                    <span className={`t-label ${on ? "text-accent!" : ""}`}>{on ? "Viewing" : "Open"}</span>
                  </div>
                </button>
              </TiltCard>
            );
          })}
        </div>
      </Section>

      <section id="catalogue-stage" data-section="Flipbook" aria-label={`${active.title} flipbook`} className="section-alt">
        <div className="container-x pt-12 sm:pt-20 md:pt-28">
          <p className="t-eyebrow">Now viewing</p>
          <h2 className="t-h2 mt-4 sm:mt-6 max-w-4xl">
            {active.title} <span className="text-muted">— {active.client}</span>
          </h2>
        </div>
        <FlipBook key={active.id} catalogue={active} variant="pinned" />
      </section>
    </>
  );
}
