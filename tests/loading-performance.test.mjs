import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

function load(path, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(source, { exports, ...globals });
  return exports;
}

function section({ present = true, hash = '' } = {}) {
  const events = new Map(), observers = [];
  const element = { contains: target => target === element };
  const listen = (type, fn) => events.set(type, fn);
  const remove = type => events.delete(type);
  let mutation;
  const api = load('../src/lib/sectionReadiness.ts', {
    window: { location: { hash }, addEventListener: listen, removeEventListener: remove },
    document: { documentElement: {}, getElementById: () => present ? element : null, addEventListener: listen, removeEventListener: remove },
    IntersectionObserver: class {
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe(node) { assert.equal(node, element); }
      disconnect() { this.disconnected = true; }
    },
    MutationObserver: class {
      constructor(callback) { mutation = this; this.callback = callback; }
      observe() {}
      disconnect() { this.disconnected = true; }
    },
  });
  return { api, element, events, observers, appear() { present = true; mutation.callback(); }, mutation: () => mutation };
}

test('server rendering and direct section links never wait for viewport hydration', async () => {
  await load('../src/lib/sectionReadiness.ts').whenSectionNear('services');
  const h = section({ hash: '#process' });
  await h.api.whenSectionNear('services');
  assert.equal(h.events.size, 0);
});

test('offscreen HTML waits for proximity, then removes every observer and listener', async () => {
  const h = section();
  let complete = false;
  const pending = h.api.whenSectionNear('services').then(() => { complete = true; });
  h.observers[0].callback([{ isIntersecting: false }]);
  await Promise.resolve();
  assert.equal(complete, false);
  h.observers[0].callback([{ isIntersecting: true }]);
  await pending;
  assert.equal(h.observers[0].disconnected, true);
  assert.equal(h.events.size, 0);
});

test('streamed sections are observed once their server HTML arrives', async () => {
  const h = section({ present: false });
  const pending = h.api.whenSectionNear('services');
  h.appear(); h.appear();
  assert.equal(h.observers.length, 1);
  assert.equal(h.mutation().disconnected, true);
  h.observers[0].callback([{ isIntersecting: true }]);
  await pending;
});

test('navigation, history, focus and touch release pending hydration without another scroll', async () => {
  for (const type of ['ek:nav-click', 'hashchange', 'popstate', 'focusin', 'pointerdown']) {
    const h = section();
    const pending = h.api.whenSectionNear('services');
    h.events.get(type)({ target: h.element });
    await pending;
    assert.equal(h.events.size, 0, type);
  }
});

test('counters reuse server formatting during hydration and one formatter while counting', () => {
  const effects = [];
  const element = { textContent: '' };
  let entrance, tween, state, formats = 0;
  const api = load('../src/components/ui/motion.tsx', {
    require: id => {
      if (id === 'react') return { useRef: () => ({ current: element }) };
      if (id === 'react/jsx-runtime') return jsx;
      if (id === '@/lib/engine') return {
        useIsoLayoutEffect: fn => effects.push(fn), isReducedMotion: () => false,
        observeEntrance: (_el, fn) => { entrance = fn; return () => {}; },
      };
      if (id === '@/lib/gsap') return { gsap: {
        context(fn) { fn({ add: (_name, callback) => callback }); return { revert() {} }; },
        to(target, vars) { state = target; tween = vars; },
      } };
      if (id === '@/lib/utils') return { cn: value => value };
      return { SCROLL_MOTION: {} };
    },
    Intl: { NumberFormat: class {
      constructor(...args) { formats++; this.real = new Intl.NumberFormat(...args); }
      format(value) { return this.real.format(value); }
    } },
  });
  const result = api.Counter({ to: 1234.5, decimals: 2, prefix: '$', suffix: '+', formattedValue: '1,234.50' });
  assert.equal(result.props.children, '$1,234.50+');
  assert.equal(formats, 0);
  const cleanup = effects[0]();
  entrance();
  for (const value of [0, 25.25, 500.4, 1234.5]) {
    state.v = value; tween.onUpdate();
    assert.equal(element.textContent, '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + '+');
  }
  cleanup();
  assert.equal(element.textContent, '$1,234.50+');
  assert.equal(formats, 1);
});

test('section dots skip mobile scroll rigs and restore them after resizing to desktop', () => {
  const effects = [], rigs = [];
  let changed, removed = false;
  const media = {
    matches: false,
    addEventListener(_event, callback) { changed = callback; },
    removeEventListener() { removed = true; },
  };
  const nodes = [{ id: 'top', dataset: { section: 'Intro' } }, { id: 'work', dataset: { section: 'Work' } }];
  const api = load('../src/components/shell/ScrollUI.tsx', {
    require: id => {
      if (id === 'react') return { useEffect: fn => effects.push(fn), useState: initial => [initial, () => {}] };
      if (id === 'next/navigation') return { usePathname: () => '/' };
      if (id === 'react/jsx-runtime') return jsx;
      if (id === '@/lib/gsap') return { gsap: {}, ScrollTrigger: { create() {
        const rig = { killed: false, kill() { this.killed = true; } };
        rigs.push(rig); return rig;
      } } };
      return { onReady: fn => { fn(); return () => {}; } };
    },
    window: { matchMedia: () => media },
    document: { querySelectorAll: () => nodes, querySelector: () => ({}) },
  });
  api.SectionDots();
  const cleanup = effects[0]();
  assert.equal(rigs.length, 0);
  media.matches = true; changed();
  assert.equal(rigs.length, 3);
  media.matches = false; changed();
  assert.ok(rigs.every(rig => rig.killed));
  media.matches = true; changed();
  assert.equal(rigs.length, 6);
  cleanup();
  assert.ok(rigs.every(rig => rig.killed));
  assert.equal(removed, true);
});

test('the loader can release scrolling before hydration and records completion once', () => {
  const events = new Map(), marks = [];
  const root = { dataset: {}, classList: { remove: name => assert.equal(name, 'is-loading') } };
  const history = { scrollRestoration: 'auto' };
  const api = load('../src/lib/initialEntrance.ts', {
    document: {
      documentElement: root,
      addEventListener: (type, callback) => events.set(type, callback),
      removeEventListener: type => events.delete(type),
    },
    history,
    performance: { mark: name => marks.push(name) },
  });
  api.installInitialEntrance();
  assert.equal(history.scrollRestoration, 'manual');
  events.get('animationend')({ animationName: 'loader-logo' });
  assert.equal(root.dataset.loaderComplete, undefined);
  events.get('animationend')({ animationName: 'loader-bottom' });
  assert.equal(root.dataset.loaderComplete, 'true');
  assert.equal(events.size, 0);
  api.installInitialEntrance();
  events.get('animationend')({ animationName: 'loader-bottom' });
  assert.deepEqual(marks, ['preloader:complete']);
});

test('book refreshes leave stationary pages alone and page turns remain reversible', () => {
  const effects = [], writes = [];
  const leaves = Array.from({ length: 3 }, () => ({ querySelectorAll: () => [{ style: {} }] }));
  const book = {}, stage = {};
  let ref = 0, ready, state, tween, labelText = '', labelWrites = 0;
  const label = { get textContent() { return labelText; }, set textContent(value) { labelText = value; labelWrites++; } };
  const refs = [stage, book, leaves, label, {}, null];
  const api = load('../src/components/catalogue/FlipBook.tsx', {
    require: id => {
      if (id === 'react') return { useMemo: fn => fn(), useRef: () => ({ current: refs[ref++] }) };
      if (id === 'react/jsx-runtime') return jsx;
      if (id === '@/lib/engine') return {
        useIsoLayoutEffect: fn => effects.push(fn), isReducedMotion: () => false,
        onReady: fn => { ready = fn; return () => {}; },
      };
      if (id === '@/lib/cataloguePages') return { buildCataloguePages: () => Array.from({ length: 6 }, () => ({ kind: 'cover' })) };
      if (id === '@/lib/gsap') return { gsap: {
        utils: { clamp: (min, max, value) => Math.min(max, Math.max(min, value)) },
        matchMedia: () => ({ add(_query, fn) { fn(); }, revert() {} }),
        set: (target, vars) => writes.push({ target, vars }),
        fromTo(target, _from, vars) { state = target; tween = vars; return { scrollTrigger: { kill() {} }, kill() {} }; },
      } };
      return { SCROLL_MOTION: {} };
    },
    window: { requestAnimationFrame: () => 1, cancelAnimationFrame() {} },
  });
  api.FlipBook({ catalogue: { id: 'test' }, variant: 'inline', controls: false });
  const cleanup = effects[0]();
  ready();
  writes.length = 0;
  for (let i = 0; i < 5; i++) tween.scrollTrigger.onRefresh({ progress: 0 });
  assert.equal(writes.length, 0, 'repeated pin refreshes must not rewrite unchanged pages');
  assert.equal(labelWrites, 1);
  state.p = 1 / 3; tween.onUpdate();
  assert.equal(writes.filter(write => leaves.includes(write.target)).length, 1);
  assert.equal(writes.find(write => write.target === leaves[0]).vars.rotationY, -180);
  assert.equal(labelText, 'Pages 2–3 of 6');
  writes.length = 0;
  state.p = 0; tween.onUpdate();
  assert.equal(Math.abs(writes.find(write => write.target === leaves[0]).vars.rotationY), 0);
  assert.equal(labelText, 'Front cover');
  assert.equal(writes.filter(write => leaves.includes(write.target)).length, 1);
  cleanup();
});
