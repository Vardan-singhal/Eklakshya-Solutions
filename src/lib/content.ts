/**
 * Content layer — the ONLY place pages read editorial content from.
 *
 *   page (server component) → getX() → Postgres (src/db/schema.ts)
 *                                   ↘ falls back to the bundled copy in src/data/siteData.ts
 *                                     when the DB is unreachable or a table is still empty
 *
 * The fallback keeps the site fully working before the DB is seeded, in local dev,
 * and during a database outage. Pages never import siteData collections directly.
 */
import { asc, desc, eq } from "drizzle-orm";
import * as s from "@/db/schema";
import * as bundled from "@/data/siteData";
import type { BlogPost, CatalogueItem, PricingTier, ProjectItem, ServiceItem, Testimonial } from "@/data/siteData";

type Db = (typeof import("@/db"))["db"];

async function fromDb<T>(label: string, run: (db: Db) => Promise<T[]>, fallback: T[]): Promise<T[]> {
  if (!process.env.DATABASE_URL) {
    return fallback;
  }
  try {
    const { db } = await import("@/db"); // lazy: a missing DATABASE_URL must not crash module load
    const rows = await run(db);
    return rows.length ? rows : fallback;
  } catch (err) {
    console.warn(`[content] ${label}: using bundled data (${err instanceof Error ? err.message : String(err)})`);
    return fallback;
  }
}

export const getServices = () =>
  fromDb<ServiceItem>(
    "services",
    async (db) => {
      const rows = await db.select().from(s.services).where(eq(s.services.published, true)).orderBy(asc(s.services.sortOrder));
      return rows.map((r) => ({
        id: r.slug,
        kind: r.kind,
        title: r.title,
        category: r.category,
        tagline: r.tagline,
        description: r.description,
        deliverables: r.deliverables,
        features: r.features,
        idealFor: r.idealFor,
        delivery: r.delivery,
        from: r.fromPrice,
      }));
    },
    bundled.SERVICES
  );

export const getProjects = () =>
  fromDb<ProjectItem>(
    "projects",
    async (db) => {
      const rows = await db.query.projects.findMany({
        where: eq(s.projects.published, true),
        orderBy: [asc(s.projects.sortOrder)],
        with: { results: { orderBy: [asc(s.projectResults.sortOrder)] } },
      });
      return rows.map((r) => ({
        slug: r.slug,
        title: r.title,
        client: r.client,
        category: r.category,
        year: r.year,
        role: r.role,
        summary: r.summary,
        problem: r.problem,
        solution: r.solution,
        stack: r.stack,
        cover: r.cover,
        coverAlt: r.coverAlt,
        results: r.results.map((m) => ({
          value: m.value,
          prefix: m.prefix ?? undefined,
          suffix: m.suffix ?? undefined,
          decimals: m.decimals || undefined,
          label: m.label,
        })),
      }));
    },
    bundled.PROJECTS
  );

export const getCatalogues = () =>
  fromDb<CatalogueItem>(
    "catalogues",
    async (db) => {
      const rows = await db.query.catalogues.findMany({
        where: eq(s.catalogues.published, true),
        orderBy: [asc(s.catalogues.sortOrder)],
        with: { plates: { orderBy: [asc(s.cataloguePlates.sortOrder)] } },
      });
      return rows.map((r) => ({
        id: r.slug,
        title: r.title,
        client: r.client,
        industry: r.industry,
        year: r.year,
        blurb: r.blurb,
        plates: r.plates.map((p) => ({ title: p.title, sub: p.sub, image: p.image, imageAlt: p.imageAlt, sku: p.sku, specs: p.specs })),
      }));
    },
    bundled.CATALOGUES
  );

export const getPosts = () =>
  fromDb<BlogPost>(
    "posts",
    async (db) => {
      const rows = await db.select().from(s.posts).where(eq(s.posts.published, true)).orderBy(desc(s.posts.publishedAt));
      return rows.map((r) => ({
        slug: r.slug,
        title: r.title,
        excerpt: r.excerpt,
        date: r.publishedAt.toISOString().slice(0, 10),
        readTime: r.readTime,
        category: r.category,
        tags: r.tags,
        cover: r.cover,
        coverAlt: r.coverAlt,
        sections: r.body,
      }));
    },
    bundled.BLOG_POSTS
  );

export const getTestimonials = () =>
  fromDb<Testimonial>(
    "testimonials",
    async (db) => {
      const rows = await db.select().from(s.testimonials).where(eq(s.testimonials.published, true)).orderBy(asc(s.testimonials.sortOrder));
      return rows.map((r) => ({ quote: r.quote, author: r.author, role: r.role, company: r.company }));
    },
    bundled.TESTIMONIALS
  );

export const getPricingTiers = () =>
  fromDb<PricingTier>(
    "pricing_tiers",
    async (db) => {
      const rows = await db.select().from(s.pricingTiers).where(eq(s.pricingTiers.published, true)).orderBy(asc(s.pricingTiers.sortOrder));
      return rows.map((r) => ({
        dbId: r.id,
        id: r.slug,
        name: r.name,
        badge: r.badge ?? undefined,
        priceINR: r.priceInr,
        priceUSD: r.priceUsd,
        advanceINR: r.advanceInr,
        advanceUSD: r.advanceUsd,
        description: r.description,
        features: r.features,
        delivery: r.delivery,
        featured: r.featured,
      }));
    },
    bundled.PRICING_TIERS
  );

export const getFaqs = () =>
  fromDb<{ q: string; a: string }>(
    "faqs",
    async (db) => {
      const rows = await db.select().from(s.faqs).where(eq(s.faqs.published, true)).orderBy(asc(s.faqs.sortOrder));
      return rows.map((r) => ({ q: r.question, a: r.answer }));
    },
    bundled.FAQ
  );
