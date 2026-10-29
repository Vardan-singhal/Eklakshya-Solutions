/**
 * Seed the CONTENT tables from the bundled copy in src/data/siteData.ts.
 *
 *   npx tsx src/db/seed.ts            # only fills tables that are empty (safe to re-run)
 *   npx tsx src/db/seed.ts --reset    # clears content tables first, then re-seeds
 *
 * Operational tables (inquiries, bookings, consultation_slots) are never touched.
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db, pool } from "./index";
import * as s from "./schema";
import { BLOG_POSTS, CATALOGUES, FAQ, PRICING_TIERS, PROJECTS, SERVICES, TESTIMONIALS } from "../data/siteData";

const RESET = process.argv.includes("--reset");

async function isEmpty(table: PgTable) {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(table);
  return row.n === 0;
}

async function main() {
  if (RESET) {
    // children first; bookings.tier_id is ON DELETE SET NULL so history survives
    for (const t of [s.projectResults, s.projects, s.cataloguePlates, s.catalogues, s.posts, s.testimonials, s.faqs, s.pricingTiers, s.services]) {
      await db.delete(t);
    }
    console.log("• content tables cleared");
  }

  if (await isEmpty(s.services)) {
    await db.insert(s.services).values(
      SERVICES.map((x, i) => ({
        slug: x.id,
        kind: x.kind,
        title: x.title,
        category: x.category,
        tagline: x.tagline,
        description: x.description,
        deliverables: x.deliverables,
        features: x.features,
        idealFor: x.idealFor,
        delivery: x.delivery,
        fromPrice: x.from,
        sortOrder: i,
      }))
    );
    console.log(`• services        ${SERVICES.length}`);
  }

  if (await isEmpty(s.projects)) {
    for (const [i, p] of PROJECTS.entries()) {
      const [row] = await db
        .insert(s.projects)
        .values({
          slug: p.slug,
          title: p.title,
          client: p.client,
          category: p.category,
          year: p.year,
          role: p.role,
          summary: p.summary,
          problem: p.problem,
          solution: p.solution,
          stack: p.stack,
          cover: p.cover,
          coverAlt: p.coverAlt,
          featured: i < 4,
          sortOrder: i,
        })
        .returning({ id: s.projects.id });
      await db.insert(s.projectResults).values(
        p.results.map((r, k) => ({
          projectId: row.id,
          value: r.value,
          prefix: r.prefix ?? null,
          suffix: r.suffix ?? null,
          decimals: r.decimals ?? 0,
          label: r.label,
          sortOrder: k,
        }))
      );
    }
    console.log(`• projects        ${PROJECTS.length}`);
  }

  if (await isEmpty(s.catalogues)) {
    for (const [i, c] of CATALOGUES.entries()) {
      const [row] = await db
        .insert(s.catalogues)
        .values({ slug: c.id, title: c.title, client: c.client, industry: c.industry, year: c.year, blurb: c.blurb, sortOrder: i })
        .returning({ id: s.catalogues.id });
      await db.insert(s.cataloguePlates).values(
        c.plates.map((p, k) => ({
          catalogueId: row.id,
          title: p.title,
          sub: p.sub,
          image: p.image,
          imageAlt: p.imageAlt,
          sku: p.sku,
          specs: p.specs,
          sortOrder: k,
        }))
      );
    }
    console.log(`• catalogues     ${CATALOGUES.length}`);
  }

  if (await isEmpty(s.posts)) {
    await db.insert(s.posts).values(
      BLOG_POSTS.map((p) => ({
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        category: p.category,
        tags: p.tags,
        readTime: p.readTime,
        cover: p.cover,
        coverAlt: p.coverAlt,
        body: p.sections,
        publishedAt: new Date(`${p.date}T09:00:00Z`),
      }))
    );
    console.log(`• posts           ${BLOG_POSTS.length}`);
  }

  if (await isEmpty(s.testimonials)) {
    await db.insert(s.testimonials).values(TESTIMONIALS.map((t, i) => ({ ...t, sortOrder: i })));
    console.log(`• testimonials    ${TESTIMONIALS.length}`);
  }

  if (await isEmpty(s.pricingTiers)) {
    await db.insert(s.pricingTiers).values(
      PRICING_TIERS.map((t, i) => ({
        slug: t.id,
        name: t.name,
        badge: t.badge ?? null,
        priceInr: t.priceINR,
        priceUsd: t.priceUSD,
        advanceInr: t.advanceINR,
        advanceUsd: t.advanceUSD,
        description: t.description,
        features: t.features,
        delivery: t.delivery,
        featured: !!t.featured,
        sortOrder: i,
      }))
    );
    console.log(`• pricing_tiers   ${PRICING_TIERS.length}`);
  }

  if (await isEmpty(s.faqs)) {
    await db.insert(s.faqs).values(FAQ.map((f, i) => ({ question: f.q, answer: f.a, sortOrder: i })));
    console.log(`• faqs            ${FAQ.length}`);
  }

  console.log("✓ seed complete");
}

main()
  .catch((err) => {
    console.error("✗ seed failed", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
