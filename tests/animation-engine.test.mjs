import assert from 'node:assert/strict';
import { test } from 'node:test';
import { engine, markReady, observeEntrance, observeReadyEntrance, resolveScrollTarget, scrollToTarget } from '../src/lib/engine.ts';

function viewport(run) {
  const originalWindow = globalThis.window;
  const originalObserver = globalThis.IntersectionObserver;
  const originalReady = engine.ready;
  const observers = [];
  const events = new EventTarget();
  const frames = new Map();
  let frameId = 0;
  globalThis.window = {
    innerHeight: 800,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
  };
  globalThis.IntersectionObserver = class {
    constructor(callback, options) {
      assert.match(options.rootMargin, /^0px 0px -?\d+px 0px$/);
      this.callback = callback;
      this.margin = options.rootMargin;
      this.active = true;
      observers.push(this);
    }
    observe(element) { this.element = element; }
    disconnect() { this.active = false; }
    enter(visible) { if (this.active) this.callback([{ isIntersecting: visible }]); }
  };
  try {
    run(observers, () => {
      const queued = Array.from(frames.values());
      frames.clear();
      queued.forEach((callback) => callback());
    });
  } finally {
    engine.ready = originalReady;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalObserver === undefined) delete globalThis.IntersectionObserver;
    else globalThis.IntersectionObserver = originalObserver;
  }
}

test('entrance animations wait for visibility and run once', () => viewport((observers) => {
  let calls = 0;
  const element = {};
  observeEntrance(element, () => calls++);
  assert.equal(observers[0].element, element);
  assert.equal(observers[0].margin, '0px 0px -96px 0px');
  observers[0].enter(false);
  assert.equal(calls, 0);
  observers[0].enter(true);
  observers[0].enter(true);
  assert.equal(calls, 1);
}));

test('scroll animations can prepare before entering the viewport', () => viewport((observers) => {
  let prepared = false;
  observeEntrance({}, () => { prepared = true; }, 'top 120%');
  assert.equal(observers[0].margin, '0px 0px 160px 0px');
  observers[0].enter(true);
  assert.equal(prepared, true);
}));

test('unmounted entrances ignore already queued visibility notifications', () => viewport((observers) => {
  let calls = 0;
  const unsubscribe = observeEntrance({}, () => calls++);
  unsubscribe();
  observers[0].callback([{ isIntersecting: true }]);
  assert.equal(calls, 0);
}));

test('entrance alignment follows resized viewport height', () => viewport((observers, flush) => {
  const unsubscribe = observeEntrance({}, () => {});
  window.innerHeight = 1000;
  window.dispatchEvent(new Event('resize'));
  flush();
  assert.equal(observers[0].active, false);
  assert.equal(observers[1].margin, '0px 0px -120px 0px');
  unsubscribe();
  window.dispatchEvent(new Event('resize'));
  flush();
  assert.equal(observers.length, 2);
}));

test('visible reveals wait until the page curtain releases them', () => viewport((observers) => {
  engine.ready = false;
  let calls = 0;
  observeReadyEntrance({}, () => calls++);
  observers[0].enter(true);
  assert.equal(calls, 0);
  markReady();
  assert.equal(calls, 1);
}));

test('unmounted reveals unsubscribe from pending page readiness', () => viewport((observers) => {
  engine.ready = false;
  let calls = 0;
  const unsubscribe = observeReadyEntrance({}, () => calls++);
  observers[0].enter(true);
  unsubscribe();
  markReady();
  assert.equal(calls, 0);
}));

function scrolling(run, { reduced = false, smooth = false } = {}) {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalLenis = engine.lenis;
  const calls = [];
  const element = { getBoundingClientRect: () => ({ top: 600 }) };
  globalThis.window = {
    scrollY: 200,
    getComputedStyle: () => ({ scrollMarginTop: '128px' }),
    matchMedia: () => ({ matches: reduced }),
    scrollTo: (options) => calls.push(options),
  };
  globalThis.document = {
    documentElement: { getBoundingClientRect: () => ({ top: -200 }) },
    getElementById: (id) => id === 'section:one two' ? element : null,
    querySelector: () => { throw new Error('invalid selector'); },
  };
  engine.lenis = smooth ? { scrollTo: (target, options) => calls.push({ target, ...options }) } : null;
  try { run(calls, element); }
  finally {
    engine.lenis = originalLenis;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
}

test('native anchors use responsive section clearance and decoded IDs', () => scrolling((calls, element) => {
  assert.equal(resolveScrollTarget('#section:one%20two'), element);
  scrollToTarget('#section:one%20two');
  assert.deepEqual(calls, [{ top: 672, behavior: 'smooth' }]);
}));

test('Lenis anchors apply CSS clearance once, matching native alignment', () => scrolling((calls) => {
  scrollToTarget('#section:one%20two');
  assert.equal(calls[0].target, 672);
  assert.equal(calls[0].offset, 0);
  assert.equal(calls[0].force, true);
  assert.ok(calls[0].duration >= 0.75 && calls[0].duration <= 1.8);
  assert.equal(calls[0].easing(0), 0);
  assert.equal(calls[0].easing(1), 1);
  assert.equal(calls[0].easing(0.5), 0.5);
}, { smooth: true }));

test('numeric pin positions and explicit zero offsets retain exact alignment', () => scrolling((calls) => {
  scrollToTarget(0);
  scrollToTarget(100);
  scrollToTarget('#section:one%20two', 0);
  assert.deepEqual(calls.map((call) => call.top), [0, 100, 800]);
}));

test('reduced motion and covered route alignment scroll instantly', () => {
  scrolling((calls) => {
    scrollToTarget(400);
    assert.equal(calls[0].behavior, 'instant');
  }, { reduced: true });
  scrolling((calls) => {
    scrollToTarget(400, 0, { immediate: true });
    assert.equal(calls[0].immediate, true);
  }, { smooth: true });
});

test('missing or malformed anchor targets do not interrupt scrolling', () => scrolling((calls) => {
  scrollToTarget('#missing');
  scrollToTarget('[invalid');
  scrollToTarget('#bad%hash');
  assert.equal(calls.length, 0);
}));
