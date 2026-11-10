# Performance work — 10 November 2026

The requested 100/100/100/100 target remains unmet. Complete-load desktop audits of the final production build measured **76–84 Performance, 100 Accessibility, 100 Best Practices and 100 SEO**. Mobile measured **75/100/100/100**.

## Measurements

Lighthouse 13.6.0, installed Chrome 158, local Next.js production server, default simulated throttling. Desktop used the desktop preset. Final runs included `--pause-after-fcp-ms=12000` so screenshots and traces covered the completed loader and the real hero.

| Run | Performance | Accessibility | Best Practices | SEO | Blocking time | Speed Index | LCP |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Initial desktop | 52 | 100 | 100 | 100 | 6,470 ms | 9.6 s | 1.9 s |
| Initial desktop repeat | 56 | 100 | 100 | 100 | 4,810 ms | 5.5 s | 1.5 s |
| Final desktop | 84 | 100 | 100 | 100 | 170 ms | 3.4 s | 1.2 s |
| Final desktop repeat | 76 | 100 | 100 | 100 | 310 ms | 2.8 s | 1.4 s |
| Final mobile | 75 | 100 | 100 | 100 | 980 ms | 4.7 s | 1.4 s |

Initial desktop runs used Lighthouse's default wait settings; final runs deliberately waited longer for the worker and full presentation. These are local observations with different wait windows, not a controlled hosting benchmark or a guaranteed score increase on every machine. Both final desktop traces include `hero:worker-ready` and the completed loader; neither selected the worker fallback. Final desktop CLS was approximately 0.004.

Raw reports, traces and screenshots remain in the ignored `.performance/` directory:

- `current-desktop.report.{json,html}` and `baseline-repeat.json`
- `final-worker-desktop.report.{json,html}`
- `final-worker-desktop-repeat.report.{json,html}`
- `final-worker-mobile.report.{json,html}`

An intermediate default-wait worker audit stopped with the loader still visible. Its score was discarded. A shader-batching experiment did not improve performance and was removed.

## Implementation

- Moved the original hero artwork into a shared component. Supported browsers render it in an OffscreenCanvas worker so shader compilation and frame rendering do not block page interactions. Unsupported or failed workers use the original main-thread Canvas renderer.
- Preserved the same geometry, materials, lighting, camera, antialiasing, pixel-ratio cap, pointer parallax, scroll progress and frame animation math. An exact source comparison against the pre-change artwork passed after accounting for the canvas and pointer adapters.
- Retained the loader's progress, timing, shutter sequence, first-frame wait and animation release behavior. The worker pauses after preparation until the shutter finishes, then resumes; hidden/offscreen rendering pauses as before.
- Start service-scene downloads and preparation within 2,400 px of the viewport, then retain their renderers until the route unmounts. Scene quality and visible animations remain unchanged. Extremely fast scrolling can still outrun cold model preparation.
- Initialize magnetic-button and tilt tweens on the first pointer movement. Their original strengths, durations, easing and glare remain.
- Preload the existing monospace font used immediately by the loader/navigation. No font files, stylesheets, branding, layout classes or palette values changed.
- Corrected accessible names for project cards and the Connect trigger without changing visible text.
- Added no dependencies. Existing pricing-removal work was preserved.

## Verification

- Production build, TypeScript check and ESLint passed.
- All **89 tests passed**, including worker handoff, pointer/scroll input, dimensions, pixel density, theme/visibility controls, failure fallback, cancellation and scene retention.
- HTTP audit passed all **17 public pages**, all seven service sections and **45 internal resource/page links and anchor targets**. Pricing redirect and retired checkout checks still pass.
- Reviewed desktop and mobile Lighthouse screenshots; the desktop screenshots show the original 3D hero, and mobile retains its existing animated SVG fallback.
- Live browser interaction and full-scroll visual verification could not run because the in-app browser reported no available browsers. Unit tests and screenshots do not establish pixel-perfect animation synchronization, frame-rate guarantees or immediate readiness during fast scrolling. The older-browser renderer fallback was unit-tested, not tested on a physical older browser.

## Remaining work and limits

Cold GPU setup still delays the first complete hero frame. Because the existing loader waits for that frame, the complete visual presentation remains delayed even after rendering moves off the main thread. Initial React/GSAP layout setup also produces some blocking tasks. Mobile remains below 100. These limitations have not been hidden by shortening/removing animations, disabling the hero, reducing visual quality or detecting Lighthouse.

## Reproduce

Start a production server on a free port:

```powershell
npm run build
npm run start -- --port 3103
```

In another terminal:

```powershell
npm exec --package=lighthouse@13.6.0 -- lighthouse http://localhost:3103 --preset=desktop --pause-after-fcp-ms=12000 --chrome-flags="--headless --no-sandbox" --output=json --output=html --output-path=.performance/desktop
```

For mobile, omit `--preset=desktop`. A shorter run can finish before the worker/loader sequence, so verify the final screenshot and readiness marks before interpreting a score.

## Files changed for this task

- `package.json`
- `src/app/layout.tsx`
- `src/components/sections/ProjectsRail.tsx`
- `src/components/shell/SocialDrawer.tsx`
- `src/components/three/Hero3D.tsx`
- `src/components/three/HeroScene.tsx`
- `src/components/three/HeroArtwork.tsx` (new shared artwork)
- `src/components/three/HeroRenderer.tsx` (new worker bridge and fallback)
- `src/components/three/Hero.worker.tsx` (new renderer worker)
- `src/components/three/heroWorkerProtocol.ts` (new shared controls)
- `src/components/three/ServiceVisual.tsx`
- `src/components/three/useGraphics.ts`
- `src/components/ui/interactive.tsx`
- `tests/graphics-readiness.test.mjs`
- `tests/hero-worker.test.mjs` (new)
- `docs/PERFORMANCE.md`
- `docs/DESKTOP-PERFORMANCE-2026-11-10.md` (this report)

Implementation references: [OffscreenCanvas transfer](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/transferControlToOffscreen), [R3F Canvas/root configuration](https://r3f.docs.pmnd.rs/api/canvas), and [R3F performance guidance](https://r3f.docs.pmnd.rs/advanced/scaling-performance).
