"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { PROJECT_FILTERS, type ProjectItem } from "@/data/siteData";
import { Section } from "@/components/ui/layout";
import { ImageReveal, ScrollSkew } from "@/components/ui/motion";

/** Filterable grid: strict two equal columns, identical 4:3 frames, hover-reveal summary. */
export function PortfolioGrid({ projects }: { projects: ProjectItem[] }) {
  const [filter, setFilter] = useState<(typeof PROJECT_FILTERS)[number]>("All");
  const items = filter === "All" ? projects : projects.filter((p) => p.category === filter);

  return (
    <Section id="projects" label="Projects" ariaLabel="Projects" className="!pt-0">
      <div role="tablist" aria-label="Filter projects" className="mb-8 flex flex-wrap items-center gap-1.5 sm:mb-12 sm:gap-2">
        {PROJECT_FILTERS.map((f) => {
          const count = f === "All" ? projects.length : projects.filter((p) => p.category === f).length;
          const active = filter === f;
          return (
            <button
              key={f}
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f)}
              className={`t-label relative rounded-full px-3.5 py-2 text-[10px] sm:px-5 sm:py-2.5 sm:text-xs transition-colors ${active ? "text-on-accent!" : "hover:text-fg"}`}
            >
              {active && <motion.span layoutId="filter-pill" className="absolute inset-0 rounded-full bg-ember-grad" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <span className="relative">
                {f} <sup className="ml-0.5 opacity-70">{count}</sup>
              </span>
            </button>
          );
        })}
      </div>

      <ScrollSkew>
        <motion.div layout className="grid gap-x-8 gap-y-10 sm:gap-y-14 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {items.map((p) => (
              <motion.article
                key={p.slug}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link href={`/portfolio/${p.slug}`} data-cursor="View" className="group block">
                  <div className="relative">
                    <ImageReveal className="aspect-[4/3] rounded-[1.5rem] sm:rounded-[1.75rem] border border-line bg-surface">
                      <Image
                        src={p.cover}
                        alt={p.coverAlt}
                        fill
                        sizes="(min-width:768px) 50vw, 100vw"
                        className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
                      />
                    </ImageReveal>
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.5rem] sm:rounded-[1.75rem]">
                      <div className="absolute inset-0 translate-y-full bg-gradient-to-t from-black/90 via-black/55 to-transparent p-6 sm:p-8 text-white transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0">
                        <div className="flex h-full flex-col justify-end">
                          <p className="max-w-md text-sm leading-6 text-white/85">{p.summary}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {p.stack.slice(0, 4).map((t) => (
                              <span key={t} className="t-label rounded-full border border-white/30 px-3 py-1 text-white!">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="t-label absolute left-5 top-5 sm:left-6 sm:top-6 rounded-full border border-white/25 bg-black/35 px-3 py-1 text-white! backdrop-blur">{p.category}</span>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-6 flex items-start justify-between gap-4 sm:gap-6">
                    <div>
                      <p className="t-label">
                        {p.client} · {p.year}
                      </p>
                      <h2 className="t-h4 mt-1.5 sm:mt-2">{p.title}</h2>
                      <p className="t-small mt-2 line-clamp-2 text-muted md:hidden">{p.summary}</p>
                    </div>
                    <span className="grid h-10 w-10 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-full border border-line-strong transition-all duration-500 group-hover:rotate-45 group-hover:border-transparent group-hover:bg-ember-grad group-hover:text-on-accent">
                      <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                    </span>
                  </div>
                </Link>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      </ScrollSkew>
    </Section>
  );
}
