import { FileText, MessageCircle, Printer } from "lucide-react";
import { breadcrumbLd, buildMetadata } from "@/lib/seo";
import { getCatalogues } from "@/lib/content";
import { PageHero } from "@/components/sections/PageHero";
import { CatalogueExperience } from "@/components/catalogue/CatalogueExperience";
import { JsonLd } from "@/components/ui/JsonLd";
import { Button, TiltCard } from "@/components/ui/interactive";
import { Card, Section, SectionHeader } from "@/components/ui/layout";
import { Reveal } from "@/components/ui/motion";

export const revalidate = 600;

export const metadata = buildMetadata({
  title: "3D Flipbook Catalogue Showcase — Digital & Print Catalogue Design",
  description:
    "Explore interactive page-turn catalogues for manufacturers and exporters: searchable SKUs, WhatsApp enquiry baskets and press-ready CMYK print files generated from the same data.",
  path: "/catalogues",
});

const FEATURES = [
  { icon: FileText, t: "Light on bandwidth", d: "Pages stream as optimised images — no 60 MB PDF download on slow factory Wi-Fi." },
  { icon: MessageCircle, t: "WhatsApp enquiry basket", d: "Buyers shortlist SKUs and send a structured enquiry to your sales team in one tap." },
  { icon: Printer, t: "Print-ready from the same data", d: "300 DPI CMYK PDFs with bleed and crop marks — digital and print never drift apart." },
];

export default async function CataloguesPage() {
  const catalogues = await getCatalogues();
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Catalogues", path: "/catalogues" }])} />
      <PageHero
        eyebrow="Catalogue showcase"
        title={"Catalogues you can\n*feel turning.*"}
        intro="Pick a design, then scroll — every step turns a page. This is the same engine we build for manufacturers, exporters and suppliers."
        crumbs={[{ name: "Home", href: "/" }, { name: "Catalogues", href: "/catalogues" }]}
      />

      <CatalogueExperience catalogues={catalogues} />

      <Section id="why" label="Why flipbooks" labelledBy="why-title">
        <SectionHeader headingId="why-title" eyebrow="Why it works" title={"More than a pretty\n*page turn.*"} intro="Every catalogue is built from your product data, so it stays fast, searchable and easy to update." />
        <div className="grid gap-6 md:grid-cols-3 md:gap-8">
          {FEATURES.map(({ icon: Icon, t, d }) => (
            <Reveal key={t} className="h-full">
              <TiltCard className="h-full rounded-[1.75rem]">
                <Card className="flex h-full flex-col">
                  <Icon className="h-7 w-7 text-accent" strokeWidth={1.5} aria-hidden />
                  <h3 className="t-h4 mt-12">{t}</h3>
                  <p className="t-body mt-3">{d}</p>
                </Card>
              </TiltCard>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-16 flex flex-wrap items-center gap-6">
          <Button href="/contact?service=catalogue-design" size="lg" cursor="Quote">
            Commission a catalogue
          </Button>
          <Button href="/pricing" size="lg" variant="outline" icon={false}>
            View packages
          </Button>
        </Reveal>
      </Section>
    </>
  );
}
