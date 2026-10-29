/**
 * Pages keep their existing content API. Read MongoDB first, with the same bundled
 * fallback before configuration/seeding or during an outage. Never return BSON to clients.
 */
import * as bundled from "@/data/siteData";
import type { BlogPost, CatalogueItem, PricingTier, ProjectItem, ServiceItem, Testimonial } from "@/data/siteData";
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
    idealFor: r.idealFor, delivery: r.delivery, from: r.fromPrice,
  })), bundled.SERVICES);

export const getProjects = () => fromDb<ProjectItem>("projects", async (db) =>
  (await db.projects.find({ published: true }).sort({ sortOrder: 1 }).toArray()).map((r) => ({
    slug: r.slug, title: r.title, client: r.client, category: r.category, year: r.year,
    role: r.role, summary: r.summary, problem: r.problem, solution: r.solution,
    stack: r.stack, cover: r.cover, coverAlt: r.coverAlt,
    results: r.results.map((m) => ({ value: m.value, prefix: m.prefix, suffix: m.suffix, decimals: m.decimals ?? 0, label: m.label })),
  })), bundled.PROJECTS);

export const getCatalogues = () => fromDb<CatalogueItem>("catalogues", async (db) =>
  (await db.catalogues.find({ published: true }).sort({ sortOrder: 1 }).toArray()).map((r) => ({
    id: r.slug, title: r.title, client: r.client, industry: r.industry, year: r.year,
    blurb: r.blurb, plates: r.plates.map((p) => ({
      title: p.title, sub: p.sub, image: p.image, imageAlt: p.imageAlt, sku: p.sku, specs: p.specs,
    })),
  })), bundled.CATALOGUES);

export const getPosts = () => fromDb<BlogPost>("posts", async (db) =>
  (await db.posts.find({ published: true }).sort({ publishedAt: -1 }).toArray()).map((r) => ({
    slug: r.slug, title: r.title, excerpt: r.excerpt, date: r.publishedAt.toISOString().slice(0, 10),
    readTime: r.readTime, category: r.category, tags: r.tags, cover: r.cover,
    coverAlt: r.coverAlt, sections: r.body,
  })), bundled.BLOG_POSTS);

export const getTestimonials = () => fromDb<Testimonial>("testimonials", async (db) =>
  (await db.testimonials.find({ published: true }).sort({ sortOrder: 1 }).toArray()).map((r) => ({
    quote: r.quote, author: r.author, role: r.role, company: r.company,
  })), bundled.TESTIMONIALS);

export const getPricingTiers = () => fromDb<PricingTier>("pricing_tiers", async (db) =>
  (await db.pricingTiers.find({ published: true }).sort({ sortOrder: 1 }).toArray()).map((r) => ({
    dbId: r.id, id: r.slug, name: r.name, badge: r.badge, priceINR: r.priceInr,
    priceUSD: r.priceUsd, advanceINR: r.advanceInr, advanceUSD: r.advanceUsd,
    description: r.description, features: r.features, delivery: r.delivery, featured: r.featured,
  })), bundled.PRICING_TIERS);

export const getFaqs = () => fromDb<{ q: string; a: string }>("faqs", async (db) =>
  (await db.faqs.find({ published: true }).sort({ sortOrder: 1 }).toArray()).map((r) => ({
    q: r.question, a: r.answer,
  })), bundled.FAQ);
