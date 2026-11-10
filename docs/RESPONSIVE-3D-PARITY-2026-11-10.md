# Responsive 3D and animation compatibility

## Scope and cause

The local application uses Next.js, React Three Fiber and Three.js. Its models are procedural meshes and canvas-generated textures; there are no GLTF/GLB model assets or ScrollControls/useScroll rigs to repair.

The missing mobile scenes were intentional capability exclusions, not missing model files: the hero required a 900px viewport and service scenes required 768px, with additional device-memory, CPU and Save-Data exclusions. Several orbit controllers rejected coarse pointers. Catalogue page dragging and image-studio light dragging explicitly rejected touch. Hero, service-stack, project-rail and flipbook timelines also had desktop/tablet-only media queries, and the flipbook used flat pages on phones.

## Implementation

- Probe actual WebGL2 support on every screen size without waiting for input. Prepare the hero's first frame even when its narrow-screen panel starts below the fold, avoiding a preloader/visibility wait cycle; subsequent animation still pauses offscreen. Slow rendering releases the preloader without replacing a supported renderer. Genuine renderer failures retain explicit unavailable states.
- Use the original hero artwork on every supported device, including the worker renderer and main-thread fallback. Below 1024px or in portrait orientation, put its canvas in a dedicated responsive panel after the copy. Portrait iPads at the desktop width breakpoint also need this fit: a successful WebGL draw alone did not prevent their original wide-layout composition from cropping. Forward this layout mode on worker resize. Fit the complete target, center it, and compensate its depth travel so the scroll-driven fly-through still passes the camera at the same timeline progress. Landscape desktop artwork transforms, camera path, lighting and timeline values remain unchanged.
- Keep square service canvases as the desktop reference. Expand vertical FOV mathematically when a canvas becomes narrower than square; retain each original FOV otherwise. On short narrow-screen landscape viewports, cap canvas height to available space below the navigation. R3F's existing resize observer updates camera aspect, with the shared projection effect updating FOV.
- Enable the same GSAP hero wipe/camera timeline, stacking transforms, horizontal project rail/parallax, CSS 3D flipbook, scroll skew, footer word motion and full particle count on mobile. Adapt pin starting positions for tall sections and allow tall service cards to scroll fully before sticking. Keep existing system reduced-motion preferences.
- Preserve mouse controls and add touch input. One-finger vertical gestures retain native page scrolling; horizontal page drags and taps operate the existing models. Orbit scenes use two-finger rotation, with native gesture cancellation confined to explicit multi-touch inside a service canvas. Catalogue page drags and image-light drags yield to multi-touch. CSS flipbook horizontal swipes call the original page-turn animation, while pinch zoom remains available there. Magnetic, tilt, glare and cursor feedback also respond to touch.
- Retain the existing visible DPR cap of 1.5, worker rendering, serial shader preparation, reduced offscreen pixel count, hidden-tab suspension and retained offscreen renderers. No geometry, textures, particle effects, shadows, materials or lights were removed or reduced for mobile. Add context-loss recovery/loading indicators and listener cleanup. No dependencies were added.

## Components inspected

| Area | Components |
| --- | --- |
| Hero | Hero3D, HeroRenderer, Hero.worker, HeroScene, HeroArtwork, HeroFirstFrame, heroWorkerProtocol |
| Service models | WebStackScene, AppDevScene, SoftwareDevScene, SaasProductScene, CatalogueScene, ImageGenScene, SeoScene, ServiceObject |
| Shared renderer lifecycle | ServiceVisual, useGraphics, Boundary, ScenePreparation, SceneCompilation, SceneWarmup, modelVisibility, preparation scheduling |
| Supporting motion/layout | HomeHero, ServicesStack, ProjectsRail, Timeline, FlipBook, CatalogueExperience, CatalogueTeaser, BackgroundField, Cursor, Footer, interactive UI wrappers, motion wrappers, scroll engine and responsive CSS |

## Changed files

- `package.json`: include responsive regression tests.
- `src/app/globals.css`: scoped narrow-screen scene, hero, pin-stage and book sizing.
- `src/components/catalogue/FlipBook.tsx`: preserve the 3D book and page-turn rig on all screens; touch swipes, responsive height and a narrow control row that clears the fixed Connect button.
- `src/components/sections/HomeHero.tsx`, `ProjectsRail.tsx`, `ServicesStack.tsx`, `Timeline.tsx`: remove animation breakpoint exclusions and fit responsive stages.
- `src/components/shell/BackgroundField.tsx`, `Cursor.tsx`, `Footer.tsx`: preserve particle count, touch feedback and footer motion.
- `src/components/three/AppDevScene.jsx`, `CatalogueScene.jsx`, `ImageGenScene.jsx`, `SaasProductScene.jsx`, `SeoScene.jsx`, `SoftwareDevScene.jsx`, `WebStackScene.jsx`, `ServiceObject.tsx`: shared responsive projection and preserved touch interaction.
- `src/components/three/Boundary.tsx`, `ServiceVisual.tsx`, `useGraphics.ts`: actual-support capability detection, loading/error state and stable scene shells.
- `src/components/three/Hero.worker.tsx`, `Hero3D.tsx`, `HeroArtwork.tsx`, `HeroRenderer.tsx`, `HeroScene.tsx`, `heroWorkerProtocol.ts`: responsive artwork, touch input, offscreen first-frame preparation, slow-renderer handling and context recovery.
- New `src/components/three/ResponsiveOrbitControls.tsx`, `SceneViewport.tsx`, `src/lib/responsiveScene.ts`: shared projection and input handling.
- `src/components/ui/interactive.tsx`, `motion.tsx`: retain interactive effects on touch.
- `src/lib/heroReadiness.ts`: distinguish a slow first frame from a genuine failure.
- `tests/graphics-readiness.test.mjs`, `hero-worker.test.mjs`, new `responsive-scenes.test.mjs`: capability, camera, timeline, context recovery and input regression coverage.
- `docs/PERFORMANCE.md`, this report: current verification and historical measurement notice.

The separate whitespace-only edit currently present in `next.config.ts` was preserved.

## Verification

Automated tests cover all requested widths: 320, 360, 390, 430, 600, 768, 1024, 1280, 1440 and 1920px. Projection tests cover every scene FOV, narrow and rotated aspect ratios; capability tests include low hardware estimates; hero tests preserve desktop composition, fly-through depth and timeline configuration. Input tests check horizontal intent, vertical scrolling, multi-touch cancellation and cleanup. Context recovery and worker input/resize forwarding are also covered.

Final checks:

- `npm run build`: passed, including the production TypeScript check.
- `npm run lint`: passed.
- `npm test`: all 96 tests passed.
- `git diff --check`: passed.
- Production HTTP audit: all 17 public sitemap routes returned 200 with both mobile and desktop user agents; all 45 internal links and seven service anchors passed. Existing retired-route behavior also passed.

Lighthouse CLI captured 55 distinct viewport/section cases, including repeat captures after visual fixes. All final cases produced screenshots and the expected draw/readiness markers for WebGL scenes. The CSS flipbooks were checked in screenshots. No final audit had a Lighthouse runtime failure or a JavaScript/WebGL console error. Eight homepage captures also recorded **pre-existing HTTP 400 errors for missing portfolio JPEGs**, detailed below; these captures are not console-error-free passes.

| Viewport | Render captures |
| --- | --- |
| 320 × 568 | Hero; all seven service scenes on `/services`; all seven homepage stack instances; pinned and inline flipbooks |
| 360 × 740, 390 × 844, 430 × 932, 600 × 960 | Hero at each width |
| 768 × 1024 | Hero; all seven service scenes; pinned and inline flipbooks |
| 844 × 390 | All seven service scenes; hero; pinned flipbook |
| 1024 × 1366 | Corrected portrait-tablet hero |
| 1024 × 768 | Landscape hero and image studio |
| 1280 × 800 | Hero |
| 1440 × 900 | Hero; all seven service scenes; pinned and inline flipbooks |
| 1920 × 1080 | Hero |

Reviewed phone/tablet service screenshots, short-landscape scenes, both flipbook placements, the corrected portrait-tablet hero and desktop scene captures. The homepage stack intentionally covers earlier cards as the next card enters, matching the desktop animation. Landscape desktop source inspection retains the original camera positions/FOVs, model/material/light definitions, animation timing/easing and full particle count. This is a source and screenshot regression check, not an automated pixel-difference certification.

Local evidence is retained in `.performance/responsive-parity-2026-11-10-v2/` and `.performance/responsive-home-2026-11-10/`; `.performance/responsive-final-results.json` merges the final cases, preserving console diagnostics. These ignored artifacts include several incremental production build IDs: unchanged scene captures were retained, and affected hero/book cases were rerun after their fixes. Early protocol-timeout/paint failures were retried rather than counted as successful renders. Visual review found and corrected the portrait crop even though its original readiness check passed.

Representative final captures: [portrait-tablet hero](../.performance/responsive-home-2026-11-10/1024x1366-hero-portrait.jpg), [desktop hero](../.performance/responsive-home-2026-11-10/1440x900-hero-desktop.jpg), [320px book controls](../.performance/responsive-parity-2026-11-10-v2/320x568-flipbook.jpg), [320px inline 3D book](../.performance/responsive-home-2026-11-10/320x568-inline-flipbook.jpg).

The missing files are `/images/work-erp.jpg`, `/images/work-saas.jpg`, `/images/work-web.jpg`, `/images/work-catalogue.jpg`, `/images/work-app.jpg` and `/images/work-render.jpg`. Their absence predates this task and is documented in the historical performance report. Original project imagery must be restored to eliminate these image-optimizer errors; no substitute imagery or unrelated content changes were introduced.

## Verification limits

The in-app browser skill could not connect: browser discovery returned no available browser. Standard Lighthouse CLI viewport emulation supplies local production screenshots, real WebGL draw/readiness markers and browser console diagnostics. These captures do not exercise a physical touchscreen, live drag gestures, a continuous orientation change, every point in a GSAP timeline or every GPU/browser combination. Responsive formulas, resize forwarding and input cleanup have automated coverage; real iOS/Android interaction and frame-rate QA remain necessary. Exact pixel identity at every animated instant and universal 100 Lighthouse scores are not certified. The original desktop camera/timeline values are retained; responsive scene positioning necessarily differs on narrow screens.

Devices without WebGL2 use the existing branded fallback with a status message; worker-incompatible devices still attempt the full main-thread WebGL scene. Operating-system reduced-motion settings remain respected. This work changes local source only and has not deployed the website.
