"use client";

import { useCallback, useSyncExternalStore, type MouseEvent } from "react";
import { isReducedMotion } from "@/lib/engine";

export type Theme = "dark" | "light";
const STORAGE_KEY = "ek-theme";

/**
 * The single source of truth for the theme is the `data-theme` attribute on <html>.
 * An inline script in <head> sets it before first paint (no flash), CSS variables
 * re-skin the UI, and anything else (the 3D scenes) subscribes to the attribute here.
 */
function subscribe(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const getSnapshot = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
const getServerSnapshot = (): Theme => "dark";

type ViewTransitionDoc = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void> };
};

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const apply = useCallback((next: Theme) => {
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage may be unavailable (private mode) */
    }
  }, []);

  const toggle = useCallback(
    async (e?: MouseEvent) => {
      const next: Theme = getSnapshot() === "dark" ? "light" : "dark";
      const doc = document as ViewTransitionDoc;

      if (!doc.startViewTransition || isReducedMotion()) {
        apply(next);
        return;
      }

      // Circular reveal from the toggle button using the View Transitions API
      const x = e?.clientX ?? window.innerWidth - 60;
      const y = e?.clientY ?? 40;
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      const transition = doc.startViewTransition(() => apply(next));
      try {
        await transition.ready;
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 700, easing: "cubic-bezier(0.7, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" }
        );
      } catch {
        /* transition skipped */
      }
    },
    [apply]
  );

  return { theme, toggle };
}
