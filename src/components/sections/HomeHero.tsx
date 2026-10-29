"use client";

import { useRef } from "react";
import { gsap } from "@/lib/gsap";
import { engine, useIsoLayoutEffect } from "@/lib/engine";
import { Hero3D } from "@/components/three/Hero3D";
import { SplitText } from "@/components/ui/SplitText";
import { Reveal } from "@/components/ui/motion";
import { Button } from "@/components/ui/interactive";

/**
 * Cinematic pinned hero. While pinned, scroll progress (0→1) is written to
 * `engine.heroProgress`; the 3D scene reads it to dolly through the rings,
 * expand/fade them and fly the arrow at the camera. An ember circle then
 * wipes the screen, handing over to the Services section. scrub:true → reversible.
 */
export function HomeHero() {
  const pin = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const hud = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const pinEl = pin.current;
    if (!pinEl) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: pinEl,
          start: "top top",
          end: "+=170%",
          pin: true,
          scrub: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            engine.heroProgress = self.progress;
          },
        },
      });
      tl.to(text.current, { yPercent: -24, opacity: 0, duration: 0.35 }, 0)
        .to(hud.current, { opacity: 0, duration: 0.2 }, 0)
        .fromTo(flash.current, { scale: 0 }, { scale: 1, duration: 0.26, ease: "power2.in" }, 0.74);
      return () => {
        engine.heroProgress = 0;
      };
    });
    return () => {
      mm.revert();
      engine.heroProgress = 0;
    };
  }, []);

  return (
    <section id="top" data-section="Intro" aria-label="Introduction">
      <div ref={pin} className="relative h-[100svh] min-h-[580px] sm:min-h-[680px] w-full overflow-hidden">
        <Hero3D />

        {/* readability veil behind the headline */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 70% 85% at 22% 58%, var(--c-bg) 0%, transparent 72%)", opacity: 0.92 }}
        />

        {/* mobile: fade the artwork out behind the copy so the paragraph stays legible */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[80%] bg-gradient-to-t from-bg via-bg/90 to-transparent lg:hidden" />

        <div className="container-x relative z-10 flex h-full items-end pb-16 pt-24 sm:pb-24 sm:pt-32 lg:items-center lg:pb-0 lg:pt-0">
          <div ref={text} className="max-w-[58rem]">
            <SplitText
              as="h1"
              mode="load"
              delay={0.15}
              text={"One studio.\nOne target.\n*Zero misses.*"}
              className="t-display"
            />

            <Reveal mode="load" delay={0.7} y={24} className="mt-6 sm:mt-8 max-w-lg">
              <p className="t-lead">
                Websites, apps, SaaS products, 3D catalogues and AI visuals for startups, manufacturers and growing businesses — engineered with precision and shipped on time.
              </p>
            </Reveal>

            <Reveal mode="load" delay={0.9} y={24} className="mt-8 sm:mt-10 flex flex-wrap items-center gap-3 sm:gap-4">
              <Button href="/contact" size="lg" cursor="Let's talk">
                Start a project
              </Button>
              <Button href="/portfolio" size="lg" variant="outline" icon={false} cursor="View">
                See the work
              </Button>
            </Reveal>
          </div>
        </div>

        {/* HUD */}
        <div ref={hud} aria-hidden className="pointer-events-none absolute inset-0 z-10 hidden lg:block">
          <div className="absolute right-10 top-28 text-right font-mono text-[10px] uppercase leading-relaxed tracking-[0.25em] text-muted">
            <p>Lat 23.0225° N · Lon 72.5714° E</p>
            <p className="text-accent">Target lock · acquired</p>
          </div>
          <div className="absolute bottom-10 right-10 flex items-center gap-4" data-cursor="Scroll">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">Scroll</span>
            <span className="relative block h-14 w-px overflow-hidden bg-line-strong">
              <span className="absolute inset-x-0 h-1/3 animate-scroll-dot bg-ember" />
            </span>
          </div>
        </div>

        {/* ember colour-wipe into the next section */}
        <div
          ref={flash}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 -ml-[85vmax] -mt-[85vmax] h-[170vmax] w-[170vmax] rounded-full bg-ember-grad"
          style={{ transform: "scale(0)" }}
        />
      </div>
    </section>
  );
}
