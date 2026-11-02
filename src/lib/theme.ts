export type Theme = "dark" | "light";
export type ThemePreference = Theme | "system";

/** Also serialized into <head>: keep this function self-contained and browser-only. */
export function syncTheme(preference?: ThemePreference) {
  const root = document.documentElement;
  const key = "eklakshya-theme";
  const legacyKey = "ek-theme";
  let next = preference ?? root.dataset.themePreference ?? "system";
  try {
    if (preference === undefined) {
      let stored = localStorage.getItem(key);
      // Preserve manual choices made by the original toggle.
      if (stored === null) {
        const legacy = localStorage.getItem(legacyKey);
        if (legacy === "light" || legacy === "dark") {
          stored = legacy;
          next = legacy;
          localStorage.setItem(key, legacy);
          localStorage.removeItem(legacyKey);
        }
      }
      next = stored === "light" || stored === "dark" ? stored : "system";
    } else if (preference === "system") {
      localStorage.removeItem(key);
      localStorage.removeItem(legacyKey);
    } else {
      localStorage.setItem(key, preference);
      localStorage.removeItem(legacyKey);
    }
  } catch {
    // Keep manual choices for this page even when storage is unavailable.
  }
  const theme = next === "light" || next === "dark"
    ? next
    : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  if (root.dataset.themePreference !== next) root.dataset.themePreference = next;
  if (root.dataset.theme !== theme) root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export const themeScript = `(${syncTheme.toString()})();`;
