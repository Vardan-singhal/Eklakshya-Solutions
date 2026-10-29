import { BookOpen, MessageCircle, Search } from "lucide-react";
import type { CatalogueItem } from "@/data/siteData";
import { SectionLabel } from "@/components/ui/brand";
import { Button } from "@/components/ui/interactive";
import { Section } from "@/components/ui/layout";
import { Reveal } from "@/components/ui/motion";
import { SplitText } from "@/components/ui/SplitText";
import { FlipBook } from "@/components/catalogue/FlipBook";

const POINTS = [
  { icon: BookOpen, t: "Real page turns", d: "A tactile flipbook that loads in about a second on 4G." },
  { icon: Search, t: "Search every SKU", d: "Part number, size or material — found instantly." },
  { icon: MessageCircle, t: "One-tap enquiry", d: "Buyers send their shortlist straight to your WhatsApp." },
];

/** Home teaser: copy on cols 1–5, the flipbook on cols 6–12; it turns pages as it scrolls through view. */
export function CatalogueTeaser({ catalogue }: { catalogue: CatalogueItem }) {
  return (
    <Section id="catalogues" label="Catalogues" alt labelledBy="catalogues-title" className="overflow-hidden">
      <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <Reveal>
            <SectionLabel>Flagship specialty</SectionLabel>
          </Reveal>
          <SplitText as="h2" id="catalogues-title" text={"Catalogues that\n*turn heads*\nand pages."} className="t-h2 mt-6" />
          <Reveal delay={0.1}>
            <p className="t-lead mt-8 max-w-md">Replace 50 MB PDFs with an interactive 3D flipbook — plus press-ready print files generated from the same data.</p>
          </Reveal>
          <Reveal stagger={0.1} y={24} className="mt-10 space-y-6">
            {POINTS.map(({ icon: Icon, t, d }) => (
              <div key={t} className="flex gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-line-strong bg-surface text-accent">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="t-h4">{t}</h3>
                  <p className="t-small mt-1">{d}</p>
                </div>
              </div>
            ))}
          </Reveal>
          <Reveal delay={0.1} className="mt-10 flex flex-wrap gap-4">
            <Button href="/catalogues" cursor="Open">
              Open the showcase
            </Button>
            <Button href="/contact?service=catalogue-design" variant="outline" icon={false}>
              Get a quote
            </Button>
          </Reveal>
        </div>

        <div className="lg:col-span-7">
          <FlipBook catalogue={catalogue} variant="inline" controls={false} />
        </div>
      </div>
    </Section>
  );
}
