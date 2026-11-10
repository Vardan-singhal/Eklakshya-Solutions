import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import * as jsxRuntime from 'react/jsx-runtime';
import { heroFrameLoop, heroPixelRatio } from '../src/components/three/heroWorkerProtocol.ts';

function bridge() {
  const effects = [], refs = [], updates = [], workers = [], frames = new Map(), listeners = new Map(), marks = [];
  let index = 0, ready, rendered = 0, cancelledReady = false;
  const engine = { ready: false, heroProgress: 0 };
  const host = { clientWidth: 1440, clientHeight: 900, visual: { dataset: {} }, closest() { return this.visual; }, appendChild(canvas) { this.canvas = canvas; } };
  class Canvas {
    style = {};
    attributes = {};
    setAttribute(name, value) { this.attributes[name] = value; }
    transferControlToOffscreen() { return this.offscreen = {}; }
    remove() { this.removed = true; }
  }
  class Worker {
    messages = [];
    constructor() { workers.push(this); }
    postMessage(message, transfer) { this.messages.push({ message: structuredClone(message), transfer }); }
    terminate() { this.terminated = true; }
    receive(type) { this.onmessage({ data: { type } }); }
  }
  let observer, density;
  const window = {
    innerWidth: 1440, innerHeight: 900, devicePixelRatio: 2,
    addEventListener: (type, callback) => listeners.set(type, callback),
    removeEventListener: (type) => listeners.delete(type),
    matchMedia: () => density = { addEventListener(type, callback) { this.callback = callback; }, removeEventListener() { this.removed = true; } },
  };
  const require = (id) => {
    if (id === 'react/jsx-runtime') return jsxRuntime;
    if (id === 'react') return {
      useRef(initial) { const i = index++; return refs[i] ??= { current: i === 0 ? host : initial }; },
      useState(initial) { return [typeof initial === 'function' ? initial() : initial, next => updates.push(next)]; },
      useEffect(callback) { effects.push(callback); },
    };
    if (id === 'next/dynamic') return { default: () => function Fallback() {} };
    if (id === '@/lib/engine') return { engine, onReady(callback) { ready = callback; return () => { cancelledReady = true; }; } };
    if (id === './heroWorkerProtocol') return { heroPixelRatio };
    throw new Error(id);
  };
  const exports = {};
  const source = readFileSync(new URL('../src/components/three/HeroRenderer.tsx', import.meta.url), 'utf8').replaceAll('import.meta.url', JSON.stringify(import.meta.url));
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
  let nextFrame = 0;
  runInNewContext(compiled, {
    exports, require, window, Worker, HTMLCanvasElement: Canvas, URL, NaN,
    document: { createElement: () => new Canvas() },
    performance: { mark: name => marks.push(name) },
    ResizeObserver: class { constructor(callback) { this.callback = callback; observer = this; } observe() {} disconnect() { this.disconnected = true; } },
    requestAnimationFrame: callback => { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
  });
  const onRendered = () => rendered++;
  const render = (props = {}) => {
    index = 0;
    exports.default({ active: true, light: false, onRendered, ...props });
  };
  render();
  const cleanup = effects.shift()();
  effects.shift()();
  return {
    host, workers, engine, updates, marks, listeners, frames, window, render,
    cleanup,
    rendered: () => rendered,
    ready: () => ready(),
    cancelled: () => cancelledReady,
    resize: () => observer.callback(),
    density: () => density,
    observer: () => observer,
    controls(props) { render(props); effects.shift(); effects.shift()(); },
    frame() { const batch = [...frames.values()]; frames.clear(); batch.forEach(callback => callback()); },
  };
}

test('worker transfers its own canvas and preserves hero size, quality and first-frame handoff', () => {
  const h = bridge();
  const worker = h.workers[0];
  const init = worker.messages[0];
  assert.equal(init.message.type, 'init');
  assert.equal(init.transfer[0], h.host.canvas.offscreen);
  assert.deepEqual(init.message.size, { width: 1440, height: 900, dpr: 1.5, compact: false });
  assert.equal(h.rendered(), 0);
  worker.receive('ready');
  assert.equal(h.rendered(), 1);
  assert.ok(h.marks.includes('hero:worker-ready'));
  worker.receive('loading');
  assert.equal(h.host.visual.dataset.sceneState, 'loading');
  worker.receive('ready');
  assert.equal(h.host.visual.dataset.sceneState, 'ready');
  h.ready();
  assert.equal(worker.messages.at(-1).message.controls.released, true);
  h.controls({ active: false, light: true });
  assert.deepEqual(worker.messages.at(-1).message.controls, { active: false, light: true, released: true });
  h.cleanup();
});

test('worker receives pointer/scroll input, resize and monitor pixel-density changes', () => {
  const h = bridge();
  const worker = h.workers[0];
  h.listeners.get('pointermove')({ clientX: 1440, clientY: 0 });
  h.engine.heroProgress = 0.6;
  h.frame();
  assert.deepEqual(worker.messages.at(-1).message, { type: 'input', x: 1, y: 1, progress: 0.6 });
  const count = worker.messages.length;
  h.frame();
  assert.equal(worker.messages.length, count);
  h.host.clientWidth = 1200;
  h.resize();
  assert.equal(worker.messages.at(-1).message.size.width, 1200);
  h.window.innerWidth = 1024;
  h.window.innerHeight = 1366;
  h.resize();
  assert.equal(worker.messages.at(-1).message.size.compact, true);
  h.window.innerHeight = 768;
  h.resize();
  assert.equal(worker.messages.at(-1).message.size.compact, false);
  h.window.devicePixelRatio = 1;
  h.density().callback();
  assert.equal(worker.messages.at(-1).message.size.dpr, 1);
  h.cleanup();
  assert.equal(worker.terminated, true);
  assert.equal(h.frames.size, 0);
  assert.equal(h.listeners.size, 0);
  assert.equal(h.observer().disconnected, true);
  assert.equal(h.host.canvas.removed, true);
  assert.equal(h.cancelled(), true);
  worker.receive('ready');
  assert.equal(h.rendered(), 0);
});

test('worker failure selects the original renderer and preserves the loader pause rules', () => {
  const h = bridge();
  h.workers[0].receive('failed');
  assert.deepEqual(h.updates, [true]);
  assert.equal(h.workers[0].terminated, true);
  h.cleanup();
  assert.equal(heroFrameLoop({ active: true, released: false }, false), 'always');
  assert.equal(heroFrameLoop({ active: true, released: false }, true), 'never');
  assert.equal(heroFrameLoop({ active: true, released: true }, true), 'always');
  assert.equal(heroFrameLoop({ active: false, released: true }, true), 'never');
  assert.equal(heroFrameLoop({ active: false, released: false }, false), 'always');
  assert.equal(heroFrameLoop({ active: false, released: true }, false), 'always');
});
