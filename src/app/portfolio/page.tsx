import { SITE } from "@/lib/site";
import { breadcrumbLd, buildMetadata } from "@/lib/seo";
import { getProjects } from "@/lib/content";
import { PageHero } from "@/components/sections/PageHero";
import { PortfolioGrid } from "@/components/portfolio/PortfolioGrid";
import { JsonLd } from "@/components/ui/JsonLd";

export const revalidate = 600;

export const metadata = buildMetadata({
  title: "Portfolio & Case Studies — Web, App, SaaS, Catalogue & Visual Projects",
  description:
    "Selected client work: industrial ERPs, SaaS platforms, field apps, 3D flipbook catalogues and AI-generated product visuals — each with the problem, solution, stack and measurable results.",
  path: "/portfolio",
});

export default async function PortfolioPage() {
  const projects = await getProjects();
  const ld = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Eklakshya Solutions portfolio",
    url: `${SITE.url}/portfolio`,
    hasPart: projects.map((p) => ({ "@type": "CreativeWork", name: p.title, url: `${SITE.url}/portfolio/${p.slug}`, description: p.summary })),
  };
  return (
    <>
      <JsonLd data={[ld, breadcrumbLd([{ name: "Home", path: "/" }, { name: "Portfolio", path: "/portfolio" }])]} />
      <PageHero
        eyebrow="Portfolio"
        title={"Work that moves\n*the numbers.*"}
        intro="A selection of projects across web, apps, SaaS, catalogues and visuals. Open any case study for the problem, the solution, the stack and the result."
        crumbs={[{ name: "Home", href: "/" }, { name: "Portfolio", href: "/portfolio" }]}
      />
      <PortfolioGrid projects={projects} />
    </>
  );
}
