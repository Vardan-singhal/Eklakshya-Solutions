import { STATS } from "@/data/siteData";
import { SectionLabel } from "@/components/ui/brand";
import { Section } from "@/components/ui/layout";
import { Counter, Reveal, ScrollFill } from "@/components/ui/motion";

/** Statement with scroll-linked text fill + animated counters in a uniform 4-up grid. */
export function Manifesto() {
  return (
    <Section id="approach" label="Approach" ariaLabel="Our approach">
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-12">
          <Reveal>
            <SectionLabel>Ek Lakshya — one target</SectionLabel>
          </Reveal>
          <ScrollFill
            className="t-h2 mt-6 max-w-5xl"
            text="Most studios chase everything. We pick one target — your business outcome — and engineer every pixel, query and animation to hit it. Precision. Focus. Results."
          />
        </div>
      </div>

      <Reveal stagger={0.1} y={40} className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-[1.5rem] border border-line bg-line sm:rounded-[1.75rem] md:mt-20 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="flex flex-col justify-between gap-6 bg-bg/90 p-5 backdrop-blur sm:gap-10 sm:p-8 md:p-10">
            <p className="t-label">{s.label}</p>
            <p className="t-h3 sm:t-h2">
              <Counter to={s.value} suffix={s.suffix} decimals={s.decimals ?? 0} className="text-gradient" />
            </p>
          </div>
        ))}
      </Reveal>
    </Section>
  );
}
