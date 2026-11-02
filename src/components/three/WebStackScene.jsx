"use client";

/** Updated 3D scene from website three.js/src/WebStackScene.jsx.
 * Preview page styling, DOM overlays, and HUD controls stay outside the service card. */
import { useCallback, useEffect, useMemo, useRef, useReducer, useSyncExternalStore } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

/* -------------------------------------------------------------------------- */
/*  Theme + data                                                              */
/* -------------------------------------------------------------------------- */

const DEFAULT_GOLD = '#f5c451';
const DEFAULT_CYAN = '#6cc7e8';
const CYCLE_MS = 3200;
const TAU = Math.PI * 2;
// Stable procedural dust across React rerenders and theme changes.
const dustSample = (seed) => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};

const PLATE_W = 3.3;
const PLATE_D = 1.4;

/** Plate heights when the card is at rest / exploded. */
const COLLAPSED_Y = [0.78, 0.26, -0.26, -0.78];
const EXPANDED_Y = [1.18, 0.39, -0.4, -1.19];

const LABEL_Y = 0.11;

export const LAYERS = [
  {
    n: '01',
    short: 'FRONTEND',
    name: 'Frontend',
    tag: 'UI',
    tech: 'React · Tailwind CSS',
    desc: 'Custom responsive UI built mobile-first with Tailwind CSS.',
  },
  {
    n: '02',
    short: 'API',
    name: 'API',
    tag: 'Logic',
    tech: 'Node.js · Express',
    desc: 'REST or GraphQL APIs with Node.js, Express or PHP.',
  },
  {
    n: '03',
    short: 'DATABASE',
    name: 'Database',
    tag: 'Data',
    tech: 'MongoDB · MySQL',
    desc: 'Structured and document stores, modelled and indexed for speed.',
  },
  {
    n: '04',
    short: 'DEPLOY',
    name: 'Deploy',
    tag: 'Ops',
    tech: 'Vercel · CI/CD',
    desc: 'Continuous delivery to a global edge network, shipped with confidence.',
  },
];

/* -------------------------------------------------------------------------- */
/*  Procedural textures                                                       */
/* -------------------------------------------------------------------------- */

/** Soft radial white glow. Tinted per-material, reused for every dot. */
function createGlowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.42, 'rgba(255,255,255,0.24)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Diagonal glass sheen, laid over each plate to catch the scene light. */
function createSheenTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, size, size * 0.75);
  g.addColorStop(0, 'rgba(255,255,255,0.22)');
  g.addColorStop(0.22, 'rgba(255,255,255,0.03)');
  g.addColorStop(0.42, 'rgba(255,255,255,0)');
  g.addColorStop(0.66, 'rgba(255,255,255,0.06)');
  g.addColorStop(0.8, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(255,255,255,0.04)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Monospace glass label pill. Colours are baked in for crisp legibility. */
function createLabelTexture(layer, gold = DEFAULT_GOLD, cyan = DEFAULT_CYAN) {
  const W = 900;
  const H = 248;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const mono = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';

  ctx.clearRect(0, 0, W, H);

  // Glass pill
  const r = 42;
  const x = 6;
  const y = 6;
  const w = W - 12;
  const h = H - 12;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = 'rgba(9, 8, 6, 0.82)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(245, 196, 81, 0.34)';
  ctx.stroke();

  // Accent tick
  ctx.fillStyle = gold;
  ctx.fillRect(42, 56, 6, 136);

  // Index
  ctx.font = `600 30px ${mono}`;
  ctx.fillStyle = 'rgba(245, 196, 81, 0.75)';
  ctx.fillText(layer.n, 74, 104);

  // Title (tracked)
  ctx.font = `700 50px ${mono}`;
  ctx.fillStyle = '#f6f0e4';
  const tracked = layer.short.split('').join('\u200a');
  ctx.fillText(tracked, 140, 104);

  // Tech line
  ctx.font = `500 26px ${mono}`;
  ctx.fillStyle = 'rgba(108, 199, 232, 0.92)';
  ctx.fillText(layer.tech.toUpperCase(), 74, 160);

  // Corner brackets
  ctx.strokeStyle = 'rgba(245, 196, 81, 0.5)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(W - 58, 34);
  ctx.lineTo(W - 34, 34);
  ctx.lineTo(W - 34, 58);
  ctx.moveTo(W - 58, H - 34);
  ctx.lineTo(W - 34, H - 34);
  ctx.lineTo(W - 34, H - 58);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/* -------------------------------------------------------------------------- */
/*  Primitive helpers                                                         */
/* -------------------------------------------------------------------------- */

/** A flat "glass" panel with a crisp wireframe edge. */
function Frame({
  w,
  h,
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  edge,
  fill = '#0a0806',
  fillOpacity = 0.55,
  edgeOpacity = 0.55,
}) {
  const edges = useMemo(() => {
    const plane = new THREE.PlaneGeometry(w, h);
    const edges = new THREE.EdgesGeometry(plane);
    plane.dispose();
    return edges;
  }, [w, h]);
  useEffect(() => () => edges.dispose(), [edges]);

  return (
    <group position={pos} rotation={rot}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          color={fill}
          transparent
          opacity={fillOpacity}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={edge} transparent opacity={edgeOpacity} depthWrite={false} />
      </lineSegments>
    </group>
  );
}

/** Additive glow sprite. */
function Glow({ color, size = 0.2, opacity = 0.8, position = [0, 0, 0], map }) {
  return (
    <sprite position={position} scale={[size, size, 1]} renderOrder={3}>
      <spriteMaterial
        map={map}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </sprite>
  );
}

function useDisposableGeometry(factory, deps) {
  // Geometry factories supply their own dependency arrays.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  const geo = useMemo(factory, deps);
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

/* -------------------------------------------------------------------------- */
/*  01 — Frontend                                                             */
/* -------------------------------------------------------------------------- */

function FrontendLayer({ gold, cyan, glowMap }) {
  const floatRef = useRef();
  const chipRef = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (floatRef.current) {
      floatRef.current.position.y = 0.325 + Math.sin(t * 0.9 + 1.4) * 0.022;
      floatRef.current.rotation.y = -0.42 + Math.sin(t * 0.45) * 0.07;
    }
    if (chipRef.current) {
      chipRef.current.position.y = 0.2 + Math.sin(t * 0.7 + 3) * 0.018;
      chipRef.current.rotation.z = 0.1 + Math.sin(t * 0.55 + 0.8) * 0.05;
    }
  });

  return (
    <group position={[0, 0.02, 0]}>
      {/* Browser frame */}
      <group position={[-0.14, 0.28, -0.04]}>
        <Frame w={0.96} h={0.5} edge={gold} edgeOpacity={0.72} fillOpacity={0.6} />
        <mesh position={[0, 0.2, 0.002]}>
          <planeGeometry args={[0.96, 0.055]} />
          <meshBasicMaterial color={gold} transparent opacity={0.14} depthWrite={false} />
        </mesh>
        {[-0.4, -0.335, -0.27].map((x) => (
          <mesh key={x} position={[x, 0.2, 0.004]}>
            <circleGeometry args={[0.011, 8]} />
            <meshBasicMaterial color={cyan} transparent opacity={0.85} depthWrite={false} />
          </mesh>
        ))}
        <mesh position={[0.32, 0.2, 0.004]}>
          <planeGeometry args={[0.16, 0.008]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.35} depthWrite={false} />
        </mesh>

        {/* Content skeleton */}
        <mesh position={[-0.2, 0.095, 0.004]}>
          <planeGeometry args={[0.4, 0.032]} />
          <meshBasicMaterial color={gold} transparent opacity={0.85} depthWrite={false} />
        </mesh>
        <mesh position={[-0.26, 0.035, 0.004]}>
          <planeGeometry args={[0.28, 0.016]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.42} depthWrite={false} />
        </mesh>
        <mesh position={[-0.29, -0.015, 0.004]}>
          <planeGeometry args={[0.22, 0.016]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.28} depthWrite={false} />
        </mesh>
        <mesh position={[-0.24, -0.09, 0.004]}>
          <planeGeometry args={[0.32, 0.075]} />
          <meshBasicMaterial color={cyan} wireframe transparent opacity={0.3} depthWrite={false} />
        </mesh>

        {/* Preview card */}
        <Frame
          w={0.28}
          h={0.16}
          pos={[0.28, 0.02, 0.004]}
          edge={cyan}
          edgeOpacity={0.6}
          fillOpacity={0.08}
        />
        <mesh position={[0.24, 0.055, 0.006]}>
          <planeGeometry args={[0.12, 0.012]} />
          <meshBasicMaterial color={gold} transparent opacity={0.8} depthWrite={false} />
        </mesh>
      </group>

      {/* Floating UI card */}
      <group ref={floatRef} position={[0.55, 0.325, 0.24]}>
        <Frame w={0.36} h={0.26} edge={cyan} edgeOpacity={0.8} fillOpacity={0.5} />
        <mesh position={[-0.045, 0.055, 0.004]}>
          <planeGeometry args={[0.18, 0.018]} />
          <meshBasicMaterial color={gold} transparent opacity={0.9} depthWrite={false} />
        </mesh>
        <mesh position={[-0.075, 0.005, 0.004]}>
          <planeGeometry args={[0.12, 0.012]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.5} depthWrite={false} />
        </mesh>
        <mesh position={[-0.075, -0.035, 0.004]}>
          <planeGeometry args={[0.15, 0.012]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.3} depthWrite={false} />
        </mesh>
        <Glow color={cyan} size={0.12} opacity={0.9} position={[0.12, 0.075, 0.01]} map={glowMap} />
      </group>

      {/* Small glass chip */}
      <group ref={chipRef} position={[-0.66, 0.2, 0.28]}>
        <Frame w={0.3} h={0.2} edge={gold} edgeOpacity={0.5} fillOpacity={0.38} />
        <mesh position={[0, 0.035, 0.004]}>
          <planeGeometry args={[0.16, 0.01]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.55} depthWrite={false} />
        </mesh>
        <mesh position={[0, -0.005, 0.004]}>
          <planeGeometry args={[0.11, 0.01]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.3} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  02 — API                                                                  */
/* -------------------------------------------------------------------------- */

function ApiPulse({ nodes, cyan, glowMap, phase }) {
  const ref = useRef();

  useFrame((state) => {
    if (!ref.current) return;
    const t = (state.clock.elapsedTime * 0.22 + phase) % 1;
    const scaled = t * nodes.length;
    const i = Math.floor(scaled) % nodes.length;
    const f = scaled - Math.floor(scaled);
    const node = nodes[i];
    ref.current.position.set(node.x * f, node.y, node.z * f);
    const eased = Math.sin(f * Math.PI);
    ref.current.scale.setScalar(0.1 + eased * 0.08);
    if (ref.current.material) ref.current.material.opacity = 0.15 + eased * 0.8;
  });

  return (
    <sprite ref={ref} renderOrder={3}>
      <spriteMaterial
        map={glowMap}
        color={cyan}
        transparent
        opacity={0.6}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </sprite>
  );
}

function ApiLayer({ gold, cyan, glowMap }) {
  const wheel = useRef();

  /* Nodes sit on two staggered shells with vertical offsets, so the network
     reads as a volumetric constellation rather than an edge-on flat ring. */
  const nodes = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * TAU + 0.35;
        const outer = i % 2 === 0;
        return new THREE.Vector3(
          Math.cos(a) * (outer ? 0.42 : 0.3),
          0.14 + Math.sin(i * 1.9) * 0.13,
          Math.sin(a) * (outer ? 0.3 : 0.21),
        );
      }),
    [],
  );

  const hub = new THREE.Vector3(0, 0.3, 0);

  const cables = useDisposableGeometry(() => {
    const pts = [];
    nodes.forEach((n, i) => {
      pts.push(hub.x, hub.y, hub.z, n.x, n.y, n.z);
      const next = nodes[(i + 1) % nodes.length];
      pts.push(n.x, n.y, n.z, next.x, next.y, next.z);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [nodes]);


  useFrame((state) => {
    if (wheel.current) wheel.current.rotation.y = state.clock.elapsedTime * 0.12;
  });

  return (
    <group position={[0, 0, 0]}>
      <group ref={wheel}>
        <lineSegments geometry={cables} renderOrder={2}>
          <lineBasicMaterial color={cyan} transparent opacity={0.38} depthWrite={false} />
        </lineSegments>

        {/* Vertical risers add readable structure */}
        {nodes.map((n, i) => (
          <mesh key={`riser-${i}`} position={[n.x, (n.y + 0.06) / 2, n.z]}>
            <boxGeometry args={[0.003, n.y - 0.06, 0.003]} />
            <meshBasicMaterial color={gold} transparent opacity={0.3} depthWrite={false} />
          </mesh>
        ))}

        {nodes.map((n, i) => (
          <group key={i} position={[n.x, n.y, n.z]}>
            <mesh>
              <sphereGeometry args={[i % 2 ? 0.018 : 0.024, 10, 10]} />
              <meshBasicMaterial color={gold} transparent opacity={0.95} />
            </mesh>
            {i % 2 === 0 && <Glow color={gold} size={0.11} opacity={0.45} map={glowMap} />}
          </group>
        ))}

        {/* Axis hub */}
        <mesh position={hub.toArray()} rotation={[0.4, 0.4, 0]}>
          <octahedronGeometry args={[0.062, 0]} />
          <meshBasicMaterial color={cyan} wireframe transparent opacity={0.9} />
        </mesh>
        <Glow color={cyan} size={0.26} opacity={0.55} position={hub.toArray()} map={glowMap} />
      </group>

      {[0, 0.34, 0.68].map((phase) => (
        <ApiPulse key={phase} nodes={nodes} cyan={cyan} glowMap={glowMap} phase={phase} />
      ))}

      {/* Base reticle */}
      <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.44, 0.445, 64]} />
        <meshBasicMaterial color={gold} transparent opacity={0.24} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  03 — Database                                                             */
/* -------------------------------------------------------------------------- */

function DatabaseLayer({ gold, cyan }) {
  const rotor = useRef();

  const discs = useMemo(
    () => [
      { y: 0.13, r: 0.42, o: 0.42 },
      { y: 0.24, r: 0.34, o: 0.55 },
      { y: 0.35, r: 0.26, o: 0.7 },
    ],
    [],
  );

  useFrame((state) => {
    if (rotor.current) rotor.current.rotation.y = state.clock.elapsedTime * 0.32;
  });

  return (
    <group>
      <group ref={rotor}>
        {discs.map((d, i) => (
          <group key={i} position={[0, d.y, 0]}>
            <mesh>
              <cylinderGeometry args={[d.r, d.r, 0.07, 14, 1, true]} />
              <meshBasicMaterial color={gold} wireframe transparent opacity={d.o} depthWrite={false} />
            </mesh>
            <mesh position={[0, 0.036, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[d.r, 40]} />
              <meshBasicMaterial color={gold} transparent opacity={0.06} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 0.037, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[d.r - 0.006, d.r, 64]} />
              <meshBasicMaterial color={cyan} transparent opacity={0.6} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}

        {/* Query sparks */}
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            position={[
              Math.cos(i * 2.1) * 0.3,
              0.2 + i * 0.11,
              Math.sin(i * 2.1) * 0.3,
            ]}
          >
            <sphereGeometry args={[0.014, 8, 8]} />
            <meshBasicMaterial color={cyan} transparent opacity={0.9} />
          </mesh>
        ))}
      </group>

      {/* Axle + plinth */}
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.46, 6]} />
        <meshBasicMaterial color={cyan} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.49, 0.495, 72]} />
        <meshBasicMaterial color={gold} transparent opacity={0.3} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  04 — Deploy                                                               */
/* -------------------------------------------------------------------------- */

function DeployLayer({ gold, cyan, glowMap }) {
  const ico = useRef();
  const orbit = useRef();
  const node = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ico.current) {
      ico.current.rotation.y = t * 0.38;
      ico.current.rotation.x = Math.sin(t * 0.25) * 0.25;
    }
    if (orbit.current) orbit.current.rotation.z = t * 0.5;
    if (node.current) node.current.scale.setScalar(1 + Math.sin(t * 2.2) * 0.16);
  });

  const halo = useDisposableGeometry(() => {
    const pts = [];
    const count = 44;
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * TAU;
      pts.push(Math.cos(a) * 0.54, 0, Math.sin(a) * 0.28);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);

  return (
    <group position={[0, 0.01, 0]}>
      <mesh ref={ico} position={[0, 0.31, 0]}>
        <icosahedronGeometry args={[0.27, 1]} />
        <meshBasicMaterial color={gold} wireframe transparent opacity={0.9} />
      </mesh>

      <group ref={orbit} position={[0, 0.31, 0]} rotation={[0.72, 0.18, 0.34]}>
        <mesh>
          <torusGeometry args={[0.42, 0.0045, 6, 120]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.72} depthWrite={false} />
        </mesh>
        <group ref={node} position={[0.42, 0, 0]}>
          <Glow color={cyan} size={0.24} opacity={0.85} map={glowMap} />
          <mesh>
            <sphereGeometry args={[0.018, 10, 10]} />
            <meshBasicMaterial color={cyan} />
          </mesh>
        </group>
      </group>

      <group position={[0, 0.31, 0]}>
        <points geometry={halo}>
          <pointsMaterial
            color={gold}
            size={0.03}
            sizeAttenuation
            transparent
            opacity={0.65}
            depthWrite={false}
            map={glowMap}
            alphaTest={0.01}
          />
        </points>
      </group>

      <Glow color={cyan} size={0.62} opacity={0.14} position={[0, 0.31, 0]} map={glowMap} />
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.36, 0.365, 64]} />
        <meshBasicMaterial color={cyan} transparent opacity={0.3} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shared scene furniture                                                    */
/* -------------------------------------------------------------------------- */

/** Data packet climbing the centre pipeline. */
function Packet({ offset, cyan, glowMap }) {
  const ref = useRef();
  const glowMat = useRef();
  const START = -1.62;
  const END = 1.78;

  useFrame((state) => {
    const t = (state.clock.elapsedTime * 0.115 + offset) % 1;
    if (ref.current) {
      ref.current.position.y = THREE.MathUtils.lerp(START, END, t);
      ref.current.position.x = Math.sin(t * 16 + offset * 9) * 0.018;
    }
    if (glowMat.current) {
      glowMat.current.opacity = 0.15 + Math.sin(Math.PI * t) * 0.8;
    }
  });

  return (
    <group ref={ref} position={[0, START, 0]}>
      <sprite scale={[0.19, 0.19, 1]} renderOrder={4}>
        <spriteMaterial
          ref={glowMat}
          map={glowMap}
          color={cyan}
          transparent
          opacity={0.62}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
      <mesh>
        <sphereGeometry args={[0.013, 8, 8]} />
        <meshBasicMaterial color="#dff7ff" transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function Pipeline({ cyan, gold, glowMap }) {
  return (
    <group position={[1.5, 0, 0.18]}>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.0045, 0.0045, 3.4, 5]} />
        <meshBasicMaterial color={cyan} transparent opacity={0.32} depthWrite={false} />
      </mesh>
      {[1.78, -1.62].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[0, Math.PI / 4, 0]}>
          <octahedronGeometry args={[0.035, 0]} />
          <meshBasicMaterial color={gold} transparent opacity={0.85} />
        </mesh>
      ))}
      {[0.08, 0.34, 0.6, 0.84].map((offset) => (
        <Packet key={offset} offset={offset} cyan={cyan} glowMap={glowMap} />
      ))}
    </group>
  );
}

/** Large tilted orbit ring with two travelling nodes + dotted halo + crosshairs. */
function OrbitSystem({ cyan, gold, glowMap }) {
  const nodeA = useRef();
  const nodeB = useRef();
  const haloRef = useRef();

  const ringA = useMemo(() => [1.2, 0.16, -0.36], []);
  const ringB = useMemo(() => [1.42, -0.34, 0.22], []);
  const RADIUS = 2.28;

  const haloGeo = useDisposableGeometry(() => {
    const pts = [];
    const count = 168;
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * TAU;
      pts.push(Math.cos(a) * 2.7, Math.sin(a) * 2.7, 0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);

  const crossGeo = useDisposableGeometry(() => {
    const pts = [
      -3.05, 0, 0, 3.05, 0, 0,
      0, -2.6, 0, 0, 2.6, 0,
    ];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (nodeA.current) {
      nodeA.current.position.set(Math.cos(t * 0.32) * RADIUS, Math.sin(t * 0.32) * RADIUS, 0);
    }
    if (nodeB.current) {
      nodeB.current.position.set(
        Math.cos(-t * 0.24 + 2.4) * RADIUS,
        Math.sin(-t * 0.24 + 2.4) * RADIUS,
        0,
      );
    }
    if (haloRef.current) haloRef.current.rotation.z = t * 0.035;
  });

  return (
    <group>
      {/* Crosshairs */}
      <lineSegments geometry={crossGeo} position={[0, 0, -1.4]}>
        <lineBasicMaterial color={gold} transparent opacity={0.2} depthWrite={false} />
      </lineSegments>

      {/* Dotted halo facing the viewer */}
      <points ref={haloRef} geometry={haloGeo} position={[0, 0, -1.2]}>
        <pointsMaterial
          color={gold}
          size={0.042}
          sizeAttenuation
          transparent
          opacity={0.65}
          depthWrite={false}
          map={glowMap}
          alphaTest={0.01}
        />
      </points>

      {/* Secondary ghost ring */}
      <group rotation={ringB} position={[0, 0, -0.9]}>
        <mesh>
          <torusGeometry args={[2.48, 0.0038, 5, 200]} />
          <meshBasicMaterial color={gold} transparent opacity={0.22} depthWrite={false} />
        </mesh>
      </group>

      {/* Primary cyan orbit */}
      <group rotation={ringA} position={[0, 0, -0.25]}>
        <mesh>
          <torusGeometry args={[RADIUS, 0.0058, 6, 240]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.46} depthWrite={false} />
        </mesh>

        <group ref={nodeA}>
          <sprite scale={[0.3, 0.3, 1]} renderOrder={4}>
            <spriteMaterial
              map={glowMap}
              color={cyan}
              transparent
              opacity={0.55}
              depthWrite={false}
              depthTest={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </sprite>
          <mesh>
            <sphereGeometry args={[0.026, 12, 12]} />
            <meshBasicMaterial color={cyan} />
          </mesh>
        </group>

        <group ref={nodeB} scale={0.8}>
          <sprite scale={[0.24, 0.24, 1]} renderOrder={4}>
            <spriteMaterial
              map={glowMap}
              color={gold}
              transparent
              opacity={0.42}
              depthWrite={false}
              depthTest={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </sprite>
          <mesh>
            <sphereGeometry args={[0.021, 10, 10]} />
            <meshBasicMaterial color={gold} transparent opacity={0.85} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** Gold + cyan dust motes drifting behind the stack. */
function Dust({ gold, cyan, glowMap }) {
  const goldRef = useRef();
  const cyanRef = useRef();

  const makeCloud = (count) => {
    const pts = [];
    for (let i = 0; i < count; i += 1) {
      pts.push(
        (dustSample(i * 3) - 0.5) * 15,
        (dustSample(i * 3 + 1) - 0.5) * 8.5,
        -0.6 - dustSample(i * 3 + 2) * 4.2,
      );
    }
    return pts;
  };

  const goldGeo = useDisposableGeometry(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(makeCloud(220), 3));
    return g;
  }, []);

  const cyanGeo = useDisposableGeometry(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(makeCloud(70), 3));
    return g;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (goldRef.current) {
      goldRef.current.rotation.y = t * 0.014;
      goldRef.current.position.y = Math.sin(t * 0.2) * 0.06;
    }
    if (cyanRef.current) {
      cyanRef.current.rotation.y = -t * 0.02;
      cyanRef.current.position.y = Math.cos(t * 0.16) * 0.05;
    }
  });

  return (
    <group>
      <points ref={goldRef} geometry={goldGeo}>
        <pointsMaterial
          color={gold}
          size={0.038}
          sizeAttenuation
          transparent
          opacity={0.5}
          depthWrite={false}
          map={glowMap}
          alphaTest={0.01}
        />
      </points>
      <points ref={cyanRef} geometry={cyanGeo}>
        <pointsMaterial
          color={cyan}
          size={0.03}
          sizeAttenuation
          transparent
          opacity={0.28}
          depthWrite={false}
          map={glowMap}
          alphaTest={0.01}
        />
      </points>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Layer shell                                                               */
/* -------------------------------------------------------------------------- */

function StackLayer({
  index,
  active,
  hovered,
  expanded,
  gold,
  cyan,
  labelTexture,
  glowMap,
  sheenMap,
  onHover,
  onSelect,
  children,
}) {
  const group = useRef();
  const inner = useRef();
  const content = useRef();
  const edgeMat = useRef();
  const fillMat = useRef();
  const sweepMat = useRef();
  const labelMat = useRef();
  const labelGlow = useRef();
  const scanRef = useRef();
  const scanMatRef = useRef();
  const edgeAccentMat = useRef();

  const yRef = useRef(COLLAPSED_Y[index] ?? 0);
  const scaleRef = useRef(1);
  const gainRef = useRef(0.55);
  const materials = useRef([]);
  const colors = useMemo(
    () => ({
      gold: new THREE.Color(gold),
      cyan: new THREE.Color(cyan),
      dim: new THREE.Color('#7a6742'),
      fill: new THREE.Color('#120e0a'),
    }),
    [gold, cyan],
  );

  /* Cache content materials once so we can dim inactive layers smoothly. */
  useEffect(() => {
    const list = [];
    content.current?.traverse((obj) => {
      const mat = obj.material;
      if (!mat || Array.isArray(mat) || obj.isSprite) return;
      if (mat.transparent) list.push({ mat, base: mat.opacity });
    });
    materials.current = list;
  }, []);

  const plateEdges = useMemo(
    () => {
      const box = new THREE.BoxGeometry(PLATE_W, 0.03, PLATE_D);
      const edges = new THREE.EdgesGeometry(box);
      box.dispose();
      return edges;
    },
    [],
  );
  useEffect(() => () => plateEdges.dispose(), [plateEdges]);

  const cornerGeo = useMemo(() => {
    const w = PLATE_W / 2;
    const d = PLATE_D / 2;
    const L = 0.2;
    const y = 0.018;
    const pts = [];
    [-1, 1].forEach((sx) => {
      pts.push(sx * w, y, d, sx * (w - L), y, d);
      pts.push(sx * w, y, d, sx * w, y, d - L);
      pts.push(sx * w, y, -d, sx * (w - L), y, -d);
      pts.push(sx * w, y, -d, sx * w, y, -d + L);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  useEffect(() => () => cornerGeo.dispose(), [cornerGeo]);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const targetY =
      (expanded ? EXPANDED_Y[index] : COLLAPSED_Y[index]) +
      (hovered ? 0.12 : 0) +
      Math.sin(t * 0.8 + index * 1.64) * 0.014;

    yRef.current = THREE.MathUtils.damp(yRef.current, targetY, 5.2, d);
    scaleRef.current = THREE.MathUtils.damp(scaleRef.current, hovered ? 1.035 : 1, 7, d);
    gainRef.current = THREE.MathUtils.damp(
      gainRef.current,
      hovered ? 1 : active ? 1 : 0.5,
      5,
      d,
    );

    if (group.current) {
      group.current.position.y = yRef.current;
      group.current.scale.setScalar(scaleRef.current);
    }
    if (inner.current) {
      inner.current.position.y = Math.sin(t * 0.7 + index * 2.1) * 0.012;
    }

    const edgeTarget = hovered ? colors.cyan : active ? colors.gold : colors.dim;
    const edgeOpacity = hovered ? 0.95 : active ? 0.75 : 0.4;

    if (edgeMat.current) {
      edgeMat.current.color.lerp(edgeTarget, 1 - Math.exp(-9 * d));
      edgeMat.current.opacity = THREE.MathUtils.damp(
        edgeMat.current.opacity,
        edgeOpacity,
        8,
        d,
      );
    }
    if (fillMat.current) {
      fillMat.current.color.lerp(hovered ? colors.cyan : colors.gold, 1 - Math.exp(-8 * d));
      fillMat.current.opacity = THREE.MathUtils.damp(
        fillMat.current.opacity,
        hovered ? 0.055 : active ? 0.05 : 0.03,
        8,
        d,
      );
    }
    if (sweepMat.current) {
      sweepMat.current.color.lerp(edgeTarget, 1 - Math.exp(-9 * d));
      sweepMat.current.opacity = THREE.MathUtils.damp(
        sweepMat.current.opacity,
        hovered ? 0.7 : active ? 0.48 : 0.14,
        8,
        d,
      );
    }
    if (labelMat.current) {
      labelMat.current.opacity = THREE.MathUtils.damp(
        labelMat.current.opacity,
        hovered ? 1 : active ? 0.98 : 0.62,
        8,
        d,
      );
    }
    if (labelGlow.current) {
      labelGlow.current.material.opacity = THREE.MathUtils.damp(
        labelGlow.current.material.opacity,
        hovered ? 0.3 : active ? 0.15 : 0,
        7,
        d,
      );
    }
    if (edgeAccentMat.current) {
      edgeAccentMat.current.opacity = THREE.MathUtils.damp(
        edgeAccentMat.current.opacity,
        hovered ? 0.9 : active ? 0.55 : 0.16,
        7,
        d,
      );
    }
    if (scanRef.current && scanMatRef.current) {
      const p = (t * 0.24 + index * 0.27) % 1;
      scanRef.current.position.x = -1.45 + p * 2.9;
      scanMatRef.current.opacity =
        (hovered ? 0.55 : active ? 0.3 : 0.09) * Math.sin(Math.PI * p);
    }

    for (let i = 0; i < materials.current.length; i += 1) {
      const entry = materials.current[i];
      entry.mat.opacity = entry.base * gainRef.current;
    }
  });

  return (
    <group ref={group} position={[0, COLLAPSED_Y[index], 0]}>
      <group ref={inner}>
        {/* Glass plate */}
        <mesh>
          <boxGeometry args={[PLATE_W, 0.03, PLATE_D]} />
          <meshBasicMaterial
            ref={fillMat}
            color={gold}
            transparent
            opacity={0.05}
            depthWrite={false}
          />
        </mesh>
        <lineSegments geometry={plateEdges}>
          <lineBasicMaterial ref={edgeMat} color={gold} transparent opacity={0.45} />
        </lineSegments>
        <lineSegments geometry={cornerGeo}>
          <lineBasicMaterial color={gold} transparent opacity={0.4} depthWrite={false} />
        </lineSegments>

        {/* Glass sheen (sits just above the top face) */}
        <mesh position={[0, 0.017, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[PLATE_W * 0.98, PLATE_D * 0.96]} />
          <meshBasicMaterial
            map={sheenMap}
            color="#ffffff"
            transparent
            opacity={hovered ? 0.085 : 0.055}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Front edge sweep */}
        <mesh position={[0, 0, PLATE_D / 2 + 0.003]}>
          <boxGeometry args={[PLATE_W * 0.98, 0.012, 0.006]} />
          <meshBasicMaterial ref={sweepMat} color={gold} transparent opacity={0.4} depthWrite={false} />
        </mesh>

        {/* Label pill + gold bloom */}
        <sprite ref={labelGlow} position={[-0.9, LABEL_Y, 0.3]} scale={[1.7, 0.55, 1]} renderOrder={2}>
          <spriteMaterial
            map={glowMap}
            color={gold}
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
        <sprite position={[-0.9, LABEL_Y, 0.31]} scale={[1.44, 0.397, 1]} renderOrder={3}>
          <spriteMaterial
            ref={labelMat}
            map={labelTexture}
            color="#ffffff"
            transparent
            opacity={0.75}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>

        {/* Status tick + feed line to the data pipeline */}
        <mesh position={[0, 0, PLATE_D / 2 + 0.006]}>
          <planeGeometry args={[PLATE_W * 0.52, 0.004]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.25} depthWrite={false} />
        </mesh>
        <mesh position={[PLATE_W / 2 - 0.1, 0, 0.18]}>
          <boxGeometry args={[0.3, 0.006, 0.006]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.5} depthWrite={false} />
        </mesh>

        {/* Active edge accent + travelling scan highlight */}
        <mesh position={[-PLATE_W / 2 - 0.004, 0.008, 0]}>
          <boxGeometry args={[0.012, 0.05, PLATE_D]} />
          <meshBasicMaterial
            ref={edgeAccentMat}
            color={cyan}
            transparent
            opacity={0.2}
            depthWrite={false}
          />
        </mesh>
        <group ref={scanRef} position={[-1.4, 0.022, PLATE_D / 2 + 0.012]}>
          <mesh>
            <planeGeometry args={[0.34, 0.03]} />
            <meshBasicMaterial
              ref={scanMatRef}
              color={cyan}
              transparent
              opacity={0.18}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>

        {/* Layer graphic */}
        <group ref={content} scale={0.82} position={[0.82, 0.02, 0]}>
          {children}
        </group>
      </group>

      {/* Invisible hit volume — one clean event target per layer, so moving
          across the plate content never flickers the hover state. */}
      <mesh
        position={[0, 0.1, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta > 5) return;
          onSelect(index);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(index);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(null);
        }}
      >
        <boxGeometry args={[PLATE_W + 0.08, 0.48, PLATE_D + 0.16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Camera + parallax                                                         */
/* -------------------------------------------------------------------------- */

function FitCamera() {
  const { camera, size } = useThree();

  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1);
    const base =
      aspect < 1.25
        ? 5.95 * Math.pow(1.25 / Math.max(aspect, 0.52), 0.5)
        : 6.9;
    const z = Math.min(base, 11.4);
    camera.position.set(0, 1.28, z);
    if (camera.lookAt) camera.lookAt(0, -0.12, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);

  return null;
}

function ParallaxRig({ enabled, children }) {
  const ref = useRef();
  const { pointer } = useThree();

  useFrame((_, delta) => {
    if (!ref.current) return;
    const d = Math.min(delta, 0.05);
    const targetX = enabled ? pointer.y * 0.035 : 0;
    const targetY = enabled ? pointer.x * 0.075 : 0;
    ref.current.rotation.x = THREE.MathUtils.damp(ref.current.rotation.x, targetX, 2.4, d);
    ref.current.rotation.y = THREE.MathUtils.damp(ref.current.rotation.y, targetY, 2.4, d);
  });

  return <group ref={ref}>{children}</group>;
}

/* -------------------------------------------------------------------------- */
/*  Scene assembly                                                            */
/* -------------------------------------------------------------------------- */

function SceneContent({
  gold,
  cyan,
  active,
  hovered,
  expanded,
  onHover,
  onSelect,
  canRotate,
  enableParallax,
}) {
  const glowMap = useMemo(() => createGlowTexture(), []);
  const sheenMap = useMemo(() => createSheenTexture(), []);
  const labelTextures = useMemo(
    () => LAYERS.map((layer) => createLabelTexture(layer, gold, cyan)),
    [gold, cyan],
  );

  useEffect(
    () => () => {
      glowMap.dispose();
      sheenMap.dispose();
    },
    [glowMap, sheenMap],
  );

  useEffect(() => () => labelTextures.forEach((texture) => texture.dispose()), [labelTextures]);

  return (
    <>
      <OrbitControls
        makeDefault
        enabled={canRotate}
        target={[0, 0.05, 0]}
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.32}
        minPolarAngle={Math.PI * 0.3}
        maxPolarAngle={Math.PI * 0.68}
      />

      <ParallaxRig enabled={enableParallax && canRotate}>
        <group position={[0, 0.3, 0]}>
          <Dust gold={gold} cyan={cyan} glowMap={glowMap} />
          <OrbitSystem gold={gold} cyan={cyan} glowMap={glowMap} />

          {/* Soft atmosphere */}
          <Glow color={gold} size={7.2} opacity={0.08} position={[0.6, 0.2, -3.1]} map={glowMap} />
          <Glow color={cyan} size={4.4} opacity={0.07} position={[-1.8, -1.1, -2.6]} map={glowMap} />

          <Pipeline gold={gold} cyan={cyan} glowMap={glowMap} />

          {/* Grounding ellipse — gives the floating stack a stage */}
          <mesh position={[0, -1.2, 0.1]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.95, 0.95, 1]}>
            <ringGeometry args={[0.985, 1, 128]} />
            <meshBasicMaterial color={gold} transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -1.2, 0.1]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.62, 0.78, 1]}>
            <circleGeometry args={[1, 64]} />
            <meshBasicMaterial color={gold} transparent opacity={0.025} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <Glow color={gold} size={3.4} opacity={0.055} position={[0, -1.1, -0.5]} map={glowMap} />

          {LAYERS.map((layer, i) => (
            <StackLayer
              key={layer.n}
              index={i}
              active={active === i}
              hovered={hovered === i}
              expanded={expanded}
              gold={gold}
              cyan={cyan}
              labelTexture={labelTextures[i]}
              glowMap={glowMap}
              sheenMap={sheenMap}
              onHover={onHover}
              onSelect={onSelect}
            >
              {i === 0 && <FrontendLayer gold={gold} cyan={cyan} glowMap={glowMap} />}
              {i === 1 && <ApiLayer gold={gold} cyan={cyan} glowMap={glowMap} />}
              {i === 2 && <DatabaseLayer gold={gold} cyan={cyan} glowMap={glowMap} />}
              {i === 3 && <DeployLayer gold={gold} cyan={cyan} glowMap={glowMap} />}
            </StackLayer>
          ))}
        </group>
      </ParallaxRig>

      <FitCamera />
    </>
  );
}


const initialState = { active: 0, hovered: null, expanded: false, locked: false, paused: false };
function sceneReducer(state, action) {
  switch (action.type) {
    case 'hover': return { ...state, hovered: action.index };
    case 'enter': return { ...state, expanded: true };
    case 'leave': return { ...state, expanded: false, hovered: null };
    case 'advance': return { ...state, active: (state.active + 1) % LAYERS.length };
    case 'select': {
      const locked = !(state.locked && state.active === action.index);
      return { ...state, active: action.index, locked, paused: false };
    }
    case 'pause': return { ...state, locked: false, paused: !state.paused };
    case 'resume': return { ...state, locked: false, paused: false };
    default: return state;
  }
}

function subscribePreferences(callback) {
  const media = [window.matchMedia('(pointer: coarse)'), window.matchMedia('(prefers-reduced-motion: reduce)')];
  media.forEach((query) => query.addEventListener('change', callback));
  return () => media.forEach((query) => query.removeEventListener('change', callback));
}
const getCoarseSnapshot = () => window.matchMedia('(pointer: coarse)').matches;
const getReducedSnapshot = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const getServerSnapshot = () => true;

export default function WebStackScene({ light = false }) {
  const [state, dispatch] = useReducer(sceneReducer, initialState);
  const coarse = useSyncExternalStore(subscribePreferences, getCoarseSnapshot, getServerSnapshot);
  const reduced = useSyncExternalStore(subscribePreferences, getReducedSnapshot, getServerSnapshot);
  const gold = light ? '#b87d14' : DEFAULT_GOLD;
  const cyan = light ? '#0077b6' : DEFAULT_CYAN;
  const onHover = useCallback((index) => dispatch({ type: 'hover', index }), []);
  const onSelect = useCallback((index) => dispatch({ type: 'select', index }), []);

  useEffect(() => {
    if (state.locked || state.paused || state.expanded || state.hovered !== null || reduced) return;
    const id = window.setInterval(() => dispatch({ type: 'advance' }), CYCLE_MS);
    return () => window.clearInterval(id);
  }, [state.locked, state.paused, state.expanded, state.hovered, reduced]);

  return (
    <div
      className="absolute inset-0"
      tabIndex={0}
      role="region"
      aria-label="Interactive web development stack visualization"
      onPointerEnter={(event) => { if (event.pointerType !== 'touch') dispatch({ type: 'enter' }); }}
      onPointerLeave={() => dispatch({ type: 'leave' })}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          onSelect((state.active + 1) % LAYERS.length);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          onSelect((state.active - 1 + LAYERS.length) % LAYERS.length);
        } else if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          dispatch({ type: 'pause' });
        } else if (event.key === 'Escape') {
          dispatch({ type: 'resume' });
        }
      }}
    >
      <Canvas
        flat
        dpr={[1, 1.5]}
        camera={{ position: [0, 1.5, 8.2], fov: 38, near: 0.1, far: 60 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ position: 'absolute', inset: 0, background: 'transparent', touchAction: coarse ? 'pan-y' : 'none' }}
      >
        <SceneContent
          gold={gold} cyan={cyan} active={state.active} hovered={state.hovered}
          expanded={state.expanded || (coarse && state.locked)}
          onHover={onHover} onSelect={onSelect} canRotate={!coarse}
          enableParallax={!reduced}
        />
      </Canvas>
    </div>
  );
}
