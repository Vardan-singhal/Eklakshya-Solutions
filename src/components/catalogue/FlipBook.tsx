"use client";

import Image from "next/image";
import { useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { isReducedMotion, onReady, scrollToTarget, useIsoLayoutEffect } from "@/lib/engine";
import { SITE } from "@/lib/site";
import type { CatalogueItem } from "@/data/siteData";
import { TargetLogo } from "@/components/ui/brand";

type PageData =
  | { kind: "cover"; title: string; client: string; industry: string; year: string }
  | { kind: "intro"; title: string; blurb: string; client: string; skus: number }
  | { kind: "plate"; n: number; title: string; sub: string; image: string; alt: string; sku: number; specs: string[] }
  | { kind: "contact" }
  | { kind: "end"; client: string }
  | { kind: "blank" };

function buildPages(c: CatalogueItem): PageData[] {
  const pages: PageData[] = [
    { kind: "cover", title: c.title, client: c.client, industry: c.industry, year: c.year },
    { kind: "intro", title: c.title, blurb: c.blurb, client: c.client, skus: c.plates.reduce((a, p) => a + p.sku, 0) },
    ...c.plates.map((p, i) => ({
      kind: "plate" as const,
      n: i + 1,
      title: p.title,
      sub: p.sub,
      image: p.image,
      alt: p.imageAlt,
      sku: p.sku,
      specs: p.specs,
    })),
    { kind: "contact" },
    { kind: "end", client: c.client },
  ];
  if (pages.length % 2 === 1) pages.splice(pages.length - 1, 0, { kind: "blank" });
  return pages;
}

/** One printed page. Sizes use container-query units so it scales with the book. */
function Face({ page, side, index }: { page: PageData; side: "l" | "r"; index: number }) {
  const spine =
    side === "r" ? "bg-gradient-to-r from-black/30 via-black/5 to-transparent" : "bg-gradient-to-l from-black/30 via-black/5 to-transparent";
  const spineSide = side === "r" ? "left-0" : "right-0";
  const paper = "bg-[#f2eadb] text-[#17130d]";
  const dark = "bg-[#0d0c0a] text-[#f5efe3]";

  let body: React.ReactNode;
  let tone = paper;

  switch (page.kind) {
    case "cover":
      tone = dark;
      body = (
        <div className="relative flex h-full flex-col justify-between p-[9cqw]">
          <svg viewBox="0 0 200 200" className="pointer-events-none absolute -bottom-[18cqw] -right-[22cqw] w-[110cqw]" fill="none" aria-hidden>
            {[90, 68, 46, 24].map((r, i) => (
              <circle key={r} cx="100" cy="100" r={r} stroke={i % 2 ? "#39bfff" : "#e9b949"} strokeWidth="1.4" opacity={0.9 - i * 0.12} />
            ))}
            <path d="M100 0v200M0 100h200" stroke="#f5efe3" strokeOpacity=".2" />
            <circle cx="100" cy="100" r="5" fill="#e9b949" />
          </svg>
          <p className="relative font-mono text-[2.6cqw] uppercase tracking-[0.3em] text-[#39bfff]">Eklakshya · Catalogue {page.year}</p>
          <div className="relative">
            <p className="font-mono text-[2.8cqw] uppercase tracking-[0.2em] text-[#a39e92]">{page.industry}</p>
            <h3 className="mt-[3cqw] font-display text-[13cqw] font-semibold leading-[0.95] tracking-tight">{page.title}</h3>
            <p className="mt-[4cqw] font-mono text-[3cqw] uppercase tracking-[0.18em]">{page.client}</p>
          </div>
        </div>
      );
      break;
    case "intro":
      body = (
        <div className="flex h-full flex-col justify-between p-[9cqw]">
          <p className="font-mono text-[2.6cqw] uppercase tracking-[0.3em] text-[#85590b]">About this catalogue</p>
          <p className="font-display text-[6.6cqw] font-medium leading-[1.15] tracking-tight">{page.blurb}</p>
          <div className="grid grid-cols-2 gap-[4cqw] border-t border-black/15 pt-[5cqw]">
            <div>
              <p className="font-display text-[10cqw] font-semibold leading-none">{page.skus}</p>
              <p className="mt-[1.5cqw] font-mono text-[2.4cqw] uppercase tracking-[0.2em] text-black/60">SKUs indexed</p>
            </div>
            <div>
              <p className="font-display text-[10cqw] font-semibold leading-none">300</p>
              <p className="mt-[1.5cqw] font-mono text-[2.4cqw] uppercase tracking-[0.2em] text-black/60">DPI print-ready</p>
            </div>
          </div>
        </div>
      );
      break;
    case "plate":
      body = (
        <div className="flex h-full flex-col p-[8cqw]">
          <div className="flex items-center justify-between font-mono text-[2.4cqw] uppercase tracking-[0.25em] text-black/60">
            <span>Plate {String(page.n).padStart(2, "0")}</span>
            <span className="text-[#85590b]">{page.sku} SKUs</span>
          </div>
          <div className="relative mt-[4cqw] aspect-[4/3] w-full overflow-hidden rounded-[1.5cqw] bg-black">
            <Image src={page.image} alt={page.alt} fill sizes="(min-width:1024px) 440px, 50vw" className="object-cover" />
            <span className="absolute left-[2cqw] top-[2cqw] h-[4cqw] w-[4cqw] border-l-2 border-t-2 border-[#e9b949]" />
            <span className="absolute bottom-[2cqw] right-[2cqw] h-[4cqw] w-[4cqw] border-b-2 border-r-2 border-[#39bfff]" />
          </div>
          <h3 className="mt-[4.5cqw] font-display text-[6.4cqw] font-semibold leading-[1.05] tracking-tight">{page.title}</h3>
          <p className="mt-[1.5cqw] font-mono text-[2.5cqw] uppercase tracking-[0.12em] text-black/60">{page.sub}</p>
          <ul className="mt-[3.5cqw] space-y-[1.6cqw]">
            {page.specs.map((s) => (
              <li key={s} className="flex items-start gap-[2cqw] text-[3.1cqw] leading-snug">
                <span className="mt-[1.2cqw] h-[1.6cqw] w-[1.6cqw] shrink-0 bg-[#e9b949]" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      );
      break;
    case "contact":
      tone = "bg-gradient-to-br from-[#e9b949] to-[#39bfff] text-[#120f0b]";
      body = (
        <div className="flex h-full flex-col justify-between p-[9cqw]">
          <p className="font-mono text-[2.6cqw] uppercase tracking-[0.3em]">Order / enquire</p>
          <p className="font-display text-[10cqw] font-semibold leading-[1] tracking-tight">Want a catalogue like this?</p>
          <div className="space-y-[1.5cqw] font-mono text-[2.8cqw] uppercase tracking-[0.1em]">
            <p>{SITE.email}</p>
            <p>{SITE.phone}</p>
          </div>
        </div>
      );
      break;
    case "end":
      tone = dark;
      body = (
        <div className="flex h-full flex-col items-center justify-center gap-[5cqw] p-[9cqw] text-center">
          <TargetLogo size={64} className="text-[#f5efe3]" />
          <p className="font-display text-[7cqw] font-semibold tracking-tight">Eklakshya Solutions</p>
          <p className="font-mono text-[2.6cqw] uppercase tracking-[0.3em] text-[#a39e92]">Made for {page.client}</p>
        </div>
      );
      break;
    default:
      body = <div className="h-full" />;
  }

  return (
    <div className={`absolute inset-0 overflow-hidden [container-type:inline-size] ${tone}`}>
      {body}
      <div aria-hidden className={`pointer-events-none absolute inset-y-0 ${spineSide} w-[14%] ${spine}`} />
      {page.kind !== "cover" && page.kind !== "end" && (
        <span className={`absolute bottom-[4cqw] ${side === "r" ? "right-[7cqw]" : "left-[7cqw]"} font-mono text-[2.2cqw] tracking-[0.2em] opacity-60`}>
          {String(index + 1).padStart(2, "0")}
        </span>
      )}
      <div data-shade aria-hidden className="pointer-events-none absolute inset-0 bg-black opacity-0" />
    </div>
  );
}

/**
 * Page-turn catalogue. In `pinned` mode (desktop) the stage is pinned and every scroll
 * step turns a page (scrubbed, reversible). In `inline` mode the flip is scrubbed as the
 * book scrolls through the viewport. Below `md` it becomes a swipeable page list.
 * Buttons work everywhere (they scroll the pin, or tween the progress).
 */
export function FlipBook({
  catalogue,
  variant = "pinned",
  controls = true,
}: {
  catalogue: CatalogueItem;
  variant?: "pinned" | "inline";
  controls?: boolean;
}) {
  const pages = useMemo(() => buildPages(catalogue), [catalogue]);
  const sheets = useMemo(
    () => Array.from({ length: pages.length / 2 }, (_, i) => ({ front: pages[i * 2], back: pages[i * 2 + 1], i })),
    [pages]
  );

  const stage = useRef<HTMLDivElement>(null);
  const book = useRef<HTMLDivElement>(null);
  const leaves = useRef<(HTMLDivElement | null)[]>([]);
  const label = useRef<HTMLSpanElement>(null);
  const api = useRef<{ go: (dir: 1 | -1) => void }>({ go: () => {} });

  useIsoLayoutEffect(() => {
    const bookEl = book.current;
    const stageEl = stage.current;
    if (!bookEl || !stageEl) return;
    const leafEls = leaves.current.filter(Boolean) as HTMLDivElement[];
    const n = leafEls.length;
    const shades = leafEls.map((l) => Array.from(l.querySelectorAll<HTMLElement>("[data-shade]")));
    gsap.set(leafEls, { transformOrigin: "0% 50%" });

    const state = { p: 0 };
    let st: ScrollTrigger | null = null;
    let offReady = () => {};
    let refreshFrame = 0;

    const render = (p: number) => {
      leafEls.forEach((leaf, i) => {
        const lp = gsap.utils.clamp(0, 1, p * n - i);
        const eased = lp < 0.5 ? 2 * lp * lp : 1 - Math.pow(-2 * lp + 2, 2) / 2;
        gsap.set(leaf, { rotationY: -180 * eased, z: (lp < 0.5 ? n - i : i) * 0.8 });
        const o = String(Math.sin(eased * Math.PI) * 0.5);
        shades[i].forEach((s) => (s.style.opacity = o));
      });
      const open = Math.min(1, p * n);
      const close = Math.max(0, p * n - (n - 1));
      gsap.set(bookEl, { xPercent: -25 * (1 - open) + 25 * close });
      if (label.current) {
        const k = Math.round(p * n);
        label.current.textContent = k === 0 ? "Front cover" : k === n ? "Back cover" : `Pages ${k * 2}–${k * 2 + 1} of ${n * 2}`;
      }
    };

    const tweenTo = (step: number) => {
      gsap.to(state, { p: step / n, duration: 1.3, ease: "power2.inOut", overwrite: true, onUpdate: () => render(state.p) });
    };

    api.current.go = (dir) => {
      const current = Math.round((st ? st.progress : state.p) * n);
      const next = gsap.utils.clamp(0, n, current + dir);
      if (st) scrollToTarget(st.start + (st.end - st.start) * (next / n), 0);
      else tweenTo(next);
    };

    render(0);
    const mm = gsap.matchMedia();

    if (isReducedMotion()) {
      render(0.5 / n);
    } else if (variant === "inline") {
      // The hero and project rail insert pin spacing before this preview.
      // Wait until the page is ready, then bind the page turns to the final layout.
      offReady = onReady(() => {
        mm.add("(min-width: 768px)", () => {
          const tween = gsap.fromTo(state, { p: 0 }, {
            p: 1,
            ease: "none",
            onUpdate: () => render(state.p),
            scrollTrigger: {
              trigger: stageEl,
              start: "top 78%",
              end: "bottom 30%",
              scrub: true,
              invalidateOnRefresh: true,
              onRefresh: (self) => {
                state.p = self.progress;
                render(state.p);
              },
            },
          });
          st = tween.scrollTrigger ?? null;
          refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh());
          return () => {
            window.cancelAnimationFrame(refreshFrame);
            tween.scrollTrigger?.kill();
            tween.kill();
            st = null;
            render(0);
          };
        });
      });
    } else {
      mm.add("(min-width: 1024px)", () => {
        st = ScrollTrigger.create({
          trigger: stageEl,
          start: "top top",
          end: () => `+=${Math.round(window.innerHeight * 0.85 * n)}`,
          pin: true,
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            state.p = self.progress;
            render(self.progress);
          },
        });
        return () => {
          st?.kill();
          st = null;
        };
      });
    }

    return () => {
      offReady();
      window.cancelAnimationFrame(refreshFrame);
      mm.revert();
      st?.kill();
      gsap.killTweensOf(state);
    };
  }, [catalogue.id, variant]);

  const bookWidth =
    variant === "pinned" ? "min(94vw, calc(min(66vh, 620px) * 1.5))" : "min(100%, 760px)";

  return (
    <div>
      <div
        ref={stage}
        className={variant === "pinned" ? "relative flex min-h-[100svh] flex-col items-center justify-center gap-8 py-24 lg:py-16" : "relative flex flex-col items-center gap-6 py-6"}
      >
        {/* 3D book (md and up) */}
        <div className="hidden w-full justify-center [perspective:2600px] md:flex" data-cursor="Flip">
          <div ref={book} className="relative aspect-[3/2] [transform-style:preserve-3d]" style={{ width: bookWidth }}>
            <div aria-hidden className="absolute inset-y-0 left-0 w-1/2 rounded-l-xl border border-white/10 bg-[#0d0c0a] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)]" />
            <div aria-hidden className="absolute inset-y-0 right-0 w-1/2 rounded-r-xl border border-white/10 bg-[#0d0c0a] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)]" />
            {sheets.map((s) => (
              <div
                key={s.i}
                ref={(el) => {
                  leaves.current[s.i] = el;
                }}
                className="absolute right-0 top-0 h-full w-1/2 [transform-style:preserve-3d]"
              >
                <div className="absolute inset-0 overflow-hidden rounded-r-md [backface-visibility:hidden]">
                  <Face page={s.front} side="r" index={s.i * 2} />
                </div>
                <div className="absolute inset-0 overflow-hidden rounded-l-md [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <Face page={s.back} side="l" index={s.i * 2 + 1} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* swipeable pages (below md) */}
        <div className="-mx-[var(--gutter)] flex w-[calc(100%+calc(2*var(--gutter)))] snap-x snap-mandatory gap-3.5 overflow-x-auto px-[var(--gutter)] pb-4 md:hidden [scrollbar-width:none]" data-cursor="Drag">
          {pages.map((p, i) => (
            <div key={i} className="relative aspect-[3/4] w-[75vw] max-w-[290px] shrink-0 snap-center overflow-hidden rounded-xl shadow-2xl">
              <Face page={p} side="r" index={i} />
            </div>
          ))}
        </div>
        <p className="mt-1 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted md:hidden">Swipe to browse pages →</p>

        {controls && (
          <div className="hidden items-center gap-5 md:flex">
            <button
              type="button"
              onClick={() => api.current.go(-1)}
              aria-label="Previous page"
              className="grid h-12 w-12 place-items-center rounded-full border border-line-strong bg-surface/60 backdrop-blur transition-colors hover:border-ember hover:text-accent"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span aria-live="polite" className="min-w-44 text-center font-mono text-xs uppercase tracking-[0.2em] text-muted">
              <span ref={label} />
            </span>
            <button
              type="button"
              onClick={() => api.current.go(1)}
              aria-label="Next page"
              className="grid h-12 w-12 place-items-center rounded-full border border-line-strong bg-surface/60 backdrop-blur transition-colors hover:border-ember hover:text-accent"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
        {controls && variant === "pinned" && (
          <p className="hidden font-mono text-[10px] uppercase tracking-[0.3em] text-muted lg:block">Scroll to turn pages</p>
        )}
      </div>
    </div>
  );
}
