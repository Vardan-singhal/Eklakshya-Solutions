import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import { PerspectiveCamera } from 'three';
import { fitPerspectiveFov, heroComposition, horizontalGesture, installSceneTouchGestures } from '../src/lib/responsiveScene.ts';

const widths = [320, 360, 390, 430, 600, 768, 1024, 1280, 1440, 1920];
function load(file, require, globals = {}) {
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  runInNewContext(code, { exports, require, ...globals });
  return exports;
}

test('all scene projections preserve square desktop framing and fit narrower containers on rotation', () => {
  for (const width of widths) {
    for (const fov of [32, 34, 35, 38, 40, 42, 44]) {
      const side = Math.max(160, width - 88);
      assert.equal(fitPerspectiveFov(fov, side, side), fov);
      for (const [w, h] of [[side, side * 1.6], [side * 1.6, side]]) {
        const camera = new PerspectiveCamera(fitPerspectiveFov(fov, w, h), w / h);
        const vertical = 2 * 9.5 * Math.tan(camera.fov * Math.PI / 360);
        const original = 2 * 9.5 * Math.tan(fov * Math.PI / 360);
        assert.ok(vertical * camera.aspect >= original - 1e-10, `${width}/${fov}`);
        assert.ok(vertical >= original - 1e-10);
      }
    }
  }
  assert.equal(fitPerspectiveFov(38, 0, 0), 38);
});

test('complete hero target fits every narrow panel while desktop composition is exact', () => {
  const viewHeight = 2 * 9.5 * Math.tan(42 * Math.PI / 360);
  for (const width of widths) {
    const height = width < 1024 ? Math.min(width * 0.8, 480) : 900;
    const aspect = width / height;
    const viewWidth = viewHeight * aspect;
    const result = heroComposition(width, height, viewWidth, aspect);
    if (width >= 1024) {
      assert.equal(result.scale, aspect > 1.15 ? 0.86 : 1);
      assert.equal(result.side, aspect > 1.15 ? viewWidth * 0.22 : 0);
      assert.equal(result.depthTravel, 1);
    } else {
      assert.equal(result.side, 0);
      assert.ok(11.2 * result.scale < Math.min(viewWidth, viewHeight));
      assert.ok(Math.abs(result.scale * result.depthTravel - 0.86) < 1e-12, 'mobile fitting preserves desktop fly-through depth/timing');
    }
  }
  // Portrait tablets use a fitted panel even when their width reaches the desktop breakpoint.
  for (const width of [1024, 1280]) {
    const result = heroComposition(width, 480, viewHeight * width / 480, width / 480, true);
    assert.equal(result.side, 0);
    assert.ok(11.2 * result.scale < viewHeight);
    assert.ok(Math.abs(result.scale * result.depthTravel - 0.86) < 1e-12);
  }
});

test('page-turn gestures accept horizontal intent and leave vertical scrolls and taps alone', () => {
  assert.equal(horizontalGesture(-90, 8), 1);
  assert.equal(horizontalGesture(90, 8), -1);
  assert.equal(horizontalGesture(8, 90), 0);
  assert.equal(horizontalGesture(25, 30), 0);
  assert.equal(horizontalGesture(4, 2), 0);
});

test('scene context loss shows recovery until a real draw and removes all listeners on unmount', () => {
  const effects = [], layouts = [], events = new Map();
  let tick;
  const host = { dataset: {} };
  const style = { touchAction: 'auto', setProperty(_name, value) { this.touchAction = value; } };
  const gl = { domElement: { style, dataset: {}, closest: () => host, addEventListener: (type, fn) => events.set(type, fn), removeEventListener: type => events.delete(type) }, info: { render: { calls: 0 }, reset() { this.render.calls = 0; } } };
  const camera = new PerspectiveCamera(38, 0.5);
  const api = load('../src/components/three/SceneViewport.tsx', id => {
    if (id === 'react') return { useRef: value => ({ current: value }), useEffect: fn => effects.push(fn), useLayoutEffect: fn => layouts.push(fn) };
    if (id === '@react-three/fiber') return { useThree: () => ({ camera, size: { width: 320, height: 640 }, gl }), useFrame: fn => { tick = fn; } };
    if (id === '@/lib/responsiveScene') return { fitPerspectiveFov, installSceneTouchGestures };
    throw new Error(id);
  }, { window: { matchMedia: () => ({ matches: true }) } });
  api.SceneViewport({ fov: 38 });
  layouts.forEach(fn => fn());
  const cleanup = effects[0]();
  assert.ok(Math.abs(camera.fov - fitPerspectiveFov(38, 320, 640)) < 1e-10);
  assert.equal(style.touchAction, 'pan-y');
  tick(); assert.equal(host.dataset.sceneState, 'loading');
  gl.info.render.calls = 5;
  tick(); assert.equal(host.dataset.sceneState, 'ready');
  let prevented = false;
  events.get('webglcontextlost')({ preventDefault() { prevented = true; } });
  tick(); assert.equal(host.dataset.sceneState, 'loading');
  assert.equal(prevented, true);
  events.get('webglcontextrestored')();
  tick(); assert.equal(host.dataset.sceneState, 'loading');
  gl.info.render.calls = 1;
  tick(); assert.equal(host.dataset.sceneState, 'ready');
  cleanup();
  assert.equal(events.size, 0);
  assert.equal(style.touchAction, 'auto');
});

test('only multi-touch rotation cancels native gestures; single touches retain compositor scrolling', () => {
  const events = new Map();
  const canvas = { dataset: {}, addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name) };
  const stop = installSceneTouchGestures(canvas);
  let prevented = 0;
  const event = count => ({ touches: Array(count).fill({}), cancelable: true, preventDefault() { prevented++; } });
  events.get('touchstart')(event(1));
  assert.equal(prevented, 0);
  assert.equal(events.has('touchmove'), false);
  events.get('touchstart')(event(2));
  assert.equal(prevented, 1);
  assert.equal(canvas.dataset.multiTouch, 'true');
  events.get('touchmove')(event(2));
  assert.equal(prevented, 2);
  events.get('touchend')(event(1));
  assert.equal(events.has('touchmove'), false);
  assert.equal(canvas.dataset.multiTouch, 'false');
  stop();
  assert.equal(events.size, 0);
  assert.equal(canvas.dataset.multiTouch, undefined);
});

test('touch orbit controls preserve mouse settings and restore scrolling/input settings after cleanup', () => {
  const effects = [];
  const element = { style: { touchAction: 'none' } };
  const controls = { domElement: element, touches: { ONE: 0, TWO: 2 }, enabled: true, enableZoom: false };
  let onChange;
  const media = { matches: true, addEventListener(_type, fn) { onChange = fn; }, removeEventListener() {} };
  const api = load('../src/components/three/ResponsiveOrbitControls.tsx', id => {
    if (id === 'react') return { forwardRef: render => ({ render }), useRef: () => ({ current: controls }), useEffect: fn => effects.push(fn), useImperativeHandle() {} };
    if (id === 'react/jsx-runtime') return jsx;
    if (id === '@react-three/fiber') return { useThree: () => ({ gl: { domElement: element } }) };
    if (id === '@react-three/drei') return { OrbitControls() {} };
    if (id === 'three') return { TOUCH: { DOLLY_ROTATE: 3 } };
    throw new Error(id);
  }, { window: { matchMedia: () => media } });
  api.ResponsiveOrbitControls.render({ enableZoom: false }, null);
  const cleanup = effects[0]();
  assert.equal(element.style.touchAction, 'pan-y');
  assert.equal(controls.touches.ONE, -1);
  assert.equal(controls.touches.TWO, 3);
  assert.equal(controls.enabled, true);
  assert.equal(controls.enableZoom, false);
  media.matches = false; onChange();
  assert.equal(controls.touches.ONE, 0);
  assert.equal(controls.touches.TWO, 2);
  assert.equal(element.style.touchAction, 'none');
  cleanup();
});

test('hero camera/wipe timeline initializes at every target width with unchanged sequence and easing', () => {
  let reference;
  for (const width of widths) {
    const effects = [], calls = [];
    let update;
    const engine = { heroProgress: 0 };
    const timeline = { to(_target, vars, at) { calls.push(['to', vars, at]); return this; }, fromTo(_target, from, to, at) { calls.push(['fromTo', from, to, at]); return this; }, eventCallback(_event, fn) { update = fn; }, progress: () => 0.5 };
    const api = load('../src/components/sections/HomeHero.tsx', id => {
      if (id === 'react') return { useRef: () => ({ current: { offsetHeight: 800 } }) };
      if (id === 'react/jsx-runtime') return jsx;
      if (id === '@/lib/engine') return { engine, useIsoLayoutEffect: fn => effects.push(fn) };
      if (id === '@/lib/gsap') return { gsap: { matchMedia: () => ({ add(query, fn) { assert.equal(query, '(prefers-reduced-motion: no-preference)'); fn(); }, revert() {} }), timeline: () => timeline } };
      if (id === '@/lib/motionSettings') return { SCROLL_MOTION: { scrub: 0.5 } };
      return new Proxy({}, { get: () => () => null });
    }, { window: { innerWidth: width, innerHeight: 844 } });
    api.HomeHero();
    effects[0]();
    update();
    assert.equal(engine.heroProgress, 0.5);
    const encoded = JSON.stringify(calls);
    reference ??= encoded;
    assert.equal(encoded, reference);
  }
});
