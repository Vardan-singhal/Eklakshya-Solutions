# Supplied catalogue artwork

The catalogue showcase uses the two supplied PDFs in place of the three demonstration catalogues:

| Catalogue | Original PDF pages | Flipbook faces |
| --- | ---: | ---: |
| Sanway Product Catalogue 2026 | 38 | 40 |
| House of Sutram Premium Kitchenware & Gifting | 24 | 26 |

All original pages remain in their original order. Each book adds an unprinted inner back cover and the existing Eklakshya Solutions closing page. The closing design, logo, typography and background are unchanged; its client line reads "Made for Sanway" or "Made for House of Sutram".

Original PDFs and pre-rendered WebP pages are in `public/catalogues/`. `src/data/catalogue-pages.json` records the ordered images, dimensions, original page counts and PDF SHA-256 hashes. Pages retain their full aspect ratio without cropping. The dedicated showcase prepares its opening spread eagerly.

The homepage uses the separate `HOME_CATALOGUE` illustration in `src/data/homeCatalogue.ts`, restored from commit `df077d5`. Its original eight-page design, inline animation and layout are independent of these uploaded PDFs. The original demo photo paths are retained; those photo files are not present in this checkout.

The existing GSAP page-turn engine, pinning, easing, shadows, forward/reverse controls, gallery transition and mobile swipe layout are unchanged. Previously seeded demo catalogue IDs are excluded from reads, while additional real database catalogues remain supported. No database records were deleted or modified.

Verification: production build, ESLint, and 82 tests passed. Chrome checks covered both covers and opening spreads, forward/reverse turns, gallery switching, branded closing pages, original PDF responses, and native mobile touch swipes. No page errors, failed catalogue-image requests or horizontal overflow were found. QA screenshots and browser results are retained locally under `.performance/catalogue-tools/`.
