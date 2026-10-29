import Link from "next/link";
import { Check, Clock, Wallet } from "lucide-react";
import { SITE } from "@/lib/site";
import { breadcrumbLd, buildMetadata } from "@/lib/seo";
import { getServices } from "@/lib/content";
import { PageHero } from "@/components/sections/PageHero";
import { JsonLd } from "@/components/ui/JsonLd";
import { SERVICE_ICON } from "@/components/ui/icons";
import { Button, TiltCard } from "@/components/ui/interactive";
import { Card, Section } from "@/components/ui/layout";
import { Reveal } from "@/components/ui/motion";
import { SplitText } from "@/components/ui/SplitText";
import { ServiceVisual } from "@/components/three/ServiceVisual";

export const revalidate = 600;

export const metadata = buildMetadata({
  title: "Services — Web, Apps, SaaS, Catalogues, AI Visuals & SEO",
  description:
    "Web development, app development, custom software, SaaS products, 3D catalogue design, AI image generation and SEO — delivered by one full-stack studio with fixed quotes.",
  path: "/services",
});

export default async function ServicesPage() {
  const services = await getServices();

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: services.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Service",
        name: s.title,
        description: s.description,
        serviceType: s.category,
        areaServed: "Worldwide",
        url: `${SITE.url}/services#${s.id}`,
        provider: { "@type": "Organization", name: SITE.name, url: SITE.url },
      },
    })),
  };

  return (
    <>
      <JsonLd data={[serviceLd, breadcrumbLd([{ name: "Home", path: "/" }, { name: "Services", path: "/services" }])]} />

      <PageHero
        eyebrow="Services"
        title={`${services.length} ways to hit\n*the target.*`}
        intro="Every engagement starts with a fixed scope and ends with something measurable. Pick a service below — or combine them into one build."
        crumbs={[{ name: "Home", href: "/" }, { name: "Services", href: "/services" }]}
      />

      <div className="sticky top-[3.75rem] z-30 border-y border-line bg-bg/70 backdrop-blur-xl sm:top-[4.6rem]">
        <nav aria-label="Services" className="container-x flex gap-2 overflow-x-auto py-3 [scrollbar-width:none]">
          {services.map((s, i) => (
            <a key={s.id} href={`#${s.id}`} className="t-label shrink-0 rounded-full border border-line px-3.5 py-1.5 sm:px-4 sm:py-2 transition-colors hover:border-ember hover:text-fg">
              <span className="mr-2 text-accent">{String(i + 1).padStart(2, "0")}</span>
              {s.title}
            </a>
          ))}
        </nav>
      </div>

      {services.map((s, i) => {
        const Icon = SERVICE_ICON[s.kind];
        return (
          <Section key={s.id} id={s.id} label={s.title} labelledBy={`h-${s.id}`} className="scroll-mt-24 sm:scroll-mt-28 border-b border-line">
            <div className="grid gap-8 sm:gap-12 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-7">
                <Reveal className="flex items-center gap-4">
                  <span className="grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-2xl border border-line-strong bg-surface text-accent">
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} aria-hidden />
                  </span>
                  <span className="t-eyebrow">
                    {String(i + 1).padStart(2, "0")} / {String(services.length).padStart(2, "0")} · {s.category}
                  </span>
                </Reveal>

                <SplitText as="h2" id={`h-${s.id}`} text={s.title} className="t-h2 mt-4 sm:mt-6" />

                <Reveal delay={0.1}>
                  <p className="t-lead mt-6 sm:mt-8 text-fg!">{s.tagline}</p>
                  <p className="t-body mt-3 sm:mt-4 max-w-2xl">{s.description}</p>
                </Reveal>

                <h3 className="t-label mb-3 sm:mb-4 mt-8 sm:mt-12 text-fg!">Deliverables</h3>
                <Reveal as="ul" stagger={0.08} y={24} className="border-t border-line">
                  {s.deliverables.map((d) => (
                    <li key={d} className="flex items-start gap-3 sm:gap-4 border-b border-line py-3 sm:py-4 text-sm sm:text-[15px] leading-6">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                      {d}
                    </li>
                  ))}
                </Reveal>

                <Reveal className="mt-6 sm:mt-8 flex flex-wrap gap-2 sm:gap-2.5">
                  {s.features.map((f) => (
                    <span key={f} className="t-label rounded-full border border-line-strong px-3.5 py-1.5 sm:px-4 sm:py-2">
                      {f}
                    </span>
                  ))}
                </Reveal>

                <Reveal className="mt-8 sm:mt-10">
                  <Card className="grid gap-6 sm:grid-cols-3 sm:gap-8">
                    <div>
                      <p className="t-label mb-2 flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" aria-hidden /> Delivery
                      </p>
                      <p className="t-h4">{s.delivery}</p>
                    </div>
                    <div>
                      <p className="t-label mb-2 flex items-center gap-2">
                        <Wallet className="h-3.5 w-3.5" aria-hidden /> From
                      </p>
                      <p className="t-h4">{s.from}</p>
                    </div>
                    <div>
                      <p className="t-label mb-2">Ideal for</p>
                      <p className="t-small">{s.idealFor}</p>
                    </div>
                  </Card>
                </Reveal>

                <Reveal className="mt-8 sm:mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                  <Button href={`/contact?service=${s.id}`} cursor="Quote">
                    Get a quote
                  </Button>
                  <Link href="/pricing" className="link-underline t-label hover:text-fg">
                    See packages
                  </Link>
                </Reveal>
              </div>

              <div className="mt-4 sm:mt-0 lg:col-span-5">
                <div className="lg:sticky lg:top-40">
                  <TiltCard className="rounded-[1.5rem] sm:rounded-[1.75rem] border border-line bg-surface p-2 sm:p-3" max={6}>
                    <ServiceVisual kind={s.kind} />
                  </TiltCard>
                </div>
              </div>
            </div>
          </Section>
        );
      })}
    </>
  );
}
