"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { gsap } from "@/lib/gsap";
import { useIsoLayoutEffect } from "@/lib/engine";
import type { ProjectItem } from "@/data/siteData";
import { SectionHeader } from "@/components/ui/layout";

/**
 * Pinned horizontal gallery: vertical scroll drives the track sideways while each image
 * drifts inside its frame. Hover expands the details. On mobile it becomes a swipe rail.
 * The track's left edge is lined up with the page container via `pl-container`.
 */
export function ProjectsRail({ projects }: { projects: ProjectItem[] }) {
  const pin = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useIsoLayoutEffect(() => {
    const pinEl = pin.current;
    const trackEl = track.current;
    if (!pinEl || !trackEl) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const dist = () => Math.max(0, trackEl.scrollWidth - window.innerWidth);
      const tween = gsap.to(trackEl, {
        x: () => -dist(),
        ease: "none",
        scrollTrigger: {
          trigger: pinEl,
          start: "top top",
          end: () => `+=${dist()}`,
          pin: true,
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (counter.current) counter.current.textContent = String(Math.min(projects.length, Math.floor(self.progress * projects.length) + 1)).padStart(2, "0");
            if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`;
          },
        },
      });
      trackEl.querySelectorAll<HTMLElement>("[data-card]").forEach((card) => {
        gsap.fromTo(
          card.querySelector("[data-card-img]"),
          { xPercent: -9 },
          { xPercent: 9, ease: "none", scrollTrigger: { trigger: card, containerAnimation: tween, start: "left right", end: "right left", scrub: true } }
        );
      });
    });
    return () => mm.revert();
  }, [projects]);

  return (
    <section id="work" data-section="Work" aria-labelledby="work-title" className="relative border-y border-line bg-bg/60">
      <div ref={pin} className="flex flex-col justify-center py-16 sm:py-24 lg:h-[100svh] lg:py-0">
        <div className="container-x w-full">
          <SectionHeader
            compact
            headingId="work-title"
            eyebrow="Selected work"
            title={"Proof, not *promises.*"}
            action={
              <div className="t-label hidden items-center gap-5 lg:flex" aria-hidden>
                <span>
                  <span ref={counter} className="text-fg">
                    01
                  </span>{" "}
                  / {String(projects.length).padStart(2, "0")}
                </span>
                <span className="block h-px flex-1 bg-line-strong">
                  <span ref={bar} className="block h-full origin-left bg-ember-grad" style={{ transform: "scaleX(0)" }} />
                </span>
                <span>Scroll →</span>
              </div>
            }
          />
        </div>

        <div
          ref={track}
          data-cursor="Scroll"
          className="pl-container flex snap-x snap-mandatory gap-4 overflow-x-auto pb-6 pr-[var(--gutter)] will-change-transform [scrollbar-width:none] sm:gap-6 lg:snap-none lg:gap-8 lg:overflow-visible lg:pb-0 lg:pr-[14vw]"
        >
          {projects.map((p, i) => (
            <Link
              key={p.slug}
              href={`/portfolio/${p.slug}`}
              data-card
              data-cursor="View"
              aria-label={`${p.title} — case study`}
              className="group relative block w-[85vw] max-w-[340px] shrink-0 snap-center sm:w-[56vw] sm:max-w-none lg:w-[34vw] lg:snap-align-none"
            >
              <div className="relative h-[min(54vh,480px)] min-h-[340px] overflow-hidden rounded-[1.5rem] border border-line bg-surface sm:min-h-[360px] sm:rounded-[1.75rem]">
                <div data-card-img className="absolute inset-y-0 -inset-x-[14%]">
                  <Image
                    src={p.cover}
                    alt={p.coverAlt}
                    fill
                    sizes="(min-width:1024px) 45vw, 90vw"
                    className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07]"
                  />
                </div>
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10" />

                <span className="t-label absolute left-5 top-5 rounded-full border border-white/25 bg-black/30 px-2.5 py-1 text-white! backdrop-blur sm:left-6 sm:top-6 sm:px-3">
                  {String(i + 1).padStart(2, "0")} · {p.category}
                </span>
                <span className="absolute right-5 top-5 grid h-10 w-10 -translate-y-2 place-items-center rounded-full bg-ember-grad text-on-accent opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 sm:right-6 sm:top-6 sm:h-11 sm:w-11">
                  <ArrowUpRight className="h-5 w-5" aria-hidden />
                </span>

                <div className="absolute inset-x-0 bottom-0 translate-y-[calc(100%-6rem)] p-5 text-white transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0 max-lg:translate-y-0 sm:translate-y-[calc(100%-6.5rem)] sm:p-8">
                  <p className="t-label text-white/70!">{p.client}</p>
                  <h3 className="t-h4 mt-1.5 sm:mt-2">{p.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-white/80 opacity-0 transition-opacity delay-100 duration-500 group-hover:opacity-100 max-lg:opacity-100 line-clamp-3 sm:mt-3 sm:text-sm sm:leading-6 sm:line-clamp-none">{p.summary}</p>
                </div>
              </div>
            </Link>
          ))}

          <Link
            href="/portfolio"
            data-cursor="All"
            className="group grid h-[min(54vh,480px)] min-h-[340px] w-[75vw] max-w-[300px] shrink-0 snap-center place-items-center rounded-[1.5rem] border border-dashed border-line-strong p-6 text-center transition-colors hover:border-ember sm:min-h-[360px] sm:w-[40vw] sm:max-w-none sm:rounded-[1.75rem] sm:p-8 lg:w-[24vw]"
          >
            <span>
              <span className="t-h3 block">
                All <span className="text-gradient">projects</span>
              </span>
              <span className="t-label mt-5 inline-flex items-center gap-2 group-hover:text-accent sm:mt-6">
                Browse the archive <ArrowUpRight className="h-4 w-4" aria-hidden />
              </span>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
