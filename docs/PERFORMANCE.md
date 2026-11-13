# UI, animation and performance verification

> Current-build notice: see [MOBILE-PERFORMANCE-2026-11-13.md](MOBILE-PERFORMANCE-2026-11-13.md) for the latest mobile changes, measured scores and remaining limitations. The mobile 100 target has not been achieved. Responsive rendering is documented in [RESPONSIVE-3D-PARITY-2026-11-10.md](RESPONSIVE-3D-PARITY-2026-11-10.md), and earlier desktop work in [DESKTOP-PERFORMANCE-2026-11-10.md](DESKTOP-PERFORMANCE-2026-11-10.md). All scores and mobile fallback descriptions below are historical and do not describe the current build.

Measured on 3 November 2026 against a local Next.js production build using Lighthouse 13.6.0 and installed Chrome in headless mode. Mobile uses Lighthouse's default mobile profile; desktop uses its desktop preset. Default simulated throttling was retained.

## Results

Homepage baseline performance: **47 mobile / 42 desktop**. Final performance scores:

| Public landing page | Mobile | Desktop |
| --- | ---: | ---: |
| / | 96 | 96 |
| /services | 97 | 100 |
| /about | 97 | 100 |
| /portfolio | 94 | 99 |
| /catalogues | 98 | 99 |
| /blog | 98 | 100 |
| /contact | 96 | 99 |

All eight public landing pages exceeded 90 in performance, accessibility, best practices and SEO on both profiles. SEO scored 100 in these runs; individual accessibility and best-practices results are retained in the raw reports.

Raw JSON and HTML reports are in `.performance/final-v2/` (ignored local artifacts). These are initial-navigation laboratory measurements, and vary with CPU load, network and hosting. Detail pages, administrative screens, authenticated flows and the deployed hosting environment were not audited.

## Changes

- Preserved the page structure, grids, section order, dark/light themes, brand fonts and animation types. Increased narrow-screen gutters from 16 to 20 px and card/panel padding from 20 to 24 px. Improved light-theme gold/blue contrast, button gradients and scroll-fill text readability.
- Self-hosted the existing Clash Display, Satoshi and JetBrains Mono fonts with Next's font loader. Removed the external font CSS dependency and consolidated monospace weights into one compressed variable font.
- Retained the supplied logo artwork, serving compressed WebP copies. Logo, wordmark and embedded favicon payloads fell from about 3.9 MB to about 81 KB combined. Original PNG files remain available.
- Kept the preloader counter, branding entrance, seam and split shutter; shortened their timing and bounded the font wait. Hero copy remains visible during its fade/rise entrance.
- Initialize one-shot text reveals, counters and skill bars at viewport entry, with observer and GSAP context cleanup. Preserved pinned, scrubbed and reversible scroll animations.
- Cache marquee width via ResizeObserver rather than measuring every frame; pause it offscreen and in hidden tabs. Draw background particles at 30 fps with elapsed-time compensation, preserving their speed and scroll response. Stop writing cursor transforms when the pointer has settled.
- Keep the existing animated target/rings visible on initial navigation. Enhance to full WebGL scenes on the first pointer, keyboard, wheel or scroll interaction on capable devices. Existing low-end/reduced-motion fallbacks remain. `?force3d` still bypasses the capability gate for manual checking. Initial Lighthouse scores do not measure the cost of subsequent WebGL activation or guarantee animation frame rate.
- Split Framer Motion features using LazyMotion and its lightweight element entry points; retain the complete layout, spring and interaction feature set.
- Mount the route-transition curtain when navigation starts. Prepare the desktop flipbook only at its visible breakpoint; retain mobile swipe pages and initialize the 3D animation if the viewport becomes wide enough.
- Refresh scroll pin measurements after route/font changes, cancel pending refreshes on cleanup, and add fixed-navigation clearance to native anchors.

## Verification and limits

- `npm run build`: passed (including TypeScript).
- `npm run lint`: passed.
- `npm test`: all 40 tests passed, including entrance timing/cleanup, theme persistence and server configuration.
- `git diff --check`: passed.
- Reviewed Lighthouse screenshots. The in-app Browser connection was unavailable, so interactive navigation, resizing and full-page scroll QA were not browser-tested.
- Preserved existing user edits in the services page, service stack and site data. The environment file was not modified or printed.

## Existing missing assets

The checkout has no `public/images/` directory, although the app references `studio.jpg` and `work-{erp,saas,catalogue,app,render,web}.jpg`. Their image-optimizer requests fail with HTTP 400 on affected pages, accounting for the 96 best-practices scores. Restore the original assets under those paths. References, image slots and their animations were preserved; no replacement project imagery was invented.

## Reproduce

Start a production build:

```sh
npm run build
npm run start
```

In another terminal, run each route with both profiles:

```sh
npm exec --yes --package=lighthouse@13.6.0 -- lighthouse http://localhost:3000 --chrome-flags="--headless --no-sandbox" --output=html --output-path=mobile.html
npm exec --yes --package=lighthouse@13.6.0 -- lighthouse http://localhost:3000 --preset=desktop --chrome-flags="--headless --no-sandbox" --output=html --output-path=desktop.html
```

Recheck the deployed URL after deployment, since hosting and database response times are outside this local audit.

## Service model loading follow-up

Service scenes now prefetch JavaScript 3200 px before viewport entry and mount/warm their canvas 1600 px ahead. They stay mounted within this wider range for reverse scrolling. Within 500 px they render continuously; farther away they use demand rendering and pause automatic interval updates. Interaction activation is retained across route changes, so late-mounted cards do not wait for a second interaction. The layouts, themes and visible animations are unchanged.

Rechecked home and services against the updated production build:

| Page | Mobile | Desktop |
| --- | ---: | ---: |
| / | 97 | 96 |
| /services | 96 | 97 |

Reports: `.performance/model-warmup/`. Build, lint and all 40 regression tests passed. Interactive scroll timing could not be measured because the in-app Browser connection was unavailable. Initial-navigation Lighthouse scores do not measure model warm-up during scrolling.

## Shared scrolling follow-up

See [SCROLL-MOTION.md](SCROLL-MOTION.md) for synchronized scroll timing, responsive anchor offsets, route-curtain alignment, updated tests and the latest landing-page/deep-link verification limits.
