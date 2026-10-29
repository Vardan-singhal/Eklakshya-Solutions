import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SITE } from "@/lib/site";
import { breadcrumbLd, buildMetadata } from "@/lib/seo";
import { getPosts } from "@/lib/content";
import { formatDate } from "@/data/siteData";
import { PageHero } from "@/components/sections/PageHero";
import { JsonLd } from "@/components/ui/JsonLd";
import { Section } from "@/components/ui/layout";
import { ImageReveal, Reveal, ScrollSkew } from "@/components/ui/motion";

export const revalidate = 600;

export const metadata = buildMetadata({
  title: "Journal — Web, Catalogue, AI & SEO Insights for Businesses",
  description:
    "Practical articles on interactive catalogues, choosing a tech stack, AI product imagery and technical SEO for manufacturers, exporters and startups.",
  path: "/blog",
});

export default async function BlogPage() {
  const [featured, ...rest] = await getPosts();
  const posts = [featured, ...rest];
  const ld = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Eklakshya Journal",
    url: `${SITE.url}/blog`,
    blogPost: posts.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: `${SITE.url}/blog/${p.slug}`, datePublished: p.date })),
  };
  return (
    <>
      <JsonLd data={[ld, breadcrumbLd([{ name: "Home", path: "/" }, { name: "Journal", path: "/blog" }])]} />
      <PageHero
        eyebrow="Journal"
        title={"Notes from the\n*workshop.*"}
        intro="Straight-talking articles on building fast websites, catalogues and software that actually generate business."
        crumbs={[{ name: "Home", href: "/" }, { name: "Journal", href: "/blog" }]}
      />

      <Section id="articles" label="Articles" ariaLabel="Articles" className="!pt-0">
        {/* Featured: image cols 1–7 · copy cols 8–12 */}
        <article className="mb-12 sm:mb-20">
          <Link href={`/blog/${featured.slug}`} data-cursor="Read" className="group grid items-center gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-16">
            <ImageReveal className="aspect-[16/10] rounded-[1.5rem] sm:rounded-[2rem] border border-line bg-surface lg:col-span-7">
              <Image src={featured.cover} alt={featured.coverAlt} fill priority sizes="(min-width:1024px) 58vw, 100vw" className="object-cover transition-transform duration-[1200ms] group-hover:scale-[1.05]" />
            </ImageReveal>
            <Reveal className="lg:col-span-5">
              <p className="t-eyebrow">Featured · {featured.category}</p>
              <h2 className="t-h3 mt-4 sm:mt-6 transition-colors group-hover:text-gradient">{featured.title}</h2>
              <p className="t-body mt-3 sm:mt-6">{featured.excerpt}</p>
              <p className="t-label mt-5 sm:mt-8 flex items-center gap-4">
                <time dateTime={featured.date}>{formatDate(featured.date)}</time>
                <span aria-hidden>·</span>
                {featured.readTime}
              </p>
            </Reveal>
          </Link>
        </article>

        <ScrollSkew>
          <div className="grid gap-x-8 gap-y-10 sm:gap-y-14 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((p) => (
              <Reveal key={p.slug}>
                <article>
                  <Link href={`/blog/${p.slug}`} data-cursor="Read" className="group block">
                    <ImageReveal className="aspect-[4/3] rounded-[1.5rem] sm:rounded-[1.75rem] border border-line bg-surface" parallax={6}>
                      <Image src={p.cover} alt={p.coverAlt} fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover transition-transform duration-[1200ms] group-hover:scale-[1.06]" />
                    </ImageReveal>
                    <p className="t-eyebrow mt-6">{p.category}</p>
                    <h2 className="t-h4 mt-3">{p.title}</h2>
                    <p className="t-small mt-3 line-clamp-3">{p.excerpt}</p>
                    <p className="t-label mt-6 flex items-center justify-between">
                      <span>
                        <time dateTime={p.date}>{formatDate(p.date)}</time> · {p.readTime}
                      </span>
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                    </p>
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>
        </ScrollSkew>
      </Section>
    </>
  );
}
