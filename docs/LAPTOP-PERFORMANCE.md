# Laptop rendering optimization — 5 November 2026

The changes preserve section layout, model geometry, materials, texture resolution, visible animation effects, animation durations, and scroll easing. They change how invisible work and initialization are scheduled.

## Rendering changes

- Preserve parallel service-code downloads and the existing prioritized GPU-preparation queue. Keep prepared components mounted for reverse scrolling.
- Detect opaque sticky cards fully covering earlier service models. Pause covered scenes as well as offscreen scenes and scenes in hidden browser tabs. Restore the original continuous render loop before viewport entry.
- Stop prepared invisible WebGL loops completely. OrbitControls invalidates frames on camera changes, so `frameloop="demand"` alone does not reliably pause an animated scene. Warm-up is bounded; visible scenes retain their original frame rate and quality.
- Generate the same image-scene textures in separate tasks and yield between catalogue pages, allowing input processing between painting tasks. Dispose generated textures and cancel unfinished work on route/theme changes.
- Batch magnetic-button and tilt-card pointer updates once per display frame. Preserve easing and strength. Skip redundant stationary/offscreen skew writes, and reuse existing vectors for SaaS animation paths.

## Verification

Production builds and ESLint pass. The automated suite now has 77 passing tests, including hero readiness, shader-preparation cancellation, covered-card visibility, tab visibility, preparation priority, and warm-up cleanup.

Chrome checks covered all eight public landing pages at 1440px in dark theme and 390px in light theme. All rendered without page exceptions or horizontal overflow. Screenshots cover all seven service models; reverse scrolling resumed the first model, and switching to another browser tab left zero models active.

An instrumented WebGL run confirmed that fully covered models issue no draw clears. At the sampled fourth/fifth-card position, only the exposed SaaS and catalogue scenes drew, at roughly 57 frames per second each. This stationary observation does not establish a full-scroll frame-rate guarantee.

Retained the original 700px prewarming distance so models can restore rendering quality before they appear. A narrower 100px distance did not consistently improve scrolling and was not retained. Final theme-continuity verification confirmed that the image scene keeps the same canvas while replacing its artwork.

Full-scroll results were mixed: the services route showed fewer long-task stalls in several runs, while the homepage still showed substantial startup and scrolling stalls. The changes demonstrate reduced unnecessary WebGL work, not a verified zero-lag result or a uniform overall performance improvement. Cold shader preparation remains expensive with the full original models and visual quality.

Local Chrome measurements and screenshots are retained under `.performance/`. These are single-run production-preview measurements on this machine, not a guarantee for every laptop. Rendering initialization still requires CPU/GPU shader compilation; no visual quality reduction was introduced to hide that cost.

The repository already lacks the `/images/` project/studio assets referenced by several pages. Their failed image requests are separate from the rendering changes; no project imagery was replaced.

## Hero and loader handoff

The homepage hero now downloads on capable devices without requiring pointer, wheel, or keyboard input. The initial loader holds its final progress phase until the hero has drawn a nonempty frame and reached the following browser frame. Its existing 100% completion tween, 20ms pause, shutter animation, and text entrances retain their timings. The hero clock pauses after preparation and resumes when the shutter finishes, so the animation does not run ahead behind the loading screen.

Service GPU preparation starts after the loader releases the page, giving the hero priority. Unsupported or reduced-motion devices keep the existing SVG fallback. A six-second readiness deadline, measured from loader setup, selects that fallback if the renderer cannot finish; a late download cannot unexpectedly replace it after the loader closes. Non-hero routes retain the existing short loading sequence.

Chrome checks passed for cold desktop loading without input, an artificially delayed hero chunk, a timed-out chunk, mobile, reduced motion, disabled WebGL, and the services route. In the cold desktop run, the hero's first-frame mark was 4686ms after navigation, shutter exit began at 4808ms, and loading completed at 5160ms. In the delayed-chunk run those marks were 3359ms, 3478ms, and 3830ms. These are local observations, not fixed loading durations.

An instrumented animation check found zero hero draws during the prepared-but-concealed interval, continuous rendering after reveal, and the same hero canvas after forward and reverse scrolling. Raw results and screenshots are in `.performance/hero-loading-results.json`, `.performance/hero-motion-results.json`, and `.performance/hero-loading-desktop.png`.
