"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { engine } from "@/lib/engine";

const EMBER = "#e9b949";
const TINT = "#39bfff";
const NEUTRAL = "#8a8378";

type Fade = MutableRefObject<number>;

/** Basic material whose opacity follows the shared scroll "fade" value. */
function Basic({ color, base = 1, fade, additive = false, light }: { color: string; base?: number; fade: Fade; additive?: boolean; light: boolean }) {
  const ref = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    if (ref.current) ref.current.opacity = base * fade.current;
  });
  return (
    <meshBasicMaterial
      ref={ref}
      color={color}
      transparent
      opacity={base}
      depthWrite={false}
      toneMapped={false}
      side={THREE.DoubleSide}
      blending={additive && !light ? THREE.AdditiveBlending : THREE.NormalBlending}
    />
  );
}

function makeGlowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  if (g) {
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.25, "rgba(255,255,255,0.35)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const RINGS = [
  { r: 1.15, tube: 0.024, color: EMBER, z: -0.9, op: 1 },
  { r: 1.95, tube: 0.017, color: TINT, z: -0.45, op: 0.9 },
  { r: 2.85, tube: 0.022, color: EMBER, z: 0, op: 0.85 },
  { r: 3.9, tube: 0.015, color: TINT, z: 0.45, op: 0.7 },
  { r: 5.1, tube: 0.012, color: EMBER, z: 0.9, op: 0.3 },
];

function Ring({ r, tube, z, color, op, fade, light }: (typeof RINGS)[number] & { fade: Fade; light: boolean }) {
  return (
    <group position={[0, 0, z]}>
      <mesh>
        <torusGeometry args={[r, tube, 12, 180]} />
        <Basic color={color} base={op} fade={fade} light={light} />
      </mesh>
      {/* soft additive halo = fake bloom */}
      <mesh>
        <torusGeometry args={[r, tube * 5.5, 12, 180]} />
        <Basic color={color} base={op * 0.13} fade={fade} additive light={light} />
      </mesh>
    </group>
  );
}

function Arc({ r, z, start, length, speed, color, fade, light }: { r: number; z: number; start: number; length: number; speed: number; color: string; fade: Fade; light: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += dt * speed;
  });
  return (
    <mesh ref={ref} position={[0, 0, z]} rotation={[0, 0, start]}>
      <ringGeometry args={[r - 0.11, r - 0.05, 72, 1, 0, length]} />
      <Basic color={color} base={0.95} fade={fade} light={light} />
    </mesh>
  );
}

function Ticks({ r, count, z, fade, light }: { r: number; count: number; z: number; fade: Fade; light: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      d.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
      d.rotation.set(0, 0, a - Math.PI / 2);
      d.scale.set(1, i % 6 === 0 ? 2.6 : 1, 1);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [r, count]);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z -= dt * 0.04;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} position={[0, 0, z]}>
      <boxGeometry args={[0.02, 0.13, 0.01]} />
      <Basic color={TINT} base={0.7} fade={fade} light={light} />
    </instancedMesh>
  );
}

/** Low-poly arrow pointing at the camera. */
function Arrow({ light }: { light: boolean }) {
  const shaft = light ? "#2b2620" : "#efe4cf";
  return (
    <group>
      <mesh position={[0, 0, -0.35]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 2.5, 8]} />
        <meshStandardMaterial color={shaft} metalness={0.9} roughness={0.25} flatShading />
      </mesh>
      <mesh position={[0, 0, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.2, 0.72, 6]} />
        <meshStandardMaterial color={EMBER} metalness={0.7} roughness={0.25} flatShading emissive={EMBER} emissiveIntensity={0.55} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <group key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]}>
          <mesh position={[0, 0.17, -1.35]}>
            <boxGeometry args={[0.014, 0.34, 0.56]} />
            <meshStandardMaterial color={TINT} metalness={0.5} roughness={0.35} flatShading emissive={TINT} emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Low-poly shards orbiting the target. */
function Shards() {
  const group = useRef<THREE.Group>(null);
  const shards = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        r: 1.7 + (i % 4) * 0.8,
        a: (i / 10) * Math.PI * 2,
        speed: 0.14 + (i % 3) * 0.06,
        z: ((i % 5) - 2) * 0.32,
        s: 0.07 + (i % 3) * 0.04,
        c: i % 3 === 0 ? TINT : i % 3 === 1 ? EMBER : NEUTRAL,
      })),
    []
  );
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    group.current?.children.forEach((c, i) => {
      const s = shards[i];
      const a = s.a + t * s.speed;
      c.position.set(Math.cos(a) * s.r, Math.sin(a) * s.r, s.z + Math.sin(t + i) * 0.12);
      c.rotation.set(t * 0.7 + i, t * 0.5, 0);
    });
  });
  return (
    <group ref={group}>
      {shards.map((s, i) => (
        <mesh key={i}>
          <octahedronGeometry args={[s.s, 0]} />
          <meshStandardMaterial color={s.c} metalness={0.7} roughness={0.3} flatShading emissive={s.c} emissiveIntensity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/** Drifting ember particles. */
function Embers({ fade, light }: { fade: Fade; light: boolean }) {
  const pts = useRef<THREE.Points>(null);
  const mat = useRef<THREE.PointsMaterial>(null);
  const { positions, colors } = useMemo(() => {
    const n = 520;
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const warm = new THREE.Color(EMBER);
    const gold = new THREE.Color(TINT);
    for (let i = 0; i < n; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14 - 2;
      const c = Math.random() > 0.4 ? warm : gold;
      colors.set([c.r, c.g, c.b], i * 3);
    }
    return { positions, colors };
  }, []);
  useFrame((st, dt) => {
    const p = pts.current;
    if (!p) return;
    const arr = p.geometry.attributes.position.array as Float32Array;
    for (let i = 1; i < arr.length; i += 3) {
      arr[i] += dt * (0.1 + (i % 7) * 0.018);
      if (arr[i] > 8) arr[i] = -8;
    }
    p.geometry.attributes.position.needsUpdate = true;
    p.rotation.y = st.clock.elapsedTime * 0.02;
    if (mat.current) mat.current.opacity = (light ? 0.75 : 0.85) * Math.max(0.3, fade.current);
  });
  return (
    <points ref={pts}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial ref={mat} size={0.05} sizeAttenuation vertexColors transparent depthWrite={false} blending={light ? THREE.NormalBlending : THREE.AdditiveBlending} />
    </points>
  );
}

function Scene({ light }: { light: boolean }) {
  const root = useRef<THREE.Group>(null);
  const rig = useRef<THREE.Group>(null);
  const arrow = useRef<THREE.Group>(null);
  const arrowTilt = useRef<THREE.Group>(null);
  const embers = useRef<THREE.Group>(null);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null);
  const fade = useRef(1);
  const smooth = useRef(0);
  const mouse = useRef({ x: 0, y: 0 });
  const glow = useMemo(() => makeGlowTexture(), []);

  // Window-level pointer so the parallax keeps responding while text overlays the canvas
  useEffect(() => {
    const move = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    // scrub: the pinned hero's scroll progress (0..1), smoothed so it also eases in reverse
    smooth.current = THREE.MathUtils.damp(smooth.current, engine.heroProgress, 4.5, dt);
    const e = smooth.current;
    const ease = e * e * (3 - 2 * e);
    fade.current = 1 - THREE.MathUtils.smoothstep(e, 0.3, 0.9);

    const { x: mx, y: my } = mouse.current;
    const g = root.current;
    if (!g) return;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, mx * 0.32, 3, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -my * 0.22, 3, dt);
    const side = state.viewport.aspect > 1.15 ? state.viewport.width * 0.22 : 0;
    g.scale.setScalar(state.viewport.aspect > 1.15 ? 0.86 : 1);
    g.position.x = THREE.MathUtils.damp(g.position.x, side * (1 - ease) + mx * 0.15, 3, dt);
    g.position.y = THREE.MathUtils.damp(g.position.y, my * 0.1, 3, dt);

    // camera dolly forward (tiny) — the rings rush past it
    state.camera.position.z = THREE.MathUtils.lerp(9.5, 8.3, ease);

    if (rig.current) {
      rig.current.position.z = ease * 11; // rings fly through & past the camera
      rig.current.scale.setScalar(1 + ease * 0.8); // …while expanding
      rig.current.rotation.z = t * 0.05 + ease * 1.4;
    }
    if (arrow.current) {
      arrow.current.position.z = ease * 6.4 + Math.sin(t * 1.1) * 0.06; // flies toward the camera
      arrow.current.position.y = Math.sin(t * 0.8) * 0.08;
      arrow.current.rotation.z = t * 0.45 + ease * Math.PI * 2;
      arrow.current.scale.setScalar(1.45 + ease * 0.7);
    }
    // at rest the arrow is tilted so it reads as an arrow; it straightens to aim at the lens as you scroll
    if (arrowTilt.current) arrowTilt.current.rotation.set(0.5 * (1 - ease), -0.75 * (1 - ease), 0);
    if (embers.current) embers.current.position.z = ease * 6;
    if (glowMat.current) glowMat.current.opacity = (light ? 0.3 : 0.6) * fade.current * (0.9 + Math.sin(t * 1.6) * 0.1);
  });

  return (
    <>
      <ambientLight intensity={light ? 0.9 : 0.35} />
      <pointLight position={[0, 0, 5]} intensity={light ? 60 : 90} color={EMBER} distance={18} decay={2} />
      <pointLight position={[-5, 3, 4]} intensity={40} color={TINT} distance={20} decay={2} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={6} color={EMBER} position={[-4, 2, 3]} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={5} color={TINT} position={[4, -1, 4]} scale={[5, 4, 1]} />
        <Lightformer form="ring" intensity={4} color="#ffffff" position={[0, 5, -2]} scale={4} />
        <Lightformer form="circle" intensity={2} color={NEUTRAL} position={[0, -4, 2]} scale={4} />
      </Environment>

      <group ref={root}>
        <group ref={rig}>
          {RINGS.map((ring) => (
            <Ring key={ring.r} {...ring} fade={fade} light={light} />
          ))}
          <Arc r={1.95} z={-0.45} start={0.4} length={1.6} speed={0.5} color={TINT} fade={fade} light={light} />
          <Arc r={2.85} z={0} start={3.2} length={1.9} speed={-0.38} color={EMBER} fade={fade} light={light} />
          <Arc r={3.9} z={0.45} start={1.4} length={1.3} speed={0.28} color={TINT} fade={fade} light={light} />
          <Arc r={5.1} z={0.9} start={4.4} length={2.1} speed={-0.2} color={EMBER} fade={fade} light={light} />
          <Ticks r={5.6} count={96} z={0.9} fade={fade} light={light} />
          <Ticks r={4.4} count={60} z={0.45} fade={fade} light={light} />

          {/* crosshair */}
          {[
            { p: [2.7, 0, 0], s: [4.4, 0.01, 0.01] },
            { p: [-2.7, 0, 0], s: [4.4, 0.01, 0.01] },
            { p: [0, 2.7, 0], s: [0.01, 4.4, 0.01] },
            { p: [0, -2.7, 0], s: [0.01, 4.4, 0.01] },
          ].map((l, i) => (
            <mesh key={i} position={l.p as [number, number, number]}>
              <boxGeometry args={l.s as [number, number, number]} />
              <Basic color={EMBER} base={0.32} fade={fade} light={light} />
            </mesh>
          ))}

          {/* bullseye */}
          <mesh position={[0, 0, -1.1]}>
            <circleGeometry args={[0.5, 48]} />
            <Basic color={EMBER} base={0.9} fade={fade} light={light} />
          </mesh>
          <mesh position={[0, 0, -1.3]}>
            <planeGeometry args={[9, 9]} />
            <meshBasicMaterial
              ref={glowMat}
              map={glow}
              color={EMBER}
              transparent
              opacity={0.6}
              depthWrite={false}
              toneMapped={false}
              blending={light ? THREE.NormalBlending : THREE.AdditiveBlending}
            />
          </mesh>
          <Shards />
        </group>

        <group ref={arrow}>
          <group ref={arrowTilt}>
            <Arrow light={light} />
          </group>
        </group>
      </group>

      <group ref={embers}>
        <Embers fade={fade} light={light} />
      </group>
    </>
  );
}

export default function HeroScene({ active, light }: { active: boolean; light: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 9.5], fov: 42, near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop={active ? "always" : "never"}
      style={{ position: "absolute", inset: 0 }}
    >
      <Suspense fallback={null}>
        <Scene light={light} />
      </Suspense>
    </Canvas>
  );
}
