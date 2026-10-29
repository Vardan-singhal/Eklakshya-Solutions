/**
 * Seed bundled editorial content into MongoDB. Existing non-empty collections are
 * preserved unless --reset is explicitly supplied. Visitor records are retained.
 */
import "dotenv/config";
import type { Collection, Document, OptionalUnlessRequiredId } from "mongodb";
import { getDb, closeDb } from "./index";
import { nextId } from "./schema";
import { reportServerError } from "../lib/env.server";
import { BLOG_POSTS, CATALOGUES, FAQ, PRICING_TIERS, PROJECTS, SERVICES, TESTIMONIALS } from "../data/siteData";

export async function seedContent(reset = false) {
  const db = await getDb();
  async function fill<T extends Document>(collection: Collection<T>, rows: Omit<T, "id" | "sortOrder" | "published" | "createdAt" | "updatedAt">[]) {
    if (reset) {
      if (collection.collectionName === "pricing_tiers") {
        // Match the former ON DELETE SET NULL behavior; booking snapshots/history remain.
        await db.bookings.updateMany({}, { $set: { tierId: null } });
      }
      await collection.deleteMany({});
    }
    if (await collection.countDocuments({}, { limit: 1 })) return;
    const now = new Date();
    const documents = await Promise.all(rows.map(async (row, sortOrder) => ({
      ...row, id: await nextId(db, collection.collectionName), sortOrder, published: true,
      createdAt: now, updatedAt: now,
    })));
    if (documents.length) await collection.insertMany(documents as unknown as OptionalUnlessRequiredId<T>[]);
    console.log(`Seeded ${collection.collectionName}: ${documents.length}`);
  }

  await fill(db.services, SERVICES.map(({ id, from, ...service }) => ({ ...service, slug: id, fromPrice: from })));
  await fill(db.projects, PROJECTS.map((project, index) => ({ ...project, featured: index < 4 })));
  await fill(db.catalogues, CATALOGUES.map(({ id, ...catalogue }) => ({ ...catalogue, slug: id })));
  await fill(db.posts, BLOG_POSTS.map(({ date, sections, ...post }) => ({
    ...post, body: sections, publishedAt: new Date(`${date}T09:00:00Z`),
  })));
  await fill(db.testimonials, TESTIMONIALS);
  await fill(db.pricingTiers, PRICING_TIERS.map((tier) => ({
    slug: tier.id, name: tier.name, ...(tier.badge ? { badge: tier.badge } : {}),
    priceInr: tier.priceINR, priceUsd: tier.priceUSD, advanceInr: tier.advanceINR,
    advanceUsd: tier.advanceUSD, description: tier.description, features: tier.features,
    delivery: tier.delivery, featured: !!tier.featured,
  })));
  await fill(db.faqs, FAQ.map((faq) => ({ question: faq.q, answer: faq.a })));
  console.log("Seed completed successfully.");
}

seedContent(process.argv.includes("--reset"))
  .catch((error) => {
    reportServerError("seed failed", error);
    process.exitCode = 1;
  })
  .finally(closeDb);
