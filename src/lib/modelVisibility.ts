type Bounds = Pick<DOMRect, "top" | "bottom" | "left" | "right">;

/** Leave a corner clearance so rounded panels never hide an exposed model. */
export function coversModel(model: Bounds, panel: Bounds) {
  return panel.top + 32 <= model.top && panel.bottom - 32 >= model.bottom
    && panel.left + 32 <= model.left && panel.right - 32 >= model.right;
}

const readers = new Set<() => () => void>();
let frame = 0;
let settleUntil = 0;
function sample() {
  frame = 0;
  // Read every rectangle before React updates can write to the DOM.
  const updates = Array.from(readers, (read) => read());
  updates.forEach((update) => update());
  if (performance.now() < settleUntil && readers.size) frame = window.requestAnimationFrame(sample);
}
function refresh() {
  // Account for the existing 0.45s scroll scrub after wheel input stops.
  settleUntil = performance.now() + 600;
  if (!frame) frame = window.requestAnimationFrame(sample);
}

/** IntersectionObserver cannot detect opaque sticky cards covering each other. */
export function observeStackOcclusion(element: HTMLElement, interested: () => boolean, update: (covered: boolean) => void) {
  const card = element.closest("[data-stack-card]");
  const panels: Element[] = [];
  for (let next = card?.nextElementSibling; next; next = next.nextElementSibling) {
    const panel = next.querySelector("[data-stack-inner]");
    if (panel) panels.push(panel);
  }
  if (!panels.length) return () => {};
  const read = () => {
    if (!interested() || document.hidden) return () => {};
    const bounds = element.getBoundingClientRect();
    const covered = panels.some((panel) => coversModel(bounds, panel.getBoundingClientRect()));
    return () => update(covered);
  };
  if (!readers.size) {
    window.addEventListener("scroll", refresh, { passive: true });
    window.addEventListener("resize", refresh, { passive: true });
    document.addEventListener("visibilitychange", refresh);
  }
  readers.add(read);
  refresh();
  return () => {
    readers.delete(read);
    if (!readers.size) {
      window.cancelAnimationFrame(frame);
      frame = 0;
      window.removeEventListener("scroll", refresh);
      window.removeEventListener("resize", refresh);
      document.removeEventListener("visibilitychange", refresh);
    }
  };
}
