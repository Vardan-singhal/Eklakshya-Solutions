import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as jsxRuntime from 'react/jsx-runtime';
import { createModelPreparationQueue } from '../src/lib/modelPreparationQueue.ts';
import { coversModel } from '../src/lib/modelVisibility.ts';

function load(file, require, globals = {}) {
  const source = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  runInNewContext(source, { exports, require, ...globals });
  return exports;
}

function graphics({ memory = 8, width = 1280 } = {}) {
  const effects = [], updates = [], frames = [], observers = [];
  const events = new Map();
  let probes = 0;
  let onCovered = () => {};
  const raf = (callback) => { frames.push(callback); return frames.length; };
  const window = {
    innerWidth: width, location: { search: '' },
    matchMedia: () => ({ matches: false }),
    addEventListener: (type, callback) => events.set(type, callback),
    removeEventListener: (type) => events.delete(type),
  };
  const document = { hidden: false, addEventListener: (type, callback) => events.set(type, callback), removeEventListener: (type) => events.delete(type), createElement: () => ({ getContext: () => { probes++; return { getExtension: () => null }; } }) };
  const api = load('../src/components/three/useGraphics.ts', (id) => {
    if (id === '@/lib/modelVisibility') return { observeStackOcclusion: (_el, _interested, callback) => { onCovered = callback; return () => {}; } };
    assert.equal(id, 'react');
    return {
      useState: (initial) => [initial, (next) => updates.push(next)],
      useEffect: (callback) => effects.push(callback),
      useRef: () => ({ current: null }),
    };
  }, {
    window, navigator: { deviceMemory: memory, hardwareConcurrency: 8 }, URLSearchParams,
    requestAnimationFrame: raf, cancelAnimationFrame: () => {},
    document,
    IntersectionObserver: class {
      constructor(callback, options) { this.callback = callback; this.margin = options.rootMargin; this.disconnected = false; observers.push(this); }
      observe(element) { this.element = element; }
      disconnect() { this.disconnected = true; }
      enter(visible) { this.callback([{ isIntersecting: visible }]); }
    },
  });
  return {
    api, events, updates, observers,
    effects: () => effects.splice(0).map((callback) => callback()),
    flush: () => frames.splice(0).forEach((callback) => callback()),
    probes: () => probes,
    cover: value => onCovered(value),
    hide(value) { document.hidden = value; events.get('visibilitychange')?.(); },
  };
}

test('service graphics capability resolves before any user interaction', () => {
  const h = graphics();
  h.api.useCanRender3D(768);
  h.effects(); h.flush();
  assert.deepEqual(h.updates, [true]);
  assert.equal(h.events.size, 0);
  assert.equal(h.probes(), 1);
});

test('service renderers retain their models across visibility changes', () => {
  let active = false;
  const kinds = ['web', 'app', 'software', 'saas', 'catalogue', 'image', 'seo'];
  const scenes = [];
  const Boundary = () => null;
  const api = load('../src/components/three/ServiceVisual.tsx', (id) => {
    if (id === 'react/jsx-runtime') return jsxRuntime;
    if (id === 'next/dynamic') return { default: () => { const Scene = () => null; scenes.push(Scene); return Scene; } };
    if (id === '@/components/ui/icons') return { SERVICE_ICON: Object.fromEntries(kinds.map((kind) => [kind, () => null])) };
    if (id === '@/components/providers/theme') return { useTheme: () => ({ theme: 'dark' }) };
    if (id === './Boundary') return { Boundary };
    assert.equal(id, './useGraphics');
    return {
      useCanRender3D(minWidth, onInteraction) { assert.equal(minWidth, 768); assert.notEqual(onInteraction, true); return true; },
      useInView: () => [{ current: null }, active],
    };
  });
  for (const kind of kinds) {
    active = false;
    const before = api.ServiceVisual({ kind }).props.children[1];
    assert.equal(before.type, Boundary, kind + ' must mount before viewport entry');
    assert.ok(scenes.includes(before.props.children.type));
    assert.equal(before.props.children.props.renderActive, false);
    active = true;
    const visible = api.ServiceVisual({ kind }).props.children[1];
    assert.equal(visible.props.children.type, before.props.children.type);
    assert.equal(visible.props.children.props.renderActive, true);
    active = false;
    const after = api.ServiceVisual({ kind }).props.children[1];
    assert.equal(after.props.children.type, before.props.children.type, kind + ' must keep its renderer after leaving');
  }
});

test('active visibility still turns off so offscreen animation can pause', () => {
  const h = graphics();
  const [ref] = h.api.useInView('700px');
  ref.current = {};
  h.effects();
  h.observers[0].enter(true);
  h.observers[0].enter(false);
  assert.deepEqual(h.updates, [true, false]);
});

test('a fully covered sticky scene pauses and resumes on exposure without unmounting', () => {
  const h = graphics();
  const [ref] = h.api.useInView('100px', true);
  ref.current = {};
  h.effects();
  h.observers[0].enter(true);
  h.cover(true);
  h.cover(false);
  h.hide(true);
  h.hide(false);
  assert.deepEqual(h.updates, [true, false, true, false, true]);
});

test('occlusion requires full coverage including clearance for rounded corners', () => {
  const model = { top: 100, bottom: 400, left: 600, right: 900 };
  assert.equal(coversModel(model, { top: 0, bottom: 500, left: 0, right: 1000 }), true);
  assert.equal(coversModel(model, { top: 110, bottom: 500, left: 0, right: 1000 }), false);
  assert.equal(coversModel(model, { top: 90, bottom: 500, left: 0, right: 1000 }), false);
  assert.equal(coversModel(model, { top: 0, bottom: 500, left: 610, right: 1000 }), false);
});

test('low-memory devices retain the graphics fallback without probing WebGL', () => {
  const h = graphics({ memory: 2 });
  h.api.useCanRender3D(768);
  h.effects(); h.flush();
  assert.equal(h.probes(), 0);
  assert.equal(h.updates.length, 0);
});

test('hero interaction gating remains available independently of service loading', () => {
  const h = graphics();
  h.api.useCanRender3D(900, true);
  h.effects(); h.flush();
  assert.equal(h.updates.length, 0);
  h.events.get('wheel')({ type: 'wheel' });
  h.flush();
  assert.deepEqual(h.updates, [true]);
});

test('the hero can start before input and report a final capability decision', () => {
  const h = graphics();
  const decisions = [];
  h.api.useCanRender3D(900, false, value => decisions.push(value));
  h.effects(); h.flush();
  assert.deepEqual(decisions, [true]);
  assert.equal(h.events.size, 0);
  const mobile = graphics({ width: 390 });
  mobile.api.useCanRender3D(900, false, value => decisions.push(value));
  mobile.effects(); mobile.flush();
  assert.deepEqual(decisions, [true, false]);
});

function heroLatch() {
  const timers = new Map();
  let id = 0;
  const api = load('../src/lib/heroReadiness.ts', () => { throw new Error('unexpected import'); }, {
    setTimeout(callback) { timers.set(++id, callback); return id; },
    clearTimeout(key) { timers.delete(key); },
  });
  return { latch: api.createHeroReadiness(), expire() { [...timers.values()].forEach(callback => callback()); }, pending: () => timers.size };
}

test('loader readiness waits for a rendered hero, including an already rendered hero', async () => {
  const h = heroLatch();
  let complete = false;
  const wait = h.latch.wait();
  wait.promise.then(() => { complete = true; });
  h.latch.resolveCapability(true);
  await Promise.resolve();
  assert.equal(complete, false);
  h.latch.rendered();
  await wait.promise;
  assert.equal(complete, true);
  assert.equal(h.pending(), 0);
  await h.latch.wait().promise;
  assert.equal(h.pending(), 0);
});

test('unsupported devices and timed-out renderers choose a stable fallback', async () => {
  const h = heroLatch();
  const wait = h.latch.wait();
  h.latch.resolveCapability(false);
  await wait.promise;
  assert.equal(h.latch.getSnapshot(), 'fallback');
  const slow = heroLatch();
  const timeout = slow.latch.wait();
  slow.expire(); await timeout.promise;
  slow.latch.rendered();
  assert.equal(slow.latch.getSnapshot(), 'fallback', 'a late GPU result cannot pop in after the loader');
});

test('cancelled loader waits unsubscribe without abandoning a live hero', async () => {
  const h = heroLatch();
  const wait = h.latch.wait();
  wait.cancel(); await wait.promise;
  assert.equal(h.pending(), 0);
  assert.equal(h.latch.getSnapshot(), 'pending');
  h.latch.rendered();
  assert.equal(h.latch.getSnapshot(), 'rendered');
});

test('hero first-frame notification follows a draw and ignores unmounted callbacks', () => {
  let tick, cleanup;
  let ready = 0, marks = 0;
  const frames = new Map();
  const effects = [];
  let id = 0;
  const api = load('../src/components/three/HeroFirstFrame.tsx', name => {
    if (name === 'react') return { useRef: initial => ({ current: initial }), useEffect: effect => effects.push(effect) };
    assert.equal(name, '@react-three/fiber');
    return { useFrame: callback => { tick = callback; } };
  }, {
    window: { requestAnimationFrame(callback) { frames.set(++id, callback); return id; }, cancelAnimationFrame: key => frames.delete(key) },
    performance: { mark: () => marks++ },
  });
  api.HeroFirstFrame({ onRendered: () => ready++ });
  cleanup = effects[0]();
  tick({ gl: { info: { render: { calls: 0 } } } });
  assert.equal(frames.size, 0);
  tick({ gl: { info: { render: { calls: 10 } } } });
  assert.equal(ready, 0);
  const notify = [...frames.values()][0];
  cleanup(); notify();
  assert.equal(ready, 0);
  assert.equal(marks, 0);
  cleanup = effects[0]();
  tick({ gl: { info: { render: { calls: 10 } } } });
  [...frames.values()][0]();
  assert.equal(ready, 1);
  assert.equal(marks, 1);
  cleanup();
});

test('service GPU preparation waits until the hero loader releases the page', () => {
  let schedule, ready;
  let idle;
  let starts = 0;
  load('../src/components/three/ScenePreparation.tsx', name => {
    if (name === 'react' || name === 'react/jsx-runtime') return {};
    if (name === '@/lib/modelPreparationQueue') return { createModelPreparationQueue(callback) { schedule = callback; return {}; } };
    assert.equal(name, '@/lib/engine');
    return { onReady(callback) { ready = callback; return () => { ready = null; }; } };
  }, { window: { requestIdleCallback(callback) { idle = callback; return 1; }, cancelIdleCallback() { idle = null; } } });
  const cancel = schedule(() => starts++);
  assert.equal(idle, undefined);
  ready();
  assert.equal(starts, 0);
  idle();
  assert.equal(starts, 1);
  cancel();
  schedule(() => starts++ )();
  assert.equal(ready, null);
});

function warmup(frameloop = 'always') {
  let tick;
  let cleanup;
  let id = 0;
  const timers = new Map();
  let invalidations = 0;
  let settlements = 0;
  const modes = [];
  const api = load('../src/components/three/SceneWarmup.tsx', (id) => {
    if (id === 'react') return { useRef: (initial) => ({ current: initial }), useEffect: callback => { cleanup = callback(); } };
    assert.equal(id, '@react-three/fiber');
    return { useFrame: (callback) => { tick = callback; } };
  }, {
    setTimeout(callback) { timers.set(++id, callback); return id; },
    clearTimeout(key) { timers.delete(key); },
  });
  api.SceneWarmup({ onRendered: () => settlements++ });
  return {
    frame(time, calls, geometries) {
      tick({ clock: { elapsedTime: time }, frameloop, setFrameloop: mode => modes.push(mode), gl: { info: { render: { calls }, memory: { geometries } } }, invalidate: () => invalidations++ });
    },
    count: () => invalidations,
    settled: () => settlements,
    pending: () => timers.size,
    flush() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback()); },
    cleanup: () => cleanup?.(),
    modes: () => modes,
  };
}

test('offscreen canvases warm actual draws and newly arriving geometry, then stop', () => {
  const h = warmup();
  h.frame(0, 0, 0);
  assert.equal(h.settled(), 0);
  h.frame(0.02, 8, 10);
  assert.equal(h.settled(), 1);
  assert.equal(h.count(), 2);
  h.frame(0.9, 8, 10);
  assert.equal(h.count(), 2);
  assert.equal(h.settled(), 1);
  h.frame(3, 9, 12);
  assert.equal(h.count(), 3);
  h.frame(4, 9, 12);
  assert.equal(h.count(), 3);
  assert.equal(h.settled(), 1);
});

test('failed assets cannot keep an offscreen warm-up loop running forever', () => {
  const h = warmup();
  h.frame(0, 0, 0);
  h.frame(3, 0, 0);
  assert.equal(h.count(), 1);
  h.frame(5, 8, 10);
  assert.equal(h.count(), 2);
});

test('hidden warm-up yields between draws and cancels pending work on unmount', () => {
  const h = warmup('demand');
  h.frame(0, 0, 0);
  h.frame(0.01, 8, 10);
  assert.equal(h.count(), 0);
  assert.equal(h.pending(), 1);
  h.flush();
  assert.equal(h.count(), 1);
  h.frame(0.1, 8, 10);
  h.cleanup();
  h.flush();
  assert.equal(h.count(), 1);
  assert.equal(h.pending(), 0);
});

test('prepared invisible scenes stop even when camera controls request more frames', () => {
  const h = warmup('demand');
  h.frame(0, 0, 0);
  h.frame(0.02, 8, 10);
  h.frame(0.9, 8, 10);
  assert.deepEqual(h.modes(), ['never']);
  assert.equal(h.settled(), 1);
  assert.equal(h.pending(), 0);
  const visible = warmup('always');
  visible.frame(0, 0, 0); visible.frame(0.02, 8, 10); visible.frame(0.9, 8, 10);
  assert.deepEqual(visible.modes(), []);
});

function preparationQueue() {
  const frames = new Map();
  let id = 0;
  const queue = createModelPreparationQueue((callback) => {
    const current = ++id;
    frames.set(current, callback);
    return () => frames.delete(current);
  });
  return {
    queue,
    run() {
      const [key, callback] = frames.entries().next().value ?? [];
      if (callback) { frames.delete(key); callback(); }
    },
    pendingFrames: () => frames.size,
  };
}

test('background preparation starts without scrolling and serializes expensive scenes', () => {
  const h = preparationQueue();
  const started = [], finish = {};
  for (const name of ['web', 'app', 'seo']) h.queue.enqueue((done) => { started.push(name); finish[name] = done; });
  h.run();
  assert.deepEqual(started, ['web']);
  assert.equal(h.pendingFrames(), 0);
  finish.web(); h.run();
  assert.deepEqual(started, ['web', 'app']);
  finish.app(); h.run();
  assert.deepEqual(started, ['web', 'app', 'seo']);
});

test('an approaching service takes priority without starting every background model', () => {
  const h = preparationQueue();
  const started = [], finish = {};
  const add = (name) => h.queue.enqueue((done) => { started.push(name); finish[name] = done; });
  add('web'); add('app'); const seo = add('seo');
  h.run();
  seo.prioritize(true); h.run();
  assert.deepEqual(started, ['web', 'seo']);
  assert.equal(h.pendingFrames(), 0);
  finish.seo();
  assert.equal(h.pendingFrames(), 0);
  finish.web(); h.run();
  assert.deepEqual(started, ['web', 'seo', 'app']);
});

test('cancelled routes cannot stall preparation or mount their queued scenes', () => {
  const h = preparationQueue();
  const started = [];
  const web = h.queue.enqueue(() => started.push('web'));
  h.queue.enqueue(() => started.push('app'));
  const seo = h.queue.enqueue(() => started.push('seo'));
  seo.cancel();
  h.run();
  web.cancel(); h.run();
  assert.deepEqual(started, ['web', 'app']);
});

function compilation() {
  const effects = [];
  let complete, fail;
  let draws = 0, programs = 0;
  const state = { frameloop: 'demand', setFrameloop(mode) { state.frameloop = mode; } };
  const values = {
    gl: { compileAsync: () => { programs++; return new Promise((resolve, reject) => { complete = resolve; fail = reject; }); } },
    scene: {}, camera: {}, get: () => state, invalidate: () => draws++,
  };
  const api = load('../src/components/three/SceneCompilation.tsx', (id) => {
    if (id === 'react') return { useLayoutEffect: (callback) => effects.push(callback) };
    assert.equal(id, '@react-three/fiber');
    return { useThree: () => values };
  }, { window: { clearTimeout: () => {}, setTimeout } });
  api.SceneCompilation();
  const cleanup = effects[0]();
  return {
    state, cleanup, draws: () => draws, programs: () => programs,
    async finish(error = false) {
      await new Promise(setImmediate);
      if (error) fail?.(new Error('shader failure'));
      else complete?.();
      await new Promise(setImmediate);
    },
  };
}

test('shader compilation completes before demand rendering is resumed', async () => {
  const h = compilation();
  assert.equal(h.state.frameloop, 'never');
  await h.finish();
  assert.equal(h.state.frameloop, 'demand');
  assert.equal(h.draws(), 1);
});

test('compilation does not pause a scene that became visible while preparing', async () => {
  const h = compilation();
  h.state.frameloop = 'always';
  await h.finish();
  assert.equal(h.state.frameloop, 'always');
  assert.equal(h.draws(), 1);
});

test('cancelled scenes cannot compile or draw after unmounting', async () => {
  const h = compilation();
  h.cleanup();
  await h.finish();
  assert.equal(h.programs(), 0);
  assert.equal(h.draws(), 0);
});

test('shader compilation failures release the paused renderer', async () => {
  const h = compilation();
  await h.finish(true);
  assert.equal(h.state.frameloop, 'demand');
  assert.equal(h.draws(), 1);
});

test('hidden preparation uses fewer pixels and visible scenes restore normal quality', () => {
  const h = graphics();
  assert.equal(h.api.servicePixelRatio(false), 0.5);
  assert.deepEqual(Array.from(h.api.servicePixelRatio(true)), [1, 1.5]);
});

