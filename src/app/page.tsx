import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { buildMetadata } from "@/lib/seo";
import { getCatalogues, getProjects, getServices, getTestimonials } from "@/lib/content";
import { PROCESS, TECH } from "@/data/siteData";
import { HomeHero } from "@/components/sections/HomeHero";
import { Manifesto } from "@/components/sections/Manifesto";
import { ServicesStack } from "@/components/sections/ServicesStack";
import { ProjectsRail } from "@/components/sections/ProjectsRail";
import { CatalogueTeaser } from "@/components/sections/CatalogueTeaser";
import { Timeline } from "@/components/sections/Timeline";
import { Testimonials } from "@/components/sections/Testimonials";
import { Section, SectionHeader } from "@/components/ui/layout";
import { Marquee } from "@/components/ui/Marquee";

export const revalidate = 600;

export const metadata: Metadata = {
  ...buildMetadata({ title: "Eklakshya Solutions — Full-stack development studio", description: SITE.description, path: "/" }),
  title: { absolute: "Eklakshya Solutions — Full-stack development studio | One target. Zero misses." },
};

export default async function HomePage() {
  const [services, projects, catalogues, testimonials] = await Promise.all([getServices(), getProjects(), getCatalogues(), getTestimonials()]);

  return (
    <>
      <HomeHero />

      <section aria-label="Technologies we use" className="relative space-y-4 border-y border-line bg-bg/70 py-10 backdrop-blur-sm">
        <Marquee items={TECH} speed={50} />
        <Marquee items={[...TECH].reverse()} speed={42} reverse outline />
      </section>

      <Manifesto />
      <ServicesStack services={services} />
      <ProjectsRail projects={projects} />
      <CatalogueTeaser catalogue={catalogues[0]} />

      <Section id="process" label="Process" labelledBy="process-title">
        <SectionHeader headingId="process-title" eyebrow="How we work" title={"Four steps to\n*the bullseye.*"} intro="Every project follows the same calibrated path, so you always know what happens next and what you will receive." />
        <Timeline steps={PROCESS} />
      </Section>

      <Testimonials items={testimonials} />
    </>
  );
}
