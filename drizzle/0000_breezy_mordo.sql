CREATE TYPE "public"."booking_mode" AS ENUM('advance', 'full');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('created', 'awaiting_payment', 'paid', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."currency_code" AS ENUM('INR', 'USD');--> statement-breakpoint
CREATE TYPE "public"."inquiry_status" AS ENUM('new', 'contacted', 'won', 'archived');--> statement-breakpoint
CREATE TYPE "public"."project_category" AS ENUM('Web', 'App', 'SaaS', 'Catalogues', 'Images');--> statement-breakpoint
CREATE TYPE "public"."service_kind" AS ENUM('web', 'app', 'software', 'saas', 'catalogue', 'image', 'seo');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tier_id" integer,
	"tier_name" text NOT NULL,
	"mode" "booking_mode" DEFAULT 'advance' NOT NULL,
	"amount" integer NOT NULL,
	"currency" "currency_code" DEFAULT 'INR' NOT NULL,
	"client_name" text NOT NULL,
	"client_email" text NOT NULL,
	"client_phone" text,
	"status" "booking_status" DEFAULT 'created' NOT NULL,
	"order_id" text,
	"payment_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalogue_plates" (
	"id" serial PRIMARY KEY NOT NULL,
	"catalogue_id" integer NOT NULL,
	"title" text NOT NULL,
	"sub" text NOT NULL,
	"image" text NOT NULL,
	"image_alt" text NOT NULL,
	"sku" integer DEFAULT 0 NOT NULL,
	"specs" text[] DEFAULT '{}'::text[] NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalogues" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"client" text NOT NULL,
	"industry" text NOT NULL,
	"year" text NOT NULL,
	"blurb" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultation_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"preferred_date" date NOT NULL,
	"preferred_time" text NOT NULL,
	"topic" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"service" text NOT NULL,
	"budget" text NOT NULL,
	"message" text NOT NULL,
	"status" "inquiry_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"category" text NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"read_time" text NOT NULL,
	"cover" text NOT NULL,
	"cover_alt" text NOT NULL,
	"body" jsonb NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"badge" text,
	"price_inr" integer NOT NULL,
	"price_usd" integer NOT NULL,
	"advance_inr" integer NOT NULL,
	"advance_usd" integer NOT NULL,
	"description" text NOT NULL,
	"features" text[] DEFAULT '{}'::text[] NOT NULL,
	"delivery" text NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"value" double precision NOT NULL,
	"prefix" text,
	"suffix" text,
	"decimals" integer DEFAULT 0 NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"client" text NOT NULL,
	"category" "project_category" NOT NULL,
	"year" text NOT NULL,
	"role" text NOT NULL,
	"summary" text NOT NULL,
	"problem" text NOT NULL,
	"solution" text NOT NULL,
	"stack" text[] DEFAULT '{}'::text[] NOT NULL,
	"cover" text NOT NULL,
	"cover_alt" text NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"kind" "service_kind" NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"tagline" text NOT NULL,
	"description" text NOT NULL,
	"deliverables" text[] DEFAULT '{}'::text[] NOT NULL,
	"features" text[] DEFAULT '{}'::text[] NOT NULL,
	"ideal_for" text NOT NULL,
	"delivery" text NOT NULL,
	"from_price" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote" text NOT NULL,
	"author" text NOT NULL,
	"role" text NOT NULL,
	"company" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tier_id_pricing_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."pricing_tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue_plates" ADD CONSTRAINT "catalogue_plates_catalogue_id_catalogues_id_fk" FOREIGN KEY ("catalogue_id") REFERENCES "public"."catalogues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_results" ADD CONSTRAINT "project_results_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_order_uq" ON "bookings" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "bookings_tier_idx" ON "bookings" USING btree ("tier_id");--> statement-breakpoint
CREATE INDEX "catalogue_plates_catalogue_idx" ON "catalogue_plates" USING btree ("catalogue_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "catalogues_slug_uq" ON "catalogues" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "catalogues_listing_idx" ON "catalogues" USING btree ("published","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "consultation_slot_uq" ON "consultation_slots" USING btree ("preferred_date","preferred_time");--> statement-breakpoint
CREATE INDEX "inquiries_status_idx" ON "inquiries" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_slug_uq" ON "posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "posts_listing_idx" ON "posts" USING btree ("published","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pricing_tiers_slug_uq" ON "pricing_tiers" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "project_results_project_idx" ON "project_results" USING btree ("project_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_slug_uq" ON "projects" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "projects_listing_idx" ON "projects" USING btree ("published","sort_order");--> statement-breakpoint
CREATE INDEX "projects_category_idx" ON "projects" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "services_slug_uq" ON "services" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "services_listing_idx" ON "services" USING btree ("published","sort_order");