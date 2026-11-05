# Shared scrolling and section motion

The shared scrolling system now coordinates every route's existing section animations without changing section order, grids, theme or animation types. The service-model prefetch and warm-up behavior remains in place.

## Behavior

- Lenis and scroll-trigger updates run from one GSAP clock. Velocity-based marquees, particles and skew are normalized across display refresh rates. Native touch momentum is retained.
- Section links, dot navigation and native fallback scrolling use the same responsive clearance for the fixed header and services navigation. The destination is resolved once; Lenis receives a numeric position so its built-in CSS margin handling cannot apply the offset twice. Numeric flipbook pin destinations retain their exact positions.
- Route navigation stops scrolling while the curtain covers the page, prefetches the destination, waits for readiness-dependent pins, refreshes measurements, and aligns a destination hash before lifting the curtain. Fixed 100/150/600 ms route-positioning timers were removed. Query-only updates retain Next's normal handling.
- Same-page navigation releases the mobile menu before scrolling. Encoded section IDs, missing targets, direct hash links and returning to the top are handled safely.
- Section reveals wait for page readiness. Their viewport thresholds follow resize events, and queued notifications cannot start animations after unmounting. Timeline directions adapt at the mobile/desktop breakpoint.
- Font, image and layout changes trigger coordinated pin measurements. Expanding content is debounced and waits for scrolling to settle, and Lenis dimensions synchronize after refresh. Section indicators refresh with the same layout.
- Catalogue selection measures the newly mounted book before navigating, with no fixed wait.
- Reduced-motion preferences use immediate anchor positioning and can switch the scrolling mode without a page reload.

## Validation

- Production build and TypeScript: passed.
- ESLint: passed.
- All 48 regression tests: passed, including 11 scroll/entrance cases covering readiness, cancellation, resizing, decoded anchors, native/Lenis consistency, exact pin positions and reduced motion.
- Source whitespace checks: passed.
- Inspected a Lighthouse snapshot of `/services#software-development` after correcting duplicate CSS clearance. It lands below the navigation with no console errors.
- The in-app Browser connection was unavailable. Live wheel/touch scrolling, browser back/forward and interactive cross-route transitions were not end-to-end tested.

## Performance checks

Landing-page checks during this change used Lighthouse 13.6.0, the production build, default mobile simulation and the desktop preset:

| Landing page | Mobile | Desktop |
| --- | ---: | ---: |
| / | 95 | 96 |
| /services | 95 | 97 |
| /catalogues | 95 | 99 |

Reports are in `.performance/scroll-motion/` (ignored local artifacts). The first catalogue desktop audit lost its preview connection and was rerun as `catalogues-desktop-retry.json`; the interrupted run is retained separately. Catalogue image HTTP 400 errors still come from the pre-existing missing `public/images/` assets described in [PERFORMANCE.md](PERFORMANCE.md).

The separate cold `/services#software-development` navigation immediately initializes WebGL and scored **62** for performance, with no console errors. Landing-page scores do not guarantee 90+ for cold 3D deep links or a particular animation frame rate. WebGL cold-start cost remains a limitation; this change addresses scroll synchronization and section alignment.

## Slower pacing adjustment

The shared pacing is configured in `src/lib/motionSettings.ts`. Wheel interpolation changed from 0.10 to 0.075, with an 0.85 wheel multiplier. Scroll-triggered reveals use a 120 ms lead-in and 1.4 s duration; heading reveals use 1.5 s with a gentler word stagger. Initial page-load copy retains its shorter entrance timing.

Pinned hero, service stacking, gallery, parallax, timeline and flipbook motion now ease toward scroll progress over 450 ms. The hero camera and gallery indicators read the eased animation progress, and pinned book page turns use an actual scrubbed tween. Pin distances and section geometry are unchanged. Anchor navigation uses 0.75?1.8 s acceleration/deceleration, and route curtains use longer cover/reveal timings. Marquee scroll-speed boosts are capped at 140 px/s and reverse direction gradually over about 180 ms.

Build, ESLint and all 48 regression tests passed, including exact anchor positions, the slower bounded travel duration and the easing midpoint. No Lighthouse rerun was performed for this pacing-only adjustment. The in-app Browser remained unavailable, so subjective wheel/touch feel and frame-rate jitter have not been interactively verified. Existing reduced-motion behavior and service-model preloading remain in place.
