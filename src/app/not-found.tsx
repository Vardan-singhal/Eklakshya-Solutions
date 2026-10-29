import type { Metadata } from "next";
import { StaticTarget } from "@/components/ui/brand";
import { Button } from "@/components/ui/interactive";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <section className="relative grid min-h-[100svh] place-items-center overflow-hidden px-6 py-32">
      <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-50">
        <StaticTarget className="h-[min(120vw,760px)] w-[min(120vw,760px)] max-w-none" />
      </div>
      <div className="relative text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent">Error 404 · Off target</p>
        <h1 className="mt-5 font-display text-[clamp(4rem,16vw,12rem)] font-semibold leading-[0.9] tracking-tight">
          <span className="text-gradient">404</span>
        </h1>
        <p className="mx-auto mt-6 max-w-md text-lg text-muted">That page missed the bullseye. Let&apos;s get you back on target.</p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button href="/" size="lg">
            Back home
          </Button>
          <Button href="/contact" size="lg" variant="outline" icon={false}>
            Contact us
          </Button>
        </div>
      </div>
    </section>
  );
}
