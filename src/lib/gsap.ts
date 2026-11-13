import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register once on the client. Importing from here guarantees the plugin exists.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  // SmoothScroll already measures after assets and the page entrance settle.
  // Avoid repeating the full pin teardown at DOMContentLoaded and window.load.
  ScrollTrigger.config({ ignoreMobileResize: true, autoRefreshEvents: "visibilitychange,resize" });
}

export { gsap, ScrollTrigger };

let refreshFrame = 0;
let refreshTimer = 0;
const afterRefresh = new Set<() => void>();

/** Share one pin measurement pass across fonts, routes and changing content. */
export function requestScrollRefresh(after?: () => void) {
  if (after) afterRefresh.add(after);
  // Font readiness, ResizeObserver and the entrance can settle in adjacent
  // frames. Wait for that burst to settle before tearing down every pin.
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    if (refreshFrame) return;
    refreshFrame = window.requestAnimationFrame(() => {
      refreshFrame = 0;
      ScrollTrigger.refresh();
      const callbacks = Array.from(afterRefresh);
      afterRefresh.clear();
      callbacks.forEach((callback) => callback());
    });
  }, 160);
  return () => { if (after) afterRefresh.delete(after); };
}
