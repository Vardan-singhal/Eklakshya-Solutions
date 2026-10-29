/**
 * MongoDB collection types and indexes. Public content shapes stay unchanged.
 * Project results and catalogue plates are embedded in their parent documents.
 */
import type { Db, IndexDescription } from "mongodb";
import type { ServiceItem, ProjectItem, CatalogueItem, BlogPost, PricingTier, Testimonial } from "../data/siteData";

type ContentMeta = { id: number; published: boolean; sortOrder: number; createdAt: Date; updatedAt: Date };
export type ServiceDocument = Omit<ServiceItem, "id" | "from"> & ContentMeta & { slug: string; fromPrice: string };
export type ProjectDocument = ProjectItem & ContentMeta & { featured: boolean };
export type CatalogueDocument = Omit<CatalogueItem, "id"> & ContentMeta & { slug: string };
export type PostDocument = Omit<BlogPost, "date" | "sections"> & ContentMeta & { body: BlogPost["sections"]; publishedAt: Date };
export type TestimonialDocument = Testimonial & ContentMeta;
export type PricingDocument = Omit<PricingTier, "id" | "dbId" | "priceINR" | "priceUSD" | "advanceINR" | "advanceUSD"> & ContentMeta & {
  slug: string; priceInr: number; priceUsd: number; advanceInr: number; advanceUsd: number;
};
export type FaqDocument = ContentMeta & { question: string; answer: string };
export type InquiryStatus = "new" | "contacted" | "won" | "archived";
export type BookingStatus = "created" | "awaiting_payment" | "paid" | "failed" | "refunded";

export interface Inquiry {
  id: number; name: string; email: string; phone: string | null; service: string;
  budget: string; message: string; status: InquiryStatus; createdAt: Date;
}
export interface Booking {
  id: number; tierId: number | null; tierName: string; mode: "advance" | "full";
  amount: number; currency: "INR" | "USD"; clientName: string; clientEmail: string;
  clientPhone: string | null; status: BookingStatus; orderId?: string; paymentId?: string;
  createdAt: Date; updatedAt: Date;
}
export interface ConsultationSlot {
  id: number; name: string; email: string; preferredDate: string; preferredTime: string;
  topic: string; notes: string | null; createdAt: Date;
}
type Counter = { _id: string; seq: number };

export function collections(db: Db) {
  return {
    raw: db,
    services: db.collection<ServiceDocument>("services"),
    projects: db.collection<ProjectDocument>("projects"),
    catalogues: db.collection<CatalogueDocument>("catalogues"),
    posts: db.collection<PostDocument>("posts"),
    testimonials: db.collection<TestimonialDocument>("testimonials"),
    pricingTiers: db.collection<PricingDocument>("pricing_tiers"),
    faqs: db.collection<FaqDocument>("faqs"),
    inquiries: db.collection<Inquiry>("inquiries"),
    bookings: db.collection<Booking>("bookings"),
    consultationSlots: db.collection<ConsultationSlot>("consultation_slots"),
    counters: db.collection<Counter>("counters"),
  };
}
export type Database = ReturnType<typeof collections>;

export async function ensureIndexes(db: Database) {
  const content = [db.services, db.projects, db.catalogues, db.posts, db.testimonials, db.pricingTiers, db.faqs];
  await Promise.all([
    ...content.map((collection) => collection.createIndexes([
      { key: { id: 1 }, unique: true, name: "id_unique" },
      { key: { published: 1, sortOrder: 1 }, name: "published_listing" },
    ])),
    ...[db.services, db.projects, db.catalogues, db.posts, db.pricingTiers].map((collection) =>
      collection.createIndex({ slug: 1 }, { unique: true, name: "slug_unique" })),
    db.posts.createIndex({ published: 1, publishedAt: -1 }, { name: "posts_listing" }),
    db.projects.createIndex({ category: 1 }),
    db.inquiries.createIndexes([
      { key: { id: 1 }, unique: true, name: "id_unique" },
      { key: { status: 1, createdAt: -1 }, name: "inquiries_status" },
    ]),
    db.bookings.createIndexes([
      { key: { id: 1 }, unique: true, name: "id_unique" },
      // Missing order IDs are allowed for manual bookings; real gateway IDs are unique.
      { key: { orderId: 1 }, unique: true, partialFilterExpression: { orderId: { $type: "string" } }, name: "bookings_order_unique" },
      { key: { status: 1, createdAt: -1 }, name: "bookings_status" },
      { key: { tierId: 1 }, name: "bookings_tier" },
    ] satisfies IndexDescription[]),
    db.consultationSlots.createIndexes([
      { key: { id: 1 }, unique: true, name: "id_unique" },
      { key: { preferredDate: 1, preferredTime: 1 }, unique: true, name: "consultation_slot_unique" },
    ]),
  ]);
}

/** Atomic counters preserve the existing numeric IDs and EK-00001 booking references. */
export async function nextId(db: Database, collection: string) {
  const counter = await db.counters.findOneAndUpdate(
    { _id: collection }, { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after", includeResultMetadata: false },
  );
  if (!counter) throw new Error("Could not allocate a database ID");
  return counter.seq;
}
