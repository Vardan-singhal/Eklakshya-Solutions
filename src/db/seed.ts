/**
 * Seed bundled editorial content into MongoDB. Existing non-empty collections are
 * preserved unless --reset is explicitly supplied. Visitor records are retained.
 */
import "dotenv/config";
import type { Collection, Document, OptionalUnlessRequiredId } from "mongodb";
import { getDb, closeDb } from "./index";
import { nextId } from "./schema";
import { reportServerError } from "../lib/env.server";
import { BLOG_POSTS, CATALOGUES, PROJECTS, SERVICES, TESTIMONIALS } from "../data/siteData";

export async function seedContent(reset = false) {
  const db = await getDb();
  async function fill<T extends Document>(collection: Collection<T>, rows: Omit<T, "id" | "sortOrder" | "published" | "createdAt" | "updatedAt">[]) {
    if (reset) {
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

  await fill(db.services, SERVICES.map(({ id, ...service }) => ({ ...service, slug: id })));
  await fill(db.projects, PROJECTS.map((project, index) => ({ ...project, featured: index < 4 })));
  await fill(db.catalogues, CATALOGUES.map(({ id, ...catalogue }) => ({ ...catalogue, slug: id })));
  await fill(db.posts, BLOG_POSTS.map(({ date, sections, ...post }) => ({
    ...post, body: sections, publishedAt: new Date(`${date}T09:00:00Z`),
  })));
  await fill(db.testimonials, TESTIMONIALS);
  console.log("Seed completed successfully.");
}

seedContent(process.argv.includes("--reset"))
  .catch((error) => {
    reportServerError("seed failed", error);
    process.exitCode = 1;
  })
  .finally(closeDb);
