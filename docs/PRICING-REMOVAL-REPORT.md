# Service pricing removal

Completed in the existing project on 10 November 2026. No replacement pricing content was added.

## Removed

- Dedicated pricing page, package cards/comparisons, currency selector, checkout modal, payment CTAs and pricing FAQs.
- Pricing navigation entry shared by desktop navigation, mobile menu and footer; pricing page-transition label and internal links.
- Quote information cards from all seven services; their remaining delivery and audience details now use two columns.
- Contact budget choices, selection state and request payload; the enquiry API ignores legacy budget submissions.
- Bundled service quote fields, service package amounts and tier seeding.
- Monetary blog headline, pricing promises in service metadata, contact/blog CTAs, About copy and homepage process/catalogue story.
- Unused monetary literals in the SaaS illustration's demo data.

## Routes and SEO

- `/pricing` page deleted; Next.js permanently redirects its URL to `/contact` with HTTP 308.
- `/pricing` removed from the sitemap. Its metadata, canonical, product offers and FAQ structured data disappeared with the deleted page.
- `/services`, `/catalogues`, `/about`, `/contact`, `/blog/[slug]` and homepage shared content updated.
- Retired `/api/payments/create-order` returns HTTP 410 without amounts or database writes. Existing signed verification/webhook handlers remain operational for historical payments.

## Data handling

No database reset, destructive migration or customer-record deletion was performed. Historical inquiry budgets and booking/tier/FAQ records remain available privately. `Inquiry.budget` is optional, and new enquiries omit it. Existing seeded blog/testimonial/project copy is corrected when read; the retired service quote field is excluded from public data.

## Validation

- `npm run build`: passed; no pricing page in route output.
- `npm run typecheck`: passed after the build regenerated Next.js route types.
- `npm run lint`: passed.
- `npm test`: 85 passed, zero failed.
- `node tests/audit-public-routes.mjs` against production server on port 3100: all 17 sitemap pages returned HTTP 200 with both desktop and mobile user agents. All seven service anchors and 44 internal links/anchor targets passed. Pricing text, links, offer schema and contact budget controls were absent from the audited HTML.
- `/pricing`: HTTP 308 to `/contact`; retired checkout: HTTP 410 without amounts.
- Source search and diff whitespace checks completed.
- Live browser visual, responsive and interaction checks could not run: the browser plugin reported no available browsers. HTTP user-agent checks do not establish visual responsiveness or client-side interaction behavior. Shared navigation and responsive class changes were inspected in source.

Public pages checked: `/`, `/services`, `/portfolio`, `/catalogues`, `/about`, `/blog`, `/contact`; all six `/portfolio/[slug]` case studies; all four `/blog/[slug]` articles. The seven individual services are sections of `/services`, not separate page routes.

## Remaining references

No Eklakshya service pricing was found in the audited public HTML. Intentional references remain in the redirect, retirement regression tests, database compatibility types/private admin history, historical Drizzle files and this technical report. Unrelated product catalogue prices/specifications, product-demo data, customer quotation-tool capabilities and portfolio business-result metrics remain under the task's explicit product-information/legitimate-content exception. No service prices are introduced by those retained records.

## Files changed

Modified:

- `next.config.ts`
- `src/app/about/page.tsx`
- `src/app/api/inquiries/route.ts`
- `src/app/api/payments/create-order/route.ts`
- `src/app/blog/[slug]/page.tsx`
- `src/app/catalogues/page.tsx`
- `src/app/contact/page.tsx`
- `src/app/services/page.tsx`
- `src/app/sitemap.ts`
- `src/components/contact/ContactClient.tsx`
- `src/components/sections/CatalogueTeaser.tsx`
- `src/components/sections/ServicesStack.tsx`
- `src/components/shell/PageTransition.tsx`
- `src/components/three/SaasProductScene.jsx`
- `src/components/ui/forms.tsx`
- `src/data/homeCatalogue.ts`
- `src/data/siteData.ts`
- `src/db/schema.ts`
- `src/db/seed.ts`
- `src/lib/content.ts`
- `src/lib/site.ts`
- `tests/server-config.test.mjs`
- `docs/CATALOGUES.md`
- `docs/DATABASE.md`
- `docs/PERFORMANCE.md`

Deleted:

- `src/app/pricing/page.tsx`
- `src/components/pricing/PricingClient.tsx`
- `src/components/pricing/CheckoutModal.tsx`

Added:

- `tests/audit-public-routes.mjs` — repeatable production HTTP audit (`AUDIT_ORIGIN` may override the server origin).
- `docs/PRICING-REMOVAL-REPORT.md` — this report.
