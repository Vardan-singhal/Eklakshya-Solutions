/**
 * Pages keep their existing content API. Read MongoDB first, with the same bundled
 * fallback before configuration/seeding or during an outage. Never return BSON to clients.
 */
import * as bundled from "@/data/siteData";
import type { BlogPost, CatalogueItem, ProjectItem, ServiceItem, Testimonial } from "@/data/siteData";
import type { Database } from "@/db/schema";
import { hasDatabaseConfiguration, reportServerError } from "./env.server";

async function fromDb<T>(label: string, run: (db: Database) => Promise<T[]>, fallback: T[]): Promise<T[]> {
  if (!hasDatabaseConfiguration()) return fallback;
  try {
    const { getDb } = await import("@/db");
    const rows = await run(await getDb());
    return rows.length ? rows : fallback;
  } catch (error) {
    reportServerError(`[content] ${label}: using bundled data`, error);
    return fallback;
  }
}

export const getServices = () => fromDb<ServiceItem>("services", async (db) =>
  (await db.services.find({ published: true }).sort({ sortOrder: 1 }).toArray()).map((r) => ({
    id: r.slug, kind: r.kind, title: r.title, category: r.category, tagline: r.tagline,
    description: r.description, deliverables: r.deliverables, features: r.features,
    idealFor: r.idealFor, delivery: r.delivery,
  })), bundled.SERVICES);

export const getProjects = () => fromDb<ProjectItem>("projects", async (db) =>
  (await db.projects.find({ published: true }).sort({ sortOrder: 1 }).toArray()).map((r) => ({
    slug: r.slug, title: r.title, client: r.client, category: r.category, year: r.year,
    role: r.role, summary: r.summary,
    problem: r.problem.replace("took nine weeks and a large budget per assembly", "took nine weeks per assembly"),
    solution: r.solution,
    stack: r.stack, cover: r.cover, coverAlt: r.coverAlt,
    results: r.results.map((m) => ({ value: m.value, prefix: m.prefix, suffix: m.suffix, decimals: m.decimals ?? 0, label: m.label })),
  })), bundled.PROJECTS);

const retiredCatalogueIds = new Set(["apex-spares", "vedic-surfaces", "kalyan-textiles"]);

export const getCatalogues = () => fromDb<CatalogueItem>("catalogues", async (db) => {
  const records = await db.catalogues.find({ published: true }).sort({ sortOrder: 1 }).toArray();
  const catalogues: CatalogueItem[] = records.filter((r) => !retiredCatalogueIds.has(r.slug)).map((r) => {
    // The supplied PDFs replace demo entries even in an already seeded database.
    const supplied = bundled.CATALOGUES.find((catalogue) => catalogue.id === r.slug);
    if (supplied) return supplied;
    return {
      id: r.slug, title: r.title, client: r.client, industry: r.industry, year: r.year,
      blurb: r.blurb, plates: r.plates.map((p) => ({
        title: p.title, sub: p.sub, image: p.image, imageAlt: p.imageAlt, sku: p.sku, specs: p.specs,
      })),
      ...(r.pages ? { pages: r.pages } : {}),
      ...(r.pdf ? { pdf: r.pdf } : {}),
    };
  });
  return [...catalogues, ...bundled.CATALOGUES.filter((supplied) => !catalogues.some((c) => c.id === supplied.id))];
}, bundled.CATALOGUES);

export const getPosts = () => fromDb<BlogPost>("posts", async (db) =>
  (await db.posts.find({ published: true }).sort({ publishedAt: -1 }).toArray()).map((r) => ({
    slug: r.slug,
    // Retire the original monetary headline in existing seeds without rewriting records.
    title: r.slug === "ai-product-imagery-for-exporters" && /^Replacing .* photoshoots with AI product imagery/.test(r.title)
      ? bundled.BLOG_POSTS.find((post) => post.slug === r.slug)!.title : r.title,
    excerpt: r.excerpt, date: r.publishedAt.toISOString().slice(0, 10),
    readTime: r.readTime, category: r.category, tags: r.tags, cover: r.cover,
    coverAlt: r.coverAlt, sections: r.body,
  })), bundled.BLOG_POSTS);

export const getTestimonials = () => fromDb<Testimonial>("testimonials", async (db) =>
  (await db.testimonials.find({ published: true }).sort({ sortOrder: 1 }).toArray()).map((r) => ({
    quote: r.quote.replace("honest estimates", "clear milestones"), author: r.author, role: r.role, company: r.company,
  })), bundled.TESTIMONIALS);
