# Mobile performance verification — 13 November 2026

## Status

The requested mobile performance score of **100 has not been achieved**. The retained source scored **43, 71 and 69** in three repeated production audits (median **69**). Accessibility, best practices and SEO scored **100 in all three**. An earlier retained implementation reached 86; that single best result must not be presented as a reliable current score.

The supplied screenshot measured a development server. The production baseline and production results below are the appropriate comparison. They are initial-navigation laboratory measurements, not measurements of sustained animation frame rate or deployed hosting performance.

## Retained implementation

- Run the initial counter, branding entrance, seam, split shutter, heading and fade/rise entrances with native CSS from first paint. Preserve their visual sequence and transforms. The shutter now releases after 770 ms without waiting for JavaScript hydration or the first GPU frame; an existing animated target fills the brief WebGL preparation interval. Subsequent route entrances retain their GSAP/Framer Motion implementation.
- Keep automatic full WebGL rendering. Model geometry, materials, cameras, device pixel ratio and scene animation code are unchanged. No user interaction requirement, mobile model replacement, frame cap or reduced-resolution renderer was introduced.
- Keep the homepage services HTML server rendered while preparing its client code near the section. Direct hashes, navigation and interaction release the pending hydration. Prepare card parallax and service stack rigs before viewport entry; keep project pin spacing initialized for correct anchor positions.
- Skip the desktop-only section navigation's hidden scroll trackers on mobile, and restore them when resized to desktop.
- Batch service-card layout reads before writes, avoid unchanged CSS variable writes, share scroll refreshes, and read scroll position from a passive event rather than forcing layout on every animation tick.
- Reuse number/time formatters, prepare the footer clock near the footer, and avoid speculative route prefetches. Route navigation still prefetches during the existing transition.
- Avoid rewriting stationary catalogue leaves, identical book offsets and unchanged labels. Page rotation, depth, shadows, easing and reversible scroll progress retain their existing calculations.

Layouts, content, brand fonts, supplied PDF artwork, section order, colours and themes remain. Font-subsetting and alternative-bundler experiments were discarded. Dependency specifications and the lockfile are unchanged; the package script only adds the new regression tests. No `.env` change or deployment was made.

## Measurements

Lighthouse 13.6.0, installed Chrome in headless mode, default simulated mobile throttling and all four standard categories. Next.js 16.2.6 production build with its default Turbopack bundler. A temporary Node 22 runtime starts the audit server because the local Node 24 server intermittently terminated with a native Windows heap error. The cause was not established; the globally installed Node version was not changed.

| Production run | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| Untouched source baseline | 61 | 100 | 100 | 100 | 1.1 s | 5.5 s | 670 ms | 0 |
| Retained changes before catalogue write cache | 86 | 100 | 100 | 100 | 1.4 s | 1.4 s | 500 ms | 0 |
| Final build, first run | 43 | 100 | 100 | 100 | 1.1 s | 6.2 s | 1,640 ms | 0 |
| Final build, second run | 71 | 100 | 100 | 100 | 1.0 s | 5.0 s | 420 ms | 0 |
| Final build, third run | 69 | 100 | 100 | 100 | 1.0 s | 5.0 s | 450 ms | 0 |

Measured build ID: `eAsrQLeP4CubjZQja_9q4`. All three runs have no console errors, but significant script evaluation and long main-thread tasks remain. These results do not establish a consistent performance improvement or satisfy the 100 target. A subsequent permanent hero pin-wrapper experiment scored 49 and was reverted; it is absent from the retained source. The source was rebuilt after that revert, so its generated build ID differs from the measured build despite identical retained application code.

Raw local reports and trace assets are retained in the ignored `.performance/mobile-2026-11-11/` directory:

- [Production baseline](../.performance/mobile-2026-11-11/controlled-baseline.report.html)
- [Earlier 86-point run](../.performance/mobile-2026-11-11/retained-mobile.report.html)
- [Final-build first run](../.performance/mobile-2026-11-11/final-mobile.report.html)
- [Final-build second run](../.performance/mobile-2026-11-11/final-mobile-repeat-2.report.html)
- [Final-build third run](../.performance/mobile-2026-11-11/final-mobile-repeat-3.report.html)

## Validation

- `npm run build`: passed, including TypeScript and production route generation.
- `npm test`: all 104 tests passed, including hydration release/cleanup, desktop tracker resizing, loader completion, formatter reuse, and stationary/reversible catalogue leaves.
- `npm run lint` and `git diff --check`: passed.
- All eight browser scenarios passed with no uncaught page errors: 390 px and 320 px phones, tablet, desktop, desktop/mobile resizing, light theme, reduced motion, delayed JavaScript and unavailable WebGL. Phone checks wait for all seven real service models, verify catalogue turns in both directions, footer reveal and contact navigation. The navigation check allows scripted scrolling to settle before dispatching the click; immediate clicks during rapid automated jumps were intermittent and are not counted as passes.
- Public HTTP audit verifies 17 sitemap pages with desktop/mobile user agents, 45 internal links/anchors, seven services and the existing retired-checkout response. No live form submissions or payments were performed.

Browser results and screenshots are saved next to the reports as `qa-results.json` and `qa-*.png`. Existing missing `/images/work-*.jpg` files can produce HTTP 400 responses while scrolling portfolio cards; their artwork was not fabricated or replaced. Initial audit console results and full-page scrolling checks therefore have different scopes.

## Reproduction

```powershell
npm run build
npm exec --yes --package=node@22 -- node node_modules/next/dist/bin/next start --port 3100
```

In another terminal, run Lighthouse with its default mobile throttling:

```powershell
npx --yes lighthouse@13.6.0 http://localhost:3100 --chrome-flags="--headless --no-sandbox" --only-categories=performance,accessibility,best-practices,seo --output=html --output=json --output-path=.performance/mobile-check
```

Run audits individually with other builds and browser checks stopped. A deployment should also be measured on its actual hosting environment before claiming a production score.
