"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useIsoLayoutEffect } from "@/lib/engine";
import { NAV, SITE, whatsappLink } from "@/lib/site";
import { Button } from "@/components/ui/interactive";
import { BrandWordmark, StaticTarget, TargetLogo } from "@/components/ui/brand";

const HEADLINE = ["Let's", "hit", "the", "target."];

type FooterLink = { label: string; href: string };

/**
 * Reveal footer: fixed behind <main>, which slides up to uncover it. Layout is the same
 * 12-column grid as the rest of the site: brand 4 · services 3 · studio 2 · contact 3.
 */
export function Footer({ services }: { services: FooterLink[] }) {
  const ref = useRef<HTMLElement>(null);
  const [time, setTime] = useState("");

  useEffect(() => {
    const fmt = () => new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).format(new Date());
    const t0 = window.setTimeout(() => setTime(fmt()), 0);
    const id = window.setInterval(() => setTime(fmt()), 30_000);
    return () => {
      window.clearTimeout(t0);
      window.clearInterval(id);
    };
  }, []);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (min-height: 840px) and (prefers-reduced-motion: no-preference)", () => {
      const words = el.querySelectorAll("[data-fw]");
      const fades = el.querySelectorAll("[data-ff]");
      const set = () => {
        gsap.set(words, { yPercent: 115, rotate: 4, transformOrigin: "0% 100%" });
        gsap.set(fades, { opacity: 0, y: 28 });
      };
      set();
      const st = ScrollTrigger.create({
        trigger: document.querySelector("main"),
        start: "bottom bottom+=520",
        onEnter: () => {
          gsap.to(words, { yPercent: 0, rotate: 0, duration: 1.2, stagger: 0.09, ease: "expo.out" });
          gsap.to(fades, { opacity: 1, y: 0, duration: 1, stagger: 0.08, delay: 0.3, ease: "power3.out" });
        },
        onLeaveBack: set,
      });
      return () => st.kill();
    });
    return () => mm.revert();
  }, []);

  return (
    <footer ref={ref} className="reveal-footer overflow-hidden border-t border-line" aria-label="Site footer">
      <div className="pointer-events-none absolute -right-20 -top-24 w-[320px] max-w-[85vw] opacity-40 sm:-right-24 sm:-top-28 sm:w-[520px]">
        <StaticTarget className="h-auto w-full" />
      </div>
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-50" aria-hidden />

      <div className="container-x relative flex h-full flex-col justify-between gap-10 py-10 sm:gap-12 sm:py-14">
        <div>
          <p data-ff className="t-eyebrow mb-5 sm:mb-6 flex items-center gap-3">
            <span className="h-px w-8 sm:w-10 bg-ember" /> Ready when you are
          </p>
          <p className="t-h1">
            {HEADLINE.map((w, i) => (
              <span key={w} className="mr-[0.22em] inline-block overflow-hidden align-bottom" style={{ paddingBottom: "0.14em", marginBottom: "-0.14em" }}>
                <span data-fw className={`inline-block ${i === 3 ? "text-gradient" : ""}`}>
                  {w}
                </span>
              </span>
            ))}
          </p>
          <div data-ff className="mt-8 flex flex-wrap items-center gap-4 sm:mt-10 sm:gap-x-8 sm:gap-y-5">
            <Button href="/contact" size="lg" cursor="Let's go">
              Start a project
            </Button>
            <a href={`mailto:${SITE.email}`} className="link-underline t-h4 break-all sm:break-normal">
              {SITE.email}
            </a>
          </div>
        </div>

        <div className="grid gap-8 border-t border-line pt-8 sm:gap-10 sm:grid-cols-2 sm:pt-10 lg:grid-cols-12">
          <div data-ff className="space-y-5 lg:col-span-4">
            <div className="flex items-center gap-3">
              <TargetLogo size={32} className="text-fg" />
              <span role="img" aria-label="Eklakshya Solutions"><BrandWordmark size={32} className="max-w-full" /></span>
            </div>
            <p className="t-small max-w-xs">Ek Lakshya — “one target”. Full-stack development for startups, manufacturers and growing businesses.</p>
          </div>

          <FooterCol title="Services" items={services} className="lg:col-span-3" />
          <FooterCol title="Studio" items={NAV.slice(1).map((n) => ({ label: n.label, href: n.href }))} className="lg:col-span-2" />

          <div data-ff className="space-y-3 lg:col-span-3">
            <h3 className="t-label mb-4 text-fg!">Contact</h3>
            <a href={`mailto:${SITE.email}`} className="link-underline t-small block hover:text-fg">
              {SITE.email}
            </a>
            <a href={`tel:${SITE.phone.replace(/\s/g, "")}`} className="link-underline t-small block hover:text-fg">
              {SITE.phone}
            </a>
            <a href={whatsappLink("Hi Eklakshya, I'd like to discuss a project.")} target="_blank" rel="noopener noreferrer" className="link-underline t-small block hover:text-fg">
              WhatsApp ↗
            </a>
            <p className="t-small">
              {SITE.location}
              {time && <span className="ml-2 font-mono text-xs text-accent">· {time} IST</span>}
            </p>
          </div>
        </div>

        <div data-ff className="t-label flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
          <p className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ember" /> Taking on projects this quarter
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items, className = "" }: { title: string; items: FooterLink[]; className?: string }) {
  return (
    <div data-ff className={className}>
      <h3 className="t-label mb-4 text-fg!">{title}</h3>
      <ul className="space-y-2.5">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="link-underline t-small transition-colors hover:text-fg">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
