"use client";

import Link from "next/link";
import { useRef } from "react";
import { Check } from "lucide-react";
import { gsap } from "@/lib/gsap";
import { useIsoLayoutEffect } from "@/lib/engine";
import type { ServiceItem } from "@/data/siteData";
import { Button, TiltCard } from "@/components/ui/interactive";
import { Section, SectionHeader } from "@/components/ui/layout";
import { ServiceVisual } from "@/components/three/ServiceVisual";

/**
 * Sticky stacking deck: each card sticks under the navbar; as the next card slides over,
 * the previous one scales down and dims. Desktop only — on mobile cards simply flow.
 */
export function ServicesStack({ services }: { services: ServiceItem[] }) {
  const root = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-stack-card]", el);
      cards.forEach((card, i) => {
        const next = cards[i + 1];
        if (!next) return;
        const inner = card.querySelector("[data-stack-inner]");
        const shade = card.querySelector("[data-stack-shade]");
        const scrollTrigger = { trigger: next, start: "top bottom", end: "top 18%", scrub: true };
        gsap.to(inner, { scale: 0.92, ease: "none", scrollTrigger });
        gsap.to(shade, { opacity: 0.6, ease: "none", scrollTrigger });
      });
    });
    return () => mm.revert();
  }, [services]);

  return (
    <Section id="services" label="Services" labelledBy="services-title">
      <SectionHeader
        headingId="services-title"
        eyebrow="What we build"
        title={`${services.length} services.\n*One standard.*`}
        intro="Everything you need to get from idea to a product that earns — designed, built and launched by one accountable team."
        action={
          <Link href="/services" className="link-underline t-label text-accent">
            Explore all services →
          </Link>
        }
      />

      <div ref={root} className="space-y-6 pb-[12vh] lg:space-y-8">
        {services.map((s, i) => (
          <article key={s.id} data-stack-card className="lg:sticky" style={{ top: `calc(6.25rem + ${i * 0.9}rem)` }} aria-labelledby={`stack-${s.id}`}>
            <div data-stack-inner className="panel relative origin-top overflow-hidden shadow-[0_30px_80px_-40px_rgba(0,0,0,0.6)]">
              <div data-stack-shade aria-hidden className="pointer-events-none absolute inset-0 z-20 bg-bg opacity-0" />
              <div className="grid gap-10 lg:min-h-[min(58vh,520px)] lg:grid-cols-12 lg:gap-12">
                <div className="flex flex-col lg:col-span-7">
                  <div className="flex items-center justify-between gap-4">
                    <span className="t-eyebrow">
                      {String(i + 1).padStart(2, "0")} / {String(services.length).padStart(2, "0")}
                    </span>
                    <span className="t-label rounded-full border border-line-strong px-3 py-1">{s.category}</span>
                  </div>
                  <h3 id={`stack-${s.id}`} className="t-h3 mt-6 sm:mt-8">
                    {s.title}
                  </h3>
                  <p className="t-lead mt-3 sm:mt-4 max-w-xl">{s.tagline}</p>
                  <ul className="mt-6 sm:mt-8 space-y-2.5 sm:space-y-3">
                    {s.deliverables.slice(0, 3).map((d) => (
                      <li key={d} className="flex items-start gap-3 text-sm sm:text-[15px] leading-6 text-fg/90">
                        <Check className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden />
                        {d}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 pt-6 sm:mt-auto sm:pt-10">
                    <Button href={`/contact?service=${s.id}`} cursor="Quote">
                      Get a quote
                    </Button>
                    <Link href={`/services#${s.id}`} className="link-underline t-label text-fg">
                      Full details
                    </Link>
                    <span className="t-label w-full sm:w-auto sm:ml-auto">
                      {s.delivery} · from {s.from}
                    </span>
                  </div>
                </div>
                <div className="mt-4 sm:mt-0 lg:col-span-5 lg:self-center">
                  <TiltCard className="rounded-2xl sm:rounded-3xl border border-line bg-surface-2/60 p-2" max={6}>
                    <ServiceVisual kind={s.kind} />
                  </TiltCard>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
