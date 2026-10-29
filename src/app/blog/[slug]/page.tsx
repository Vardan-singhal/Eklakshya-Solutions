import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { breadcrumbLd, buildMetadata } from "@/lib/seo";
import { getPosts } from "@/lib/content";
import { formatDate } from "@/data/siteData";
import { PageHero } from "@/components/sections/PageHero";
import { JsonLd } from "@/components/ui/JsonLd";
import { Button } from "@/components/ui/interactive";
import { Card, Section } from "@/components/ui/layout";
import { ImageReveal, Reveal } from "@/components/ui/motion";

export const revalidate = 600;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = (await getPosts()).find((x) => x.slug === slug);
  if (!p) return { title: "Article not found" };
  return {
    ...buildMetadata({ title: p.title, description: p.excerpt, path: `/blog/${p.slug}`, type: "article" }),
    openGraph: { type: "article", title: p.title, description: p.excerpt, url: `${SITE.url}/blog/${p.slug}`, publishedTime: p.date, tags: p.tags },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const all = await getPosts();
  const post = all.find((x) => x.slug === slug);
  if (!post) notFound();
  const related = all.filter((x) => x.slug !== post.slug).slice(0, 2);

  const ld = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: `${SITE.url}${post.cover}`,
    datePublished: post.date,
    dateModified: post.date,
    keywords: post.tags.join(", "),
    author: { "@type": "Organization", name: SITE.name },
    publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: `${SITE.url}/brand/full-logo.png` } },
    mainEntityOfPage: `${SITE.url}/blog/${post.slug}`,
  };

  return (
    <>
      <JsonLd
        data={[
          ld,
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Journal", path: "/blog" },
            { name: post.title, path: `/blog/${post.slug}` },
          ]),
        ]}
      />
      <PageHero
        size="md"
        eyebrow={`${post.category} · ${post.readTime}`}
        title={post.title}
        crumbs={[
          { name: "Home", href: "/" },
          { name: "Journal", href: "/blog" },
          { name: post.category, href: `/blog/${post.slug}` },
        ]}
      >
        <Reveal mode="load" delay={0.5} className="t-label mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span>By {SITE.name}</span>
        </Reveal>
      </PageHero>

      <div className="container-x">
        <ImageReveal className="aspect-[16/9] rounded-[1.5rem] border border-line bg-surface sm:aspect-[16/8] sm:rounded-[2rem]" parallax={6}>
          <Image src={post.cover} alt={post.coverAlt} fill priority sizes="100vw" className="object-cover" />
        </ImageReveal>
      </div>

      {/* Reading column: centred, 672px */}
      <Section id="article" label="Article" ariaLabel="Article">
        <article className="mx-auto max-w-2xl">
          <Reveal>
            <p className="t-quote text-fg!">{post.excerpt}</p>
          </Reveal>
          {post.sections.map((s, i) => (
            <div key={i} className="mt-10 sm:mt-14">
              {s.heading && (
                <Reveal>
                  <h2 className="t-h3">{s.heading}</h2>
                </Reveal>
              )}
              {s.paragraphs.map((para, j) => (
                <Reveal key={j} y={28}>
                  <p className="t-lead mt-5 sm:mt-6">{para}</p>
                </Reveal>
              ))}
            </div>
          ))}

          <Reveal className="mt-10 sm:mt-14 flex flex-wrap gap-2 border-t border-line pt-6 sm:pt-8">
            {post.tags.map((t) => (
              <span key={t} className="t-label rounded-full border border-line-strong px-3.5 py-1.5 sm:px-4 sm:py-2">
                #{t}
              </span>
            ))}
          </Reveal>

          <Reveal className="mt-10 sm:mt-14">
            <Card>
              <h2 className="t-h4">Want this built for your business?</h2>
              <p className="t-body mt-2.5 sm:mt-3">Tell us the outcome you need — we&apos;ll reply with a fixed-price plan.</p>
              <div className="mt-6 sm:mt-8">
                <Button href="/contact" className="w-full sm:w-auto" cursor="Talk">
                  Start a project
                </Button>
              </div>
            </Card>
          </Reveal>
        </article>
      </Section>

      <Section id="related" label="More" alt labelledBy="related-title">
        <h2 id="related-title" className="t-label mb-8 text-fg!">
          Keep reading
        </h2>
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          {related.map((r) => (
            <Reveal key={r.slug} className="h-full">
              <Link href={`/blog/${r.slug}`} data-cursor="Read" className="card group block h-full transition-colors hover:border-ember">
                <p className="t-eyebrow">{r.category}</p>
                <h3 className="t-h4 mt-4">{r.title}</h3>
                <p className="t-small mt-3">{r.excerpt}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}
