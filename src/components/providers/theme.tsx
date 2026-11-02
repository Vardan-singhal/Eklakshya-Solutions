"use client";

import { useCallback, useSyncExternalStore, type MouseEvent } from "react";
import { isReducedMotion } from "@/lib/engine";
import { syncTheme, type Theme, type ThemePreference } from "@/lib/theme";

export type { Theme, ThemePreference } from "@/lib/theme";

/** The root attributes drive CSS and the existing 3D theme subscribers. */
const listeners = new Set<() => void>();
let cleanup: (() => void) | undefined;
function subscribe(cb: () => void) {
  listeners.add(cb);
  if (listeners.size === 1) {
    const notify = () => listeners.forEach((listener) => listener());
    const observer = new MutationObserver(notify);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-theme-preference"],
    });
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => syncTheme();
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === window.localStorage &&
          (event.key === null || event.key === "eklakshya-theme" || event.key === "ek-theme")) sync();
    };
    mediaQuery.addEventListener("change", sync);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", sync);
    // Catch system/storage changes between the head script and hydration.
    sync();
    cleanup = () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", sync);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", sync);
    };
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) {
      cleanup?.();
      cleanup = undefined;
    }
  };
}
const getSnapshot = (): Theme => document.documentElement.dataset.theme === "light" ? "light" : "dark";
const getServerSnapshot = (): Theme => "dark";
const getPreference = (): ThemePreference => {
  const preference = document.documentElement.dataset.themePreference;
  return preference === "light" || preference === "dark" ? preference : "system";
};
const getServerPreference = (): ThemePreference => "system";
const setPreference = (preference: ThemePreference) => syncTheme(preference);

type ViewTransitionDoc = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void> };
};

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const preference = useSyncExternalStore(subscribe, getPreference, getServerPreference);
  const apply = useCallback((next: Theme) => setPreference(next), []);

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

  return { theme, preference, setPreference, toggle };
}
