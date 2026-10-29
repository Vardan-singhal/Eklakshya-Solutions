import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { SITE } from "@/lib/site";
import { breadcrumbLd, buildMetadata } from "@/lib/seo";
import { getProjects } from "@/lib/content";
import { PageHero } from "@/components/sections/PageHero";
import { JsonLd } from "@/components/ui/JsonLd";
import { BrowserFrame, PhoneFrame } from "@/components/ui/frames";
import { Button } from "@/components/ui/interactive";
import { Section, SectionHeader } from "@/components/ui/layout";
import { Counter, ImageReveal, Reveal } from "@/components/ui/motion";
import { SplitText } from "@/components/ui/SplitText";

export const revalidate = 600;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getProjects()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = (await getProjects()).find((x) => x.slug === slug);
  if (!p) return { title: "Case study not found" };
  return buildMetadata({ title: `${p.title} — ${p.category} case study`, description: p.summary, path: `/portfolio/${p.slug}` });
}

const SERVICE_FOR: Record<string, string> = {
  App: "app-development",
  SaaS: "saas-product-development",
  Catalogues: "catalogue-design",
  Images: "image-generation",
  Web: "web-development",
};

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const all = await getProjects();
  const idx = all.findIndex((x) => x.slug === slug);
  if (idx < 0) notFound();
  const p = all[idx];
  const next = all[(idx + 1) % all.length];

  const ld = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: p.title,
    description: p.summary,
    image: `${SITE.url}${p.cover}`,
    creator: { "@type": "Organization", name: SITE.name, url: SITE.url },
    dateCreated: p.year,
    keywords: p.stack.join(", "),
  };

  return (
    <>
      <JsonLd
        data={[
          ld,
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Portfolio", path: "/portfolio" },
            { name: p.title, path: `/portfolio/${p.slug}` },
          ]),
        ]}
      />
      <PageHero
        size="md"
        eyebrow={`${p.category} · Case study`}
        title={p.title}
        intro={p.summary}
        crumbs={[
          { name: "Home", href: "/" },
          { name: "Portfolio", href: "/portfolio" },
          { name: p.title, href: `/portfolio/${p.slug}` },
        ]}
      >
        <Reveal mode="load" delay={0.6} className="mt-8 grid max-w-3xl grid-cols-2 gap-4 border-t border-line pt-6 sm:mt-12 sm:gap-8 sm:pt-8 sm:grid-cols-4">
          {[
            ["Client", p.client],
            ["Year", p.year],
            ["Role", p.role],
            ["Category", p.category],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="t-label">{k}</p>
              <p className="mt-1 text-sm font-medium leading-6 sm:mt-2">{v}</p>
            </div>
          ))}
        </Reveal>
      </PageHero>

      <div className="container-x">
        <ImageReveal className="aspect-[16/9] rounded-[1.5rem] border border-line bg-surface sm:rounded-[2rem]" parallax={7}>
          <Image src={p.cover} alt={p.coverAlt} fill priority sizes="100vw" className="object-cover" />
        </ImageReveal>
      </div>

      {/* Results */}
      <Section id="results" label="Results" ariaLabel="Results">
        <h2 className="sr-only">Results</h2>
        <div className="grid gap-px overflow-hidden rounded-[1.5rem] border border-line bg-line sm:rounded-[1.75rem] md:grid-cols-3">
          {p.results.map((m) => (
            <div key={m.label} className="flex flex-col justify-between gap-6 bg-bg/90 p-5 backdrop-blur sm:gap-10 sm:p-8 md:p-10">
              <p className="t-label">{m.label}</p>
              <p className="t-h2 sm:t-h1">
                <Counter to={m.value} prefix={m.prefix} suffix={m.suffix} decimals={m.decimals ?? 0} className="text-gradient" />
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Problem / Solution */}
      <Section id="story" label="Story" ariaLabel="Problem and solution" className="!pt-0">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-24">
          {[
            { k: "01 — The problem", h: "What was getting in the way", t: p.problem },
            { k: "02 — The solution", h: "What we built", t: p.solution },
          ].map((b) => (
            <div key={b.k}>
              <Reveal>
                <p className="t-eyebrow">{b.k}</p>
              </Reveal>
              <SplitText as="h2" text={b.h} className="t-h3 mt-4 sm:mt-6" />
              <Reveal delay={0.1}>
                <p className="t-lead mt-6 sm:mt-8">{b.t}</p>
              </Reveal>
            </div>
          ))}
        </div>
      </Section>

      {/* Stack */}
      <Section id="stack" label="Stack" alt ariaLabel="Tech stack">
        <h2 className="t-label mb-6 text-fg! sm:mb-8">Tech stack</h2>
        <Reveal stagger={0.07} y={24} className="flex flex-wrap gap-2 sm:gap-3">
          {p.stack.map((t) => (
            <span key={t} className="rounded-full border border-line-strong bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-wider sm:px-6 sm:py-3 sm:t-h4">
              {t}
            </span>
          ))}
        </Reveal>
      </Section>

      {/* Screens */}
      <Section id="screens" label="Screens" labelledBy="screens-title">
        <SectionHeader headingId="screens-title" eyebrow="Details" title={"Screens &\n*details.*"} />
        <div className="grid items-center gap-6 sm:gap-8 lg:grid-cols-12">
          <Reveal className="lg:col-span-8">
            <BrowserFrame src={p.cover} alt={`${p.title} — desktop view`} pos="left center" />
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-4">
            <PhoneFrame src={p.cover} alt={`${p.title} — mobile view`} pos="70% center" />
          </Reveal>
          <Reveal className="lg:col-span-8 lg:col-start-3">
            <BrowserFrame src={p.cover} alt={`${p.title} — detail view`} pos="right center" zoom={1.4} url="app.eklakshya.dev/detail" />
          </Reveal>
        </div>
      </Section>

      {/* Next */}
      <Section id="next" label="Next" alt ariaLabel="Next case study">
        <Reveal>
          <p className="t-eyebrow">Next case study</p>
        </Reveal>
        <Link href={`/portfolio/${next.slug}`} data-cursor="Next" className="group mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <span className="t-h2 sm:t-h1 transition-colors group-hover:text-gradient">{next.title}</span>
          <span className="mb-2 grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line-strong transition-all duration-500 group-hover:rotate-45 group-hover:border-transparent group-hover:bg-ember-grad group-hover:text-on-accent sm:h-16 sm:w-16 md:h-20 md:w-20">
            <ArrowUpRight className="h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8" aria-hidden />
          </span>
        </Link>
        <Reveal className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-line pt-8 sm:mt-16 sm:pt-10">
          <p className="t-h4">Facing a similar challenge?</p>
          <Button href={`/contact?service=${SERVICE_FOR[p.category] ?? "web-development"}`} cursor="Talk">
            Discuss your project
          </Button>
        </Reveal>
      </Section>
    </>
  );
}
