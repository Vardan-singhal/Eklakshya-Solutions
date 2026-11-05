# Service-model readiness

> The 5 November rendering and scheduling changes are documented in [LAPTOP-PERFORMANCE.md](LAPTOP-PERFORMANCE.md). Measurements below describe the earlier implementation.

Updated 3 November 2026. This supersedes the earlier interaction-gated service loading and viewport mount/unmount behavior.

Service renderer chunks are requested when desktop graphics capability resolves, without waiting for scroll, pointer or keyboard input. Every service joins a background preparation queue. Approaching sections receive priority within 2400px. Preparation normally runs one scene at a time, allowing a second priority scene, to avoid initializing seven WebGL contexts simultaneously.

Prepared canvases remain mounted until route unmount. Shader compilation uses Three.js compileAsync before the first draw. A bounded warm-up handles initial camera/material settling and late geometry. Background autoplay pauses afterward. Hidden canvases use DPR 0.5; normal DPR [1, 1.5] and continuous animation resume within 700px of the viewport. Layout, theme, model geometry and visible animations are preserved. Existing mobile, low-memory, save-data and reduced-motion fallbacks remain.

## Verification

- 63 tests passed, including proactive service initialization, scene persistence, queue priority/cancellation, shader compilation and bounded warm-up.
- ESLint and Next.js production build passed.
- Lighthouse 13.6.0 against the local production preview found no browser console errors and recorded all seven service-model readiness marks without scroll input on both desktop pages.
- The in-app browser had no available browser target. Live wheel/touch behavior and visual section-entry timing were not interactively verified.

| Page/profile | Performance | Accessibility | Best practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| Home desktop | 56 | 100 | 100 | 100 |
| Services desktop | 61 | 100 | 100 | 100 |
| Home mobile | 60 | 100 | 100 | 100 |

Raw reports: `.performance/model-readiness-current/`. These are single cold-navigation laboratory runs on this machine, not deployed measurements. Earlier 90+ results used a different, interaction-gated service implementation and do not describe this build.

The section-entry loading trigger has been removed, but cold downloads, scene creation and GPU preparation still take time. Settled readiness marks ranged from 6.27 to 15.91 seconds on the homepage and 5.56 to 14.05 seconds on services. A mark follows the first draw by approximately 0.8 seconds of camera/material settling; it is not an exact first-pixel timestamp. An immediate jump can still outrun preparation. The requested Lighthouse performance target above 90 and guaranteed immediate cold-entry readiness remain unmet. Further work needs to reduce scene initialization/material/geometry cost and be validated with real interactive section entry; increasing prefetch distance alone cannot eliminate that work.
