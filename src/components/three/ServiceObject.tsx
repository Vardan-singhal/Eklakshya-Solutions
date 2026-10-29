"use client";

import { Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, Lightformer, MeshDistortMaterial, RoundedBox } from "@react-three/drei";
import type { ServiceKind } from "@/data/siteData";

const C = { ember: "#e9b949", tint: "#39bfff", neutral: "#8a8378", cream: "#efe4cf", ink: "#1b1814" };

/** Globe: dark core, wireframe shell and an orbiting satellite ring. */
function WebObj() {
  const orbit = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (orbit.current) orbit.current.rotation.y += dt * 0.7;
  });
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.85, 48, 48]} />
        <meshStandardMaterial color={C.ink} metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[1.05, 2]} />
        <meshBasicMaterial color={C.ember} wireframe transparent opacity={0.85} />
      </mesh>
      <group rotation={[0.5, 0, 0.3]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.55, 0.016, 12, 128]} />
          <meshBasicMaterial color={C.tint} />
        </mesh>
        <group ref={orbit}>
          {[0, 2.1, 4.2].map((a) => (
            <mesh key={a} position={[Math.cos(a) * 1.55, 0, Math.sin(a) * 1.55]}>
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshBasicMaterial color={C.tint} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

/** Phone with a lit UI. */
function AppObj() {
  return (
    <group rotation={[0.1, -0.5, 0.05]}>
      <RoundedBox args={[1.25, 2.4, 0.16]} radius={0.17} smoothness={5}>
        <meshStandardMaterial color={C.ink} metalness={0.9} roughness={0.25} />
      </RoundedBox>
      <mesh position={[0, 0, 0.085]}>
        <planeGeometry args={[1.07, 2.2]} />
        <meshBasicMaterial color="#0d0c0a" />
      </mesh>
      <mesh position={[0, 0.62, 0.09]}>
        <planeGeometry args={[0.86, 0.72]} />
        <meshBasicMaterial color={C.ember} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, -0.12 - i * 0.34, 0.09]}>
          <planeGeometry args={[0.86 - i * 0.16, 0.15]} />
          <meshBasicMaterial color={i === 0 ? C.tint : C.cream} transparent opacity={i === 0 ? 1 : 0.55} />
        </mesh>
      ))}
    </group>
  );
}

/** Chip with a glowing core and pins. */
function SoftwareObj() {
  const pins = useMemo(() => {
    const out: { p: [number, number, number]; s: [number, number, number] }[] = [];
    for (let i = 0; i < 8; i++) {
      const v = -0.8 + i * 0.23;
      out.push({ p: [v, 1.05, 0], s: [0.09, 0.22, 0.05] }, { p: [v, -1.05, 0], s: [0.09, 0.22, 0.05] });
      out.push({ p: [1.05, v, 0], s: [0.22, 0.09, 0.05] }, { p: [-1.05, v, 0], s: [0.22, 0.09, 0.05] });
    }
    return out;
  }, []);
  return (
    <group rotation={[-0.9, 0, 0.6]}>
      <RoundedBox args={[1.9, 1.9, 0.26]} radius={0.06} smoothness={4}>
        <meshStandardMaterial color={C.ink} metalness={0.8} roughness={0.35} />
      </RoundedBox>
      <mesh position={[0, 0, 0.15]}>
        <boxGeometry args={[1.15, 1.15, 0.06]} />
        <meshStandardMaterial color={C.ember} emissive={C.ember} emissiveIntensity={0.45} metalness={0.6} roughness={0.3} />
      </mesh>
      {pins.map((p, i) => (
        <mesh key={i} position={p.p}>
          <boxGeometry args={p.s} />
          <meshStandardMaterial color={C.tint} metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
      <mesh position={[0, 0, -0.55]}>
        <boxGeometry args={[1.9, 1.9, 0.04]} />
        <meshBasicMaterial color={C.neutral} wireframe />
      </mesh>
    </group>
  );
}

/** Stacked hex layers = multi-tenant SaaS. */
function SaasObj() {
  const g = useRef<THREE.Group>(null);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    g.current?.children.forEach((c, i) => {
      c.position.y = (i - 1.5) * 0.45 + Math.sin(t * 1.4 + i) * 0.06;
      c.rotation.y = t * 0.25 * (i % 2 ? 1 : -1) + i * 0.4;
    });
  });
  const cols = [C.neutral, C.cream, C.tint, C.ember];
  return (
    <group ref={g} rotation={[0.35, 0, 0]}>
      {cols.map((c, i) => (
        <mesh key={i}>
          <cylinderGeometry args={[1.15 - i * 0.08, 1.15 - i * 0.08, 0.22, 6]} />
          <meshStandardMaterial color={c} metalness={0.7} roughness={0.3} flatShading emissive={c} emissiveIntensity={i === 3 ? 0.55 : 0.08} />
        </mesh>
      ))}
    </group>
  );
}

/** Open book with a page that keeps turning. */
function CatalogueObj() {
  const flip = useRef<THREE.Group>(null);
  useFrame((st) => {
    if (flip.current) flip.current.rotation.y = -(0.5 - 0.5 * Math.cos(st.clock.elapsedTime * 0.9)) * Math.PI * 0.96;
  });
  return (
    <group rotation={[0.55, -0.3, 0]}>
      <mesh position={[0, 0, -0.07]}>
        <boxGeometry args={[2.7, 1.85, 0.08]} />
        <meshStandardMaterial color={C.ink} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[-0.62, 0, 0]} rotation={[0, 0.1, 0]}>
        <boxGeometry args={[1.2, 1.65, 0.07]} />
        <meshStandardMaterial color={C.cream} roughness={0.7} />
      </mesh>
      <mesh position={[0.62, 0, 0]} rotation={[0, -0.1, 0]}>
        <boxGeometry args={[1.2, 1.65, 0.07]} />
        <meshStandardMaterial color={C.cream} roughness={0.7} />
      </mesh>
      <mesh position={[0.62, 0.35, 0.045]}>
        <planeGeometry args={[0.9, 0.5]} />
        <meshBasicMaterial color={C.ember} />
      </mesh>
      <group ref={flip} position={[0, 0, 0.07]}>
        <mesh position={[0.6, 0, 0]}>
          <boxGeometry args={[1.18, 1.6, 0.015]} />
          <meshStandardMaterial color={C.tint} roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

/** Liquid generative blob with sparkles. */
function ImageObj() {
  return (
    <group>
      <mesh>
        <icosahedronGeometry args={[1.1, 10]} />
        <MeshDistortMaterial color={C.tint} distort={0.42} speed={2} roughness={0.12} metalness={0.7} />
      </mesh>
      {[
        [1.45, 0.9, 0],
        [-1.4, -0.7, 0.3],
        [0.2, 1.5, -0.2],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} rotation={[i, i * 2, 0]}>
          <octahedronGeometry args={[0.16 + i * 0.03, 0]} />
          <meshStandardMaterial color={C.ember} emissive={C.ember} emissiveIntensity={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** Rising bar chart topped with an arrow. */
function SeoObj() {
  const g = useRef<THREE.Group>(null);
  const hs = [0.7, 1.05, 1.5, 1.95];
  const cols = [C.neutral, C.cream, C.tint, C.ember];
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    g.current?.children.forEach((c, i) => {
      c.scale.y = 0.88 + 0.12 * Math.sin(t * 1.6 + i * 0.7);
    });
  });
  return (
    <group rotation={[0.2, -0.6, 0]} position={[0, -1.1, 0]}>
      <group ref={g}>
        {hs.map((h, i) => (
          <group key={i} position={[-0.95 + i * 0.62, 0, 0]}>
            <mesh position={[0, h / 2, 0]}>
              <boxGeometry args={[0.46, h, 0.46]} />
              <meshStandardMaterial color={cols[i]} metalness={0.6} roughness={0.3} />
            </mesh>
          </group>
        ))}
      </group>
      <mesh position={[0.91, 2.5, 0]}>
        <coneGeometry args={[0.2, 0.45, 6]} />
        <meshStandardMaterial color={C.ember} emissive={C.ember} emissiveIntensity={0.9} flatShading />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.7, 0.012, 8, 100]} />
        <meshBasicMaterial color={C.tint} />
      </mesh>
    </group>
  );
}

const OBJECTS: Record<ServiceKind, () => ReactNode> = {
  web: () => <WebObj />,
  app: () => <AppObj />,
  software: () => <SoftwareObj />,
  saas: () => <SaasObj />,
  catalogue: () => <CatalogueObj />,
  image: () => <ImageObj />,
  seo: () => <SeoObj />,
};

/** Tilts toward the pointer while hovering the canvas, floats gently otherwise. */
function Rig({ children }: { children: ReactNode }) {
  const tilt = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const target = useRef({ x: 0, y: 0 });
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const el = gl.domElement;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      target.current.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    };
    const leave = () => {
      target.current.x = 0;
      target.current.y = 0;
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [gl]);

  useFrame((st, dt) => {
    const t = tilt.current;
    const s = spin.current;
    if (!t || !s) return;
    t.rotation.y = THREE.MathUtils.damp(t.rotation.y, target.current.x * 0.7, 4, dt);
    t.rotation.x = THREE.MathUtils.damp(t.rotation.x, -target.current.y * 0.5, 4, dt);
    s.rotation.y = Math.sin(st.clock.elapsedTime * 0.5) * 0.45;
  });

  return (
    <group ref={tilt}>
      <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.7}>
        <group ref={spin}>{children}</group>
      </Float>
    </group>
  );
}

export default function ServiceObject({ kind, light }: { kind: ServiceKind; light: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5.6], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={light ? 0.9 : 0.45} />
        <pointLight position={[3, 3, 4]} intensity={50} color={C.ember} distance={16} decay={2} />
        <pointLight position={[-3, -2, 3]} intensity={30} color={C.tint} distance={16} decay={2} />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={5} color={C.ember} position={[-3, 2, 3]} scale={[5, 3, 1]} />
          <Lightformer form="rect" intensity={4} color={C.tint} position={[3, -1, 3]} scale={[4, 3, 1]} />
          <Lightformer form="ring" intensity={3} color="#ffffff" position={[0, 4, -2]} scale={3} />
        </Environment>
        <Rig>{OBJECTS[kind]()}</Rig>
      </Suspense>
    </Canvas>
  );
}
