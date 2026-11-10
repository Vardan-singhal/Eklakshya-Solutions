import { Suspense, useEffect, useRef } from "react";
import { createRoot, extend, useFrame, useThree, type RootState } from "@react-three/fiber";
import * as THREE from "three";
import { engine } from "@/lib/engine";
import { HeroArtwork } from "./HeroArtwork";
import { SceneCompilation } from "./SceneCompilation";
import { heroFrameLoop, type HeroControls, type HeroSize, type HeroWorkerMessage } from "./heroWorkerProtocol";

extend({
  Group: THREE.Group, Mesh: THREE.Mesh, TorusGeometry: THREE.TorusGeometry,
  MeshBasicMaterial: THREE.MeshBasicMaterial, RingGeometry: THREE.RingGeometry,
  InstancedMesh: THREE.InstancedMesh, BoxGeometry: THREE.BoxGeometry,
  CylinderGeometry: THREE.CylinderGeometry, MeshStandardMaterial: THREE.MeshStandardMaterial,
  ConeGeometry: THREE.ConeGeometry, OctahedronGeometry: THREE.OctahedronGeometry,
  Points: THREE.Points, BufferGeometry: THREE.BufferGeometry, BufferAttribute: THREE.BufferAttribute,
  PointsMaterial: THREE.PointsMaterial, AmbientLight: THREE.AmbientLight,
  PointLight: THREE.PointLight, CircleGeometry: THREE.CircleGeometry,
  PlaneGeometry: THREE.PlaneGeometry, CubeCamera: THREE.CubeCamera,
  Scene: THREE.Scene, PerspectiveCamera: THREE.PerspectiveCamera,
});
let root: ReturnType<typeof createRoot> | undefined;
let store: { getState: () => RootState } | undefined;
let size: HeroSize;
let controls: HeroControls = { active: false, light: false, released: false };
let drawn = false;
const pointer = { x: 0, y: 0 };
const layout = { compact: false };

function FirstFrame() {
  const notified = useRef(false);
  const lost = useRef(false);
  const frame = useRef(0);
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = (event: Event) => {
      event.preventDefault();
      lost.current = true;
      notified.current = false;
      drawn = false;
      self.postMessage({ type: "loading" });
    };
    const onRestored = () => {
      lost.current = false;
      gl.info.reset();
      store?.getState().setFrameloop(heroFrameLoop(controls, drawn));
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    return () => {
      cancelAnimationFrame(frame.current);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    };
  }, [gl]);
  useFrame(({ gl }) => {
    if (lost.current || notified.current || gl.info.render.calls === 0) return;
    notified.current = true;
    frame.current = requestAnimationFrame(() => {
      if (lost.current) return;
      drawn = true;
      store?.getState().setFrameloop(heroFrameLoop(controls, drawn));
      self.postMessage({ type: "ready" });
    });
  });
  return null;
}

function render() {
  if (!root) return;
  store = root.render(
    <Suspense fallback={null}>
      <HeroArtwork light={controls.light} pointer={pointer} layout={layout} />
      <SceneCompilation />
      <FirstFrame />
    </Suspense>,
  );
}

async function configure() {
  layout.compact = Boolean(size.compact);
  await root?.configure({
    size: { width: size.width, height: size.height, top: 0, left: 0 },
    dpr: size.dpr,
    camera: { position: [0, 0, 9.5], fov: 42, near: 0.1, far: 60 },
    gl: { antialias: true, alpha: true, powerPreference: "high-performance" },
    frameloop: heroFrameLoop(controls, drawn),
  });
}

self.onmessage = async (event: MessageEvent<HeroWorkerMessage>) => {
  try {
    const message = event.data;
    if (message.type === "input") {
      pointer.x = message.x;
      pointer.y = message.y;
      engine.heroProgress = message.progress;
    } else if (message.type === "init") {
      controls = message.controls;
      size = message.size;
      root = createRoot(message.canvas);
      await configure();
      render();
    } else if (message.type === "resize") {
      size = message.size;
      await configure();
    } else {
      const themeChanged = controls.light !== message.controls.light;
      controls = message.controls;
      store?.getState().setFrameloop(heroFrameLoop(controls, drawn));
      if (themeChanged) render();
    }
  } catch {
    self.postMessage({ type: "failed" });
  }
};
