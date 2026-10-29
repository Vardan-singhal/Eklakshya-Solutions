/**
 * Eklakshya Solutions — database schema (PostgreSQL via Drizzle ORM).
 *
 * Two groups of tables:
 *
 *  CONTENT   services · projects (+results) · catalogues (+plates) · posts ·
 *            testimonials · pricing_tiers · faqs
 *            Editorial content. Order is explicit (`sort_order`), never implied by
 *            created_at. Rows are read through `src/lib/content.ts`.
 *
 *  OPERATIONS  inquiries · bookings · consultation_slots
 *            Data created by visitors. Never exposed through public APIs.
 *
 * Conventions: snake_case columns, timestamptz everywhere, enums for closed sets,
 * text[] for short lists, FK + index on every relation, DB-level uniqueness where a
 * business rule needs it (a call slot can only be booked once).
 */
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ───────────── helpers ───────────── */
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date());
const strings = (name: string) =>
  text(name)
    .array()
    .notNull()
    .default(sql`'{}'::text[]`);

/* ───────────── enums ───────────── */
export const serviceKind = pgEnum("service_kind", ["web", "app", "software", "saas", "catalogue", "image", "seo"]);
export const projectCategory = pgEnum("project_category", ["Web", "App", "SaaS", "Catalogues", "Images"]);
export const inquiryStatus = pgEnum("inquiry_status", ["new", "contacted", "won", "archived"]);
export const bookingStatus = pgEnum("booking_status", ["created", "awaiting_payment", "paid", "failed", "refunded"]);
export const bookingMode = pgEnum("booking_mode", ["advance", "full"]);
export const currencyCode = pgEnum("currency_code", ["INR", "USD"]);

/* ═════════════════════════ CONTENT ═════════════════════════ */

export const services = pgTable(
  "services",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    kind: serviceKind("kind").notNull(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    tagline: text("tagline").notNull(),
    description: text("description").notNull(),
    deliverables: strings("deliverables"),
    features: strings("features"),
    idealFor: text("ideal_for").notNull(),
    delivery: text("delivery").notNull(),
    fromPrice: text("from_price").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    published: boolean("published").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("services_slug_uq").on(t.slug), index("services_listing_idx").on(t.published, t.sortOrder)]
);

export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    client: text("client").notNull(),
    category: projectCategory("category").notNull(),
    year: text("year").notNull(),
    role: text("role").notNull(),
    summary: text("summary").notNull(),
    problem: text("problem").notNull(),
    solution: text("solution").notNull(),
    stack: strings("stack"),
    cover: text("cover").notNull(),
    coverAlt: text("cover_alt").notNull(),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    published: boolean("published").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("projects_slug_uq").on(t.slug),
    index("projects_listing_idx").on(t.published, t.sortOrder),
    index("projects_category_idx").on(t.category),
  ]
);

/** Headline metrics for a case study ("84% faster quotes"). */
export const projectResults = pgTable(
  "project_results",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    value: doublePrecision("value").notNull(),
    prefix: text("prefix"),
    suffix: text("suffix"),
    decimals: integer("decimals").notNull().default(0),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("project_results_project_idx").on(t.projectId, t.sortOrder)]
);

export const catalogues = pgTable(
  "catalogues",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    client: text("client").notNull(),
    industry: text("industry").notNull(),
    year: text("year").notNull(),
    blurb: text("blurb").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    published: boolean("published").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("catalogues_slug_uq").on(t.slug), index("catalogues_listing_idx").on(t.published, t.sortOrder)]
);

export const cataloguePlates = pgTable(
  "catalogue_plates",
  {
    id: serial("id").primaryKey(),
    catalogueId: integer("catalogue_id")
      .notNull()
      .references(() => catalogues.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    sub: text("sub").notNull(),
    image: text("image").notNull(),
    imageAlt: text("image_alt").notNull(),
    sku: integer("sku").notNull().default(0),
    specs: strings("specs"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("catalogue_plates_catalogue_idx").on(t.catalogueId, t.sortOrder)]
);

export type PostSection = { heading?: string; paragraphs: string[] };

export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    category: text("category").notNull(),
    tags: strings("tags"),
    readTime: text("read_time").notNull(),
    cover: text("cover").notNull(),
    coverAlt: text("cover_alt").notNull(),
    body: jsonb("body").$type<PostSection[]>().notNull(),
    published: boolean("published").notNull().default(true),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("posts_slug_uq").on(t.slug), index("posts_listing_idx").on(t.published, t.publishedAt)]
);

export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  quote: text("quote").notNull(),
  author: text("author").notNull(),
  role: text("role").notNull(),
  company: text("company").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
});

/** Prices live here so the payment API can compute amounts server-side. Whole currency units. */
export const pricingTiers = pgTable(
  "pricing_tiers",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    badge: text("badge"),
    priceInr: integer("price_inr").notNull(),
    priceUsd: integer("price_usd").notNull(),
    advanceInr: integer("advance_inr").notNull(),
    advanceUsd: integer("advance_usd").notNull(),
    description: text("description").notNull(),
    features: strings("features"),
    delivery: text("delivery").notNull(),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    published: boolean("published").notNull().default(true),
  },
  (t) => [uniqueIndex("pricing_tiers_slug_uq").on(t.slug)]
);

export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
});

/* ═════════════════════════ OPERATIONS ═════════════════════════ */

/** Contact-form enquiries. */
export const inquiries = pgTable(
  "inquiries",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    service: text("service").notNull(),
    budget: text("budget").notNull(),
    message: text("message").notNull(),
    status: inquiryStatus("status").notNull().default("new"),
    createdAt: createdAt(),
  },
  (t) => [index("inquiries_status_idx").on(t.status, t.createdAt)]
);

/**
 * Package bookings. State machine:
 *   created → awaiting_payment (no gateway keys) | paid (signature / webhook verified) | failed
 * A booking is only ever marked `paid` by the server after verifying Razorpay.
 * `tier_name` is a snapshot so history survives if a tier is renamed or removed.
 */
export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    tierId: integer("tier_id").references(() => pricingTiers.id, { onDelete: "set null" }),
    tierName: text("tier_name").notNull(),
    mode: bookingMode("mode").notNull().default("advance"),
    amount: integer("amount").notNull(),
    currency: currencyCode("currency").notNull().default("INR"),
    clientName: text("client_name").notNull(),
    clientEmail: text("client_email").notNull(),
    clientPhone: text("client_phone"),
    status: bookingStatus("status").notNull().default("created"),
    orderId: text("order_id"),
    paymentId: text("payment_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("bookings_order_uq").on(t.orderId),
    index("bookings_status_idx").on(t.status, t.createdAt),
    index("bookings_tier_idx").on(t.tierId),
  ]
);

/** Discovery-call requests. The unique index makes double-booking impossible at the DB level. */
export const consultationSlots = pgTable(
  "consultation_slots",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    preferredDate: date("preferred_date", { mode: "string" }).notNull(),
    preferredTime: text("preferred_time").notNull(),
    topic: text("topic").notNull(),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("consultation_slot_uq").on(t.preferredDate, t.preferredTime)]
);

/* ───────────── relations (enable db.query.* with `with:`) ───────────── */
export const projectsRelations = relations(projects, ({ many }) => ({ results: many(projectResults) }));
export const projectResultsRelations = relations(projectResults, ({ one }) => ({
  project: one(projects, { fields: [projectResults.projectId], references: [projects.id] }),
}));
export const cataloguesRelations = relations(catalogues, ({ many }) => ({ plates: many(cataloguePlates) }));
export const cataloguePlatesRelations = relations(cataloguePlates, ({ one }) => ({
  catalogue: one(catalogues, { fields: [cataloguePlates.catalogueId], references: [catalogues.id] }),
}));
export const pricingTiersRelations = relations(pricingTiers, ({ many }) => ({ bookings: many(bookings) }));
export const bookingsRelations = relations(bookings, ({ one }) => ({
  tier: one(pricingTiers, { fields: [bookings.tierId], references: [pricingTiers.id] }),
}));

/* ───────────── inferred types ───────────── */
export type Inquiry = typeof inquiries.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type ConsultationSlot = typeof consultationSlots.$inferSelect;
