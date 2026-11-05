import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register once on the client. Importing from here guarantees the plugin exists.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export { gsap, ScrollTrigger };

let refreshFrame = 0;
const afterRefresh = new Set<() => void>();

/** Share one pin measurement pass across fonts, routes and changing content. */
export function requestScrollRefresh(after?: () => void) {
  if (after) afterRefresh.add(after);
  if (!refreshFrame) {
    refreshFrame = window.requestAnimationFrame(() => {
      refreshFrame = 0;
      ScrollTrigger.refresh();
      const callbacks = Array.from(afterRefresh);
      afterRefresh.clear();
      callbacks.forEach((callback) => callback());
    });
  }
  return () => { if (after) afterRefresh.delete(after); };
}
