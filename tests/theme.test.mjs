import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createContext, runInContext } from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";

const compile = (file) => ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const resolver = compile("../src/lib/theme.ts");
const provider = compile("../src/components/providers/theme.tsx");
const toggleComponent = compile("../src/components/shell/ThemeToggle.tsx");

function page({ dark = false, saved, legacy, blocked = false } = {}) {
  const values = new Map();
  if (saved !== undefined) values.set("eklakshya-theme", saved);
  if (legacy !== undefined) values.set("ek-theme", legacy);
  const storage = {
    getItem(key) { if (blocked) throw Error("blocked"); return values.get(key) ?? null; },
    setItem(key, value) { if (blocked) throw Error("blocked"); values.set(key, value); },
    removeItem(key) { if (blocked) throw Error("blocked"); values.delete(key); },
  };
  const mediaListeners = new Set();
  const events = new Map();
  const observers = new Set();
  const disposers = [];
  const media = {
    matches: dark,
    addEventListener(type, cb) { assert.equal(type, "change"); mediaListeners.add(cb); },
    removeEventListener(type, cb) { assert.equal(type, "change"); mediaListeners.delete(cb); },
  };
  const document = { documentElement: { dataset: {}, style: {} } };
  const window = {
    localStorage: storage,
    matchMedia(query) { assert.equal(query, "(prefers-color-scheme: dark)"); return media; },
    addEventListener(type, cb) { if (!events.has(type)) events.set(type, new Set()); events.get(type).add(cb); },
    removeEventListener(type, cb) { events.get(type)?.delete(cb); },
  };
  class MutationObserver {
    constructor(cb) { this.cb = cb; }
    observe() { observers.add(this); }
    disconnect() { observers.delete(this); }
  }
  const context = createContext({ document, window, localStorage: storage, MutationObserver });
  function load(code, require = () => {}) {
    const exports = {};
    context.moduleExports = exports;
    context.moduleRequire = require;
    runInContext("(function(exports, require) {" + code + "})(moduleExports, moduleRequire)", context);
    return exports;
  }
  const theme = load(resolver);
  // Execute the exact serialized script used by the root layout before mounting React.
  runInContext(theme.themeScript, context);
  const hook = load(provider, (id) => {
    if (id === "@/lib/theme") return theme;
    if (id === "@/lib/engine") return { isReducedMotion: () => true };
    if (id === "react") return {
      useCallback: (cb) => cb,
      useSyncExternalStore(subscribe, snapshot) { disposers.push(subscribe(() => {})); return snapshot(); },
    };
    throw Error("Unexpected import " + id);
  });
  const component = load(toggleComponent, (id) => {
    if (id === "react/jsx-runtime") return jsxRuntime;
    if (id === "@/components/providers/theme") return hook;
    if (id === "lucide-react") return { Sun: () => null, Moon: () => null };
    throw Error("Unexpected import " + id);
  });
  return {
    theme, values, document, mediaListeners, events, observers,
    toggleButton: () => component.ThemeToggle({}),
    mount: () => hook.useTheme(),
    resolved: () => document.documentElement.dataset.theme,
    preference: () => document.documentElement.dataset.themePreference,
    system(dark) { media.matches = dark; mediaListeners.forEach((cb) => cb({ matches: dark })); },
    storage(key = "eklakshya-theme") { events.get("storage")?.forEach((cb) => cb({ key, storageArea: storage })); },
    focus() { events.get("focus")?.forEach((cb) => cb()); },
    unmount() { disposers.splice(0).forEach((dispose) => dispose()); },
  };
}

for (const dark of [false, true]) {
  const system = dark ? "dark" : "light";
  const opposite = dark ? "light" : "dark";
  test("first visit follows system " + system + " before hydration", () => {
    const p = page({ dark });
    assert.equal(p.resolved(), system);
    assert.equal(p.preference(), "system");
    assert.equal(p.document.documentElement.style.colorScheme, system);
    assert.equal(p.values.size, 0);
  });
  test("toggle overrides system " + system + " and persists through reload", async () => {
    const p = page({ dark });
    await p.mount().toggle();
    assert.equal(p.resolved(), opposite);
    assert.equal(p.preference(), opposite);
    assert.equal(p.values.get("eklakshya-theme"), opposite);
    assert.equal(page({ dark, saved: p.values.get("eklakshya-theme") }).resolved(), opposite);
    p.system(!dark);
    p.system(dark);
    assert.equal(p.resolved(), opposite);
    p.unmount();
  });
  test("system changes update " + system + " without a manual preference", () => {
    const p = page({ dark });
    p.mount();
    p.system(!dark);
    assert.equal(p.resolved(), opposite);
    p.system(dark);
    assert.equal(p.resolved(), system);
    assert.equal(p.values.size, 0);
    p.unmount();
  });
  test("clearing " + opposite + " override returns immediately to system " + system, () => {
    const p = page({ dark, saved: opposite });
    p.mount().setPreference("system");
    assert.equal(p.resolved(), system);
    assert.equal(p.preference(), "system");
    assert.equal(p.values.size, 0);
    p.system(!dark);
    assert.equal(p.resolved(), opposite);
    p.unmount();
  });
}

test("storage events sync other tabs and clearing all storage restores system", () => {
  const p = page();
  p.mount();
  p.values.set("eklakshya-theme", "dark");
  p.storage();
  assert.equal(p.resolved(), "dark");
  p.values.clear();
  p.storage(null);
  assert.equal(p.resolved(), "light");
  assert.equal(p.preference(), "system");
  p.unmount();
});

test("same-tab external removal is picked up on focus or the next system change", () => {
  const p = page({ saved: "dark" });
  p.mount();
  p.values.clear();
  p.focus();
  assert.equal(p.resolved(), "light");
  assert.equal(p.preference(), "system");
  p.unmount();
});

test("legacy manual choices are migrated and can be cleared", () => {
  const p = page({ legacy: "light", dark: true });
  assert.equal(p.resolved(), "light");
  assert.equal(p.values.get("eklakshya-theme"), "light");
  assert.equal(p.values.has("ek-theme"), false);
  p.mount().setPreference("system");
  assert.equal(p.resolved(), "dark");
  p.unmount();
});

test("invalid stored values fall back to system", () => {
  assert.equal(page({ saved: "invalid", dark: true }).resolved(), "dark");
  assert.equal(page({ saved: "system", dark: false }).preference(), "system");
});

test("blocked storage follows system then retains manual choices for this page", async () => {
  const p = page({ blocked: true, dark: true });
  assert.equal(p.resolved(), "dark");
  const hook = p.mount();
  await hook.toggle();
  p.system(false);
  p.system(true);
  assert.equal(p.resolved(), "light");
  hook.setPreference("system");
  assert.equal(p.resolved(), "dark");
  p.unmount();
});

test("multiple theme consumers share listeners and clean them all up", () => {
  const p = page();
  p.mount();
  p.mount();
  assert.equal(p.mediaListeners.size, 1);
  assert.equal(p.observers.size, 1);
  p.unmount();
  assert.equal(p.mediaListeners.size, 0);
  assert.equal(p.observers.size, 0);
  assert.equal(p.events.get("storage").size, 0);
  assert.equal(p.events.get("focus").size, 0);
});

for (const dark of [false, true]) {
  test("Shift-click clears a manual override and follows system " + (dark ? "dark" : "light"), () => {
    const p = page({ dark, saved: dark ? "light" : "dark" });
    const button = p.toggleButton();
    button.props.onClick({ shiftKey: true });
    assert.equal(p.preference(), "system");
    assert.equal(p.resolved(), dark ? "dark" : "light");
    assert.equal(p.values.size, 0);
    assert.equal(page({ dark }).resolved(), p.resolved());
    p.system(!dark);
    assert.equal(p.resolved(), dark ? "light" : "dark");
    p.unmount();
  });
}

test("normal toggle button click still saves the opposite theme", () => {
  const p = page({ dark: true });
  p.toggleButton().props.onClick({ shiftKey: false });
  assert.equal(p.resolved(), "light");
  assert.equal(p.preference(), "light");
  assert.equal(p.values.get("eklakshya-theme"), "light");
  p.unmount();
});
