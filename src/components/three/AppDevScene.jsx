"use client";

import { SceneViewport } from "./SceneViewport";
import { ResponsiveOrbitControls as OrbitControls } from "./ResponsiveOrbitControls";

import { ScenePreparation } from "./ScenePreparation";
import { servicePixelRatio } from "./useGraphics";
import { SceneCompilation } from "./SceneCompilation";
import { SceneWarmup } from "./SceneWarmup";

/** 3D model adapted from app three.js/src/AppDevScene.jsx.
 * The existing service card owns the page layout, labels, and decoration. */
import {
  useRef, useState, useEffect, useMemo, useCallback, useReducer, useSyncExternalStore,
} from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";

/* ----------------------------------------------------------------------------
   Shared helpers
---------------------------------------------------------------------------- */

const dustSample = (seed) => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};
const lerp = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;
const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeInOut = (t) => t * t * (3 - 2 * t);

/** Points on a circle arc in the XY plane */
function arcPoints(radius, segments, start = 0, end = Math.PI * 2, z = 0) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = start + (end - start) * (i / segments);
    pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, z));
  }
  return pts;
}

/** Points of a rounded rectangle outline in the XY plane */
function roundedRectPoints(w, h, r, segPerCorner = 8) {
  const pts = [];
  const hw = w / 2 - r, hh = h / 2 - r;
  const corners = [
    [hw, hh, 0],                 // top-right
    [-hw, hh, Math.PI / 2],      // top-left
    [-hw, -hh, Math.PI],         // bottom-left
    [hw, -hh, Math.PI * 1.5],    // bottom-right
  ];
  corners.forEach(([cx, cy, a0]) => {
    for (let i = 0; i <= segPerCorner; i++) {
      const a = a0 + (Math.PI / 2) * (i / segPerCorner);
      pts.push(new THREE.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0));
    }
  });
  return pts;
}

/** Cheap raw THREE.LineLoop / Line (1px, perfect for the thin premium look) */
function ThinLine({ points, color, opacity = 1, loop = false, ...rest }) {
  const obj = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(points);
    const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    return loop ? new THREE.LineLoop(g, m) : new THREE.Line(g, m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, loop]);
  useEffect(() => {
    obj.material.setValues({ color, opacity });
  }, [color, opacity, obj]);
  useEffect(() => () => { obj.geometry.dispose(); obj.material.dispose(); }, [obj]);
  return <primitive object={obj} {...rest} />;
}

/* ----------------------------------------------------------------------------
   Feature copy
---------------------------------------------------------------------------- */

const FEATURE_COUNT = 4;

/** Camera-following rim light so the rear panel stays legible */
function RigLight({ gold, cyan }) {
  const l = useRef();
  useFrame(({ camera }) => {
    if (!l.current) return;
    l.current.position.copy(camera.position).multiplyScalar(0.55);
    l.current.position.y += 1.5;
  });
  return (
    <>
      <directionalLight ref={l} intensity={1.6} color="#fff2d6" />
      <pointLight position={[2.6, -2.2, -2.4]} intensity={1.1} color={cyan} distance={9} />
    </>
  );
}

/* ============================================================================
   GOLD DUST — subtle drifting particles
   ============================================================================ */

function GoldDust({ gold }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const n = 110, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 1.6 + dustSample(i * 4) * 2.8;
      const a = dustSample(i * 4 + 1) * Math.PI * 2;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = (dustSample(i * 4 + 2) - 0.5) * 6.5;
      arr[i * 3 + 2] = (dustSample(i * 4 + 3) - 0.5) * 3 - 0.4;
    }
    return arr;
  }, []);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.03;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={gold} size={0.022} transparent opacity={0.45}
        sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false}
      />
    </points>
  );
}

/* ============================================================================
   FEATURE 01 — THE PHONE  (redesigned + enhanced)
   ----------------------------------------------------------------------------
   · layered chassis: dark metal body inside a polished gold frame rail
   · glazed edge-to-edge screen with sheen + cyan halo on hover
   · dynamic island (iOS) ⇄ punch-hole (Android) morph
   · physical side keys, antenna lines, chamfered gold edges
   · detailed rear panel: camera island + lenses, gold monogram, fine print
   · FOUR feature-specific screen layouts, crossfaded in 3D
   ============================================================================ */

const PHONE = { w: 1.94, h: 4.02, d: 0.24 };
const SCR = { w: 1.78, h: 3.84, r: 0.15 };
const SCR_Z = PHONE.d / 2 + 0.012;   // glass surface
const UI_Z = SCR_Z + 0.045;          // UI layer baseline

const INK = "#07070a";
const PANEL = "#151312";
const PANEL2 = "#1c1915";
const GREY = "#8a8781";
const DIM = "#4d4a44";
const HAIR = "#2e2a24";

/* Pre-computed outlines / curves (module scope = zero per-frame allocation) */
const PTS = {
  hole: arcPoints(0.075, 24),
  ring: arcPoints(0.05, 20),
  avatar: arcPoints(0.105, 24),
  bezel: roundedRectPoints(1.82, 3.88, 0.18, 10),
  silhouette: roundedRectPoints(1.94, 4.02, 0.2, 12),
  screenEdge: roundedRectPoints(1.70, 3.76, 0.13, 10),
  heroBorder: roundedRectPoints(1.46, 1.0, 0.06, 6),
  banner: roundedRectPoints(1.46, 0.3, 0.07, 6),
  row: roundedRectPoints(1.46, 0.34, 0.07, 6),
  card: roundedRectPoints(1.46, 0.68, 0.1, 6),
  battery: roundedRectPoints(0.2, 0.09, 0.02, 4),
  wifiA: arcPoints(0.075, 10, Math.PI * 0.22, Math.PI * 0.78),
  wifiB: arcPoints(0.045, 8, Math.PI * 0.22, Math.PI * 0.78),
  backLensOuter: arcPoints(0.135, 28),
  backLensInner: arcPoints(0.09, 22),
  backLogoTick: arcPoints(0.3, 40, 0.4, 2.5),
  backNfc: arcPoints(0.16, 20, -0.7, 0.8),
  railL: [new THREE.Vector3(-0.973, -1.5, 0.04), new THREE.Vector3(-0.973, 1.5, 0.04)],
  railR: [new THREE.Vector3(0.973, -1.5, 0.04), new THREE.Vector3(0.973, 1.5, 0.04)],
  iconRing: arcPoints(0.92, 36),
  jaw: [new THREE.Vector3(-0.62, -2.015, 0.02), new THREE.Vector3(0.62, -2.015, 0.02)],
};

/* ---------------------------------------------------------------------------
   Soft additive glow (procedural shader — no textures, no post-processing)
--------------------------------------------------------------------------- */
const GLOW_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const GLOW_FRAG = `uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
  void main(){
    float d = distance(vUv, vec2(0.5));
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor, a * a * uOpacity);
  }`;

function SoftGlow({ color = "#6cc7e8", opacity = 0.3, scale = [6, 7], position = [0, 0, -1] }) {
  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: opacity },
  }), [color, opacity]);
  return (
    <mesh position={position} scale={[scale[0], scale[1], 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        vertexShader={GLOW_VERT} fragmentShader={GLOW_FRAG} uniforms={uniforms}
        transparent depthWrite={false} blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/* ---------------------------------------------------------------------------
   Pulse ring — expands behind the phone on every screen action
--------------------------------------------------------------------------- */
function PulseRing({ trigger, gold, cyan }) {
  const a = useRef(); const b = useRef();
  const ma = useRef(); const mb = useRef();
  const t = useRef(1.1);
  useEffect(() => { t.current = 0; }, [trigger]);

  useFrame((_, dt) => {
    if (t.current >= 1.1) {
      if (a.current) a.current.visible = false;
      if (b.current) b.current.visible = false;
      return;
    }
    t.current = Math.min(1.1, t.current + dt * 0.85);
    const e1 = easeInOut(clamp(t.current, 0, 1));
    const e2 = easeInOut(clamp((t.current - 0.14) / 0.96, 0, 1));
    if (a.current) {
      a.current.visible = true;
      a.current.scale.setScalar(0.85 + e1 * 2.15);
      if (ma.current) ma.current.opacity = 0.4 * (1 - e1);
    }
    if (b.current && e2 > 0) {
      b.current.visible = true;
      b.current.scale.setScalar(0.7 + e2 * 1.7);
      if (mb.current) mb.current.opacity = 0.3 * (1 - e2);
    }
  });

  return (
    <group position={[0, 0, -0.85]}>
      <mesh ref={a} visible={false}>
        <ringGeometry args={[1.55, 1.58, 100]} />
        <meshBasicMaterial ref={ma} color={cyan} transparent opacity={0} side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={b} visible={false}>
        <ringGeometry args={[2.05, 2.07, 100]} />
        <meshBasicMaterial ref={mb} color={gold} transparent opacity={0} side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ---------------------------------------------------------------------------
   Screen layer — crossfades one feature screen with opacity + pop
--------------------------------------------------------------------------- */
function ScreenLayer({ active, z = 0, children }) {
  const g = useRef();
  const fade = useRef(0);
  const mats = useRef([]);

  useEffect(() => {
    const list = [];
    g.current.traverse((o) => {
      if (!o.material) return;
      o.material.transparent = true;
      if (o.material.userData.base === undefined) o.material.userData.base = o.material.opacity;
      list.push(o.material);
    });
    mats.current = list;
  }, []);

  useFrame((_, dt) => {
    if (!g.current) return;
    fade.current = lerp(fade.current, active ? 1 : 0, 1 - Math.pow(0.0025, dt));
    const f = fade.current;
    const op = easeInOut(clamp(f, 0, 1));
    g.current.visible = f > 0.015;
    mats.current.forEach((m) => { m.opacity = (m.userData.base ?? 1) * op; });
    g.current.position.z = z + op * 0.014;
    g.current.position.y = (1 - op) * -0.06;
    g.current.scale.setScalar(0.98 + op * 0.02);
  });

  return <group ref={g} position={[0, 0, z]} visible={false}>{children}</group>;
}

/* ---------------------------------------------------------------------------
   Tiny UI primitives
--------------------------------------------------------------------------- */
function UIBar({ position = [0, 0, 0], size = [0.4, 0.05], color = GREY, opacity = 1, radius = 0 }) {
  if (radius > 0) {
    return (
      <RoundedBox args={[size[0], size[1], 0.014]} radius={radius} smoothness={2} position={position}>
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </RoundedBox>
    );
  }
  return (
    <mesh position={position}>
      <boxGeometry args={[size[0], size[1], 0.014]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

function Dot({ position, color, r = 0.035, opacity = 1 }) {
  return (
    <mesh position={position}>
      <circleGeometry args={[r, 16]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

/* ---------------------------------------------------------------------------
   Reusable CTA bar (clickable → the phone "reacts")
--------------------------------------------------------------------------- */
function ScreenCta({ position, gold, cyan, onAction }) {
  const g = useRef();
  const [hover, setHover] = useState(false);


  useFrame((_, dt) => {
    if (!g.current) return;
    const s = lerp(g.current.scale.x, hover ? 1.025 : 1, 1 - Math.pow(0.002, dt));
    g.current.scale.set(s, s, 1);
  });

  return (
    <group
      ref={g} position={position}
      onClick={(e) => { e.stopPropagation(); if (onAction) onAction(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
      onPointerOut={() => setHover(false)}
    >
      <mesh position={[0, 0, -0.02]} scale={[1.5, 2.4, 1]}>
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial color={cyan} transparent opacity={hover ? 0.2 : 0.11}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <RoundedBox args={[1.46, 0.21, 0.03]} radius={0.105} smoothness={4}>
        <meshBasicMaterial color={cyan} />
      </RoundedBox>
      <UIBar position={[-0.14, 0, 0.022]} size={[0.4, 0.052]} color="#06222c" opacity={0.9} />
      <UIBar position={[-0.24, 0, 0.022]} size={[0.1, 0.038]} color="#06222c" opacity={0.4} />
      <mesh position={[0.43, 0, 0.022]}>
        <circleGeometry args={[0.05, 3]} />
        <meshBasicMaterial color="#06222c" />
      </mesh>
      <mesh position={[0.37, 0, 0.022]}>
        <planeGeometry args={[0.06, 0.022]} />
        <meshBasicMaterial color="#06222c" />
      </mesh>
    </group>
  );
}

/* ---------------------------------------------------------------------------
   Shared screen chrome: status bar, header, tabs, home bar
--------------------------------------------------------------------------- */
function ScreenStatus({ cyan }) {
  return (
    <group position={[0, 1.62, UI_Z + 0.012]}>
      <UIBar position={[-0.66, 0, 0]} size={[0.2, 0.045]} color="#cfcac0" opacity={0.85} />
      <ThinLine points={PTS.wifiA} color="#cfcac0" opacity={0.65} position={[0.33, -0.03, 0]} />
      <ThinLine points={PTS.wifiB} color="#cfcac0" opacity={0.65} position={[0.33, -0.03, 0]} />
      {[0.032, 0.052, 0.072].map((h, i) => (
        <mesh key={i} position={[0.46 + i * 0.045, -0.045 + h / 2, 0]}>
          <boxGeometry args={[0.025, h, 0.01]} />
          <meshBasicMaterial color="#cfcac0" transparent opacity={0.8} />
        </mesh>
      ))}
      <ThinLine points={PTS.battery} color={cyan} opacity={0.6} loop position={[0.68, 0, 0.004]} />
      <mesh position={[0.655, 0, 0.006]}>
        <planeGeometry args={[0.13, 0.05]} />
        <meshBasicMaterial color={cyan} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0.79, 0, 0.004]}>
        <boxGeometry args={[0.022, 0.032, 0.01]} />
        <meshBasicMaterial color={cyan} transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

function ScreenHeader({ gold, cyan }) {
  return (
    <group position={[0, 1.35, UI_Z + 0.012]}>
      <RoundedBox args={[0.26, 0.26, 0.022]} radius={0.07} smoothness={3} position={[-0.64, 0, 0]}>
        <meshBasicMaterial color={gold} />
      </RoundedBox>
      <mesh position={[-0.685, 0, 0.017]}><boxGeometry args={[0.022, 0.13, 0.01]} /><meshBasicMaterial color={INK} /></mesh>
      <mesh position={[-0.635, 0.05, 0.017]}><boxGeometry args={[0.09, 0.022, 0.01]} /><meshBasicMaterial color={INK} /></mesh>
      <mesh position={[-0.64, 0, 0.017]}><boxGeometry args={[0.08, 0.022, 0.01]} /><meshBasicMaterial color={INK} /></mesh>
      <mesh position={[-0.635, -0.05, 0.017]}><boxGeometry args={[0.09, 0.022, 0.01]} /><meshBasicMaterial color={INK} /></mesh>
      <UIBar position={[-0.26, 0.055, 0]} size={[0.44, 0.05]} color="#dcd8ce" opacity={0.9} />
      <UIBar position={[-0.37, -0.045, 0]} size={[0.22, 0.038]} color={DIM} />
      <group position={[0.48, 0, 0]}>
        <mesh position={[0, 0.025, 0]}>
          <sphereGeometry args={[0.085, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <meshBasicMaterial color={gold} wireframe transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, -0.065, 0]}><boxGeometry args={[0.11, 0.016, 0.012]} /><meshBasicMaterial color={gold} /></mesh>
        <Dot position={[0.07, 0.085, 0.012]} color={cyan} r={0.026} />
      </group>
      <group position={[0.7, 0, 0]}>
        <mesh><circleGeometry args={[0.115, 24]} /><meshBasicMaterial color="#232220" /></mesh>
        <mesh position={[0, 0.02, 0.006]}>
          <sphereGeometry args={[0.05, 10, 8]} /><meshBasicMaterial color="#5a564e" />
        </mesh>
        <mesh position={[0, -0.075, 0.006]}>
          <circleGeometry args={[0.06, 14, 0, Math.PI]} /><meshBasicMaterial color="#5a564e" />
        </mesh>
        <ThinLine points={PTS.avatar} color={cyan} opacity={0.8} loop position={[0, 0, 0.008]} />
      </group>
    </group>
  );
}

function ScreenChrome({ cyan }) {
  const tabs = [-0.6, -0.2, 0.2, 0.6];
  return (
    <group>
      <group position={[0, -1.62, UI_Z + 0.014]}>
        <mesh position={[0, -0.01, -0.006]}>
          <planeGeometry args={[1.48, 0.012]} />
          <meshBasicMaterial color={HAIR} transparent opacity={0.9} />
        </mesh>
        {tabs.map((x, i) => (
          <group key={i} position={[x, 0.08, 0]}>
            {i === 0 ? (
              <>
                <mesh><circleGeometry args={[0.045, 16]} /><meshBasicMaterial color={cyan} /></mesh>
                <mesh position={[0, -0.075, 0]}>
                  <boxGeometry args={[0.11, 0.018, 0.01]} /><meshBasicMaterial color={cyan} transparent opacity={0.7} />
                </mesh>
              </>
            ) : i === 1 ? (
              <>
                <mesh position={[0, 0.005, 0]}>
                  <boxGeometry args={[0.075, 0.075, 0.01]} /><meshBasicMaterial color="#33302b" />
                </mesh>
                <ThinLine points={PTS.ring} color={GREY} opacity={0.5} loop position={[0, 0, 0.004]} />
              </>
            ) : i === 2 ? (
              <>
                <mesh position={[0, 0, 0]}><circleGeometry args={[0.045, 16]} /><meshBasicMaterial color="#33302b" /></mesh>
                <Dot position={[0.03, 0.03, 0.004]} color="#4a463f" r={0.02} />
              </>
            ) : (
              <>
                <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <circleGeometry args={[0.045, 3]} /><meshBasicMaterial color="#33302b" />
                </mesh>
                <Dot position={[-0.025, -0.025, 0.004]} color="#4a463f" r={0.018} />
              </>
            )}
          </group>
        ))}
      </group>
      <mesh position={[0, -1.855, UI_Z + 0.01]}>
        <boxGeometry args={[0.46, 0.04, 0.012]} />
        <meshBasicMaterial color="#3a3833" />
      </mesh>
    </group>
  );
}

/* ---------------------------------------------------------------------------
   01 · CROSS-PLATFORM — hero artwork, platform switch, CTA
--------------------------------------------------------------------------- */
function ContentCrossPlatform({ gold, cyan, platform, onAction }) {
  const knob = useRef();
  useFrame((_, dt) => {
    if (!knob.current) return;
    const target = platform === "android" ? 0.19 : -0.19;
    knob.current.position.x = lerp(knob.current.position.x, target, 1 - Math.pow(0.002, dt));
  });

  return (
    <group>
      {/* hero artwork — abstract editorial gold field */}
      <group position={[0, 0.55, UI_Z]}>
        <RoundedBox args={[1.46, 1.0, 0.026]} radius={0.06} smoothness={3}>
          <meshBasicMaterial color={gold} />
        </RoundedBox>

        {/* fine grid */}
        {[-0.42, -0.14, 0.14, 0.42].map((x) => (
          <mesh key={`v${x}`} position={[x, 0, 0.016]}>
            <planeGeometry args={[0.005, 1]} /><meshBasicMaterial color="#7c5f20" transparent opacity={0.35} />
          </mesh>
        ))}
        {[-0.26, 0, 0.26].map((y) => (
          <mesh key={`h${y}`} position={[0, y, 0.016]}>
            <planeGeometry args={[1.46, 0.005]} /><meshBasicMaterial color="#7c5f20" transparent opacity={0.2} />
          </mesh>
        ))}

        {/* orbital refraction rings + star */}
        <mesh position={[0.05, -0.11, 0.02]} rotation={[0, 0, 0.22]}>
          <torusGeometry args={[0.42, 0.006, 6, 56]} />
          <meshBasicMaterial color="#8a6722" transparent opacity={0.85} />
        </mesh>
        <mesh position={[0.05, -0.11, 0.019]} rotation={[0, 0, -0.35]}>
          <torusGeometry args={[0.6, 0.005, 6, 64]} />
          <meshBasicMaterial color="#fff0c4" transparent opacity={0.5} />
        </mesh>
        <mesh position={[0.05, -0.11, 0.024]}>
          <ringGeometry args={[0.115, 0.122, 40]} />
          <meshBasicMaterial color="#332408" transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0.05, -0.11, 0.026]}>
          <circleGeometry args={[0.048, 24]} />
          <meshBasicMaterial color="#fff6dc" />
        </mesh>
        <group position={[-0.52, 0.3, 0.026]}>
          <mesh><circleGeometry args={[0.045, 4]} /><meshBasicMaterial color="#fff8e0" /></mesh>
          <mesh rotation={[0, 0, Math.PI / 4]}><circleGeometry args={[0.03, 4]} /><meshBasicMaterial color="#fff8e0" /></mesh>
        </group>

        {/* bottom scrim + caption */}
        <mesh position={[0, -0.34, 0.028]}>
          <planeGeometry args={[1.46, 0.32]} />
          <meshBasicMaterial color="#1d1405" transparent opacity={0.55} />
        </mesh>
        <UIBar position={[-0.36, -0.3, 0.034]} size={[0.56, 0.062]} color="#fff4d6" opacity={0.95} />
        <UIBar position={[-0.43, -0.4, 0.034]} size={[0.38, 0.042]} color="#d9b466" opacity={0.8} />

        {/* cyan tag + gloss border */}
        <RoundedBox args={[0.34, 0.135, 0.024]} radius={0.045} smoothness={2} position={[0.52, 0.37, 0.03]}>
          <meshBasicMaterial color={cyan} />
        </RoundedBox>
        <UIBar position={[0.52, 0.37, 0.045]} size={[0.17, 0.035]} color="#082b36" />
        <ThinLine points={PTS.heroBorder} color="#fff3d2" opacity={0.45} loop position={[0, 0, 0.036]} />
      </group>

      {/* platform switch */}
      <group position={[-0.35, -0.24, UI_Z]}>
        <RoundedBox args={[0.82, 0.2, 0.024]} radius={0.1} smoothness={3}>
          <meshBasicMaterial color={PANEL2} />
        </RoundedBox>
        <group ref={knob} position={[-0.19, 0, 0.018]}>
          <RoundedBox args={[0.38, 0.155, 0.022]} radius={0.078} smoothness={3}>
            <meshBasicMaterial color="#3a3120" />
          </RoundedBox>
        </group>
        <group position={[-0.19, 0, 0.035]}>
          <mesh><circleGeometry args={[0.042, 16]} /><meshBasicMaterial color={gold} /></mesh>
          <mesh position={[0, 0.052, 0]}><boxGeometry args={[0.022, 0.03, 0.01]} /><meshBasicMaterial color="#3a3120" /></mesh>
          <UIBar position={[-0.075, 0, 0]} size={[0.06, 0.032]} color={gold} opacity={0.85} />
        </group>
        <group position={[0.19, 0, 0.035]}>
          <mesh rotation={[0, 0, Math.PI / 2]}><circleGeometry args={[0.042, 3]} /><meshBasicMaterial color={cyan} /></mesh>
          <UIBar position={[0.075, 0, 0]} size={[0.06, 0.032]} color={cyan} opacity={0.85} />
        </group>
      </group>

      {/* dual-build badge */}
      <group position={[0.47, -0.24, UI_Z]}>
        <RoundedBox args={[0.36, 0.2, 0.024]} radius={0.06} smoothness={3}>
          <meshBasicMaterial color={PANEL} />
        </RoundedBox>
        <Dot position={[-0.09, 0, 0.02]} color={cyan} r={0.032} />
        <UIBar position={[0.055, 0.025, 0.02]} size={[0.15, 0.032]} color={GREY} />
        <UIBar position={[0.02, -0.03, 0.02]} size={[0.09, 0.028]} color={DIM} />
      </group>

      <ScreenCta position={[0, -0.62, UI_Z]} cyan={cyan} gold={gold} onAction={onAction} />

      {/* article card */}
      <group position={[0, -1.03, UI_Z]}>
        <RoundedBox args={[1.46, 0.32, 0.024]} radius={0.07} smoothness={3}>
          <meshBasicMaterial color={PANEL} />
        </RoundedBox>
        <ThinLine points={PTS.row} color={HAIR} opacity={0.9} loop position={[0, 0, 0.014]} scale={[1, 0.94, 1]} />
        <RoundedBox args={[0.22, 0.22, 0.024]} radius={0.055} smoothness={3} position={[-0.56, 0, 0.02]}>
          <meshBasicMaterial color={gold} />
        </RoundedBox>
        <mesh position={[-0.62, -0.02, 0.036]} rotation={[0, 0, Math.PI / 2]}>
          <circleGeometry args={[0.07, 3]} /><meshBasicMaterial color="#2e2209" />
        </mesh>
        <UIBar position={[-0.06, 0.055, 0.022]} size={[0.6, 0.05]} color="#c8c4ba" opacity={0.85} />
        <UIBar position={[-0.19, -0.035, 0.022]} size={[0.34, 0.038]} color={DIM} />
        <Dot position={[0.58, 0.03, 0.022]} color={cyan} r={0.05} />
        <mesh position={[0.58, 0.03, 0.026]}><circleGeometry args={[0.05, 16]} /><meshBasicMaterial color={INK} /></mesh>
      </group>

      {/* stats */}
      {[-0.5, 0, 0.5].map((x, i) => (
        <group key={x} position={[x, -1.34, UI_Z]}>
          <RoundedBox args={[0.44, 0.16, 0.022]} radius={0.05} smoothness={3}>
            <meshBasicMaterial color="#121110" />
          </RoundedBox>
          <Dot position={[-0.15, 0, 0.018]} color={i === 2 ? cyan : i === 1 ? GREY : gold} r={0.026} />
          <UIBar position={[0.04, 0, 0.018]} size={[0.2, 0.032]} color={i === 0 ? gold : GREY} opacity={i === 0 ? 0.85 : 0.5} />
        </group>
      ))}
    </group>
  );
}

/* ---------------------------------------------------------------------------
   02 · OFFLINE-FIRST — cloud, queue rows, live sync progress
--------------------------------------------------------------------------- */
function ContentOffline({ gold, cyan, online }) {
  const fill = useRef();
  const fillMat = useRef();
  const slashMat = useRef();
  const cyanC = useMemo(() => new THREE.Color(cyan), [cyan]);
  const goldC = useMemo(() => new THREE.Color(gold), [gold]);
  const fillColor = useRef(new THREE.Color(cyan));

  useFrame((_, dt) => {
    const k = 1 - Math.pow(0.002, dt);
    const target = online ? 0.82 : 0.24;
    if (fill.current) {
      const w = lerp(fill.current.scale.x, target, k);
      fill.current.scale.x = w;
      fill.current.position.x = -0.72 + (1.44 * w) / 2;
    }
    if (fillMat.current) {
      fillColor.current.lerp(online ? cyanC : goldC, k);
      fillMat.current.color.copy(fillColor.current);
    }
    if (slashMat.current) {
      slashMat.current.opacity = lerp(slashMat.current.opacity, online ? 0.1 : 0.95, k);
    }
  });

  const rows = [
    { y: 0.24, w: 0.52 },
    { y: -0.2, w: 0.38 },
    { y: -0.64, w: 0.46 },
  ];

  return (
    <group>
      {/* sync banner */}
      <group position={[0, 1.02, UI_Z]}>
        <RoundedBox args={[1.46, 0.3, 0.026]} radius={0.075} smoothness={3}>
          <meshBasicMaterial color={online ? "#0d1a1d" : "#1f1809"} />
        </RoundedBox>
        <ThinLine points={PTS.banner} color={online ? cyan : gold} opacity={0.42} loop position={[0, 0, 0.015]} />
        <group position={[-0.53, 0, 0.03]} scale={0.55}>
          {[[0, 0.02, 0.15], [-0.16, -0.01, 0.11], [0.16, -0.01, 0.12]].map(([x, y, r], i) => (
            <mesh key={i} position={[x, y, 0]}>
              <sphereGeometry args={[r, 8, 6]} />
              <meshBasicMaterial color={online ? cyan : gold} wireframe transparent opacity={0.8} />
            </mesh>
          ))}
          <mesh rotation={[0, 0, 0.7]} position={[0, 0, 0.16]}>
            <planeGeometry args={[0.6, 0.018]} />
            <meshBasicMaterial ref={slashMat} color={gold} transparent opacity={0.95} />
          </mesh>
        </group>
        <UIBar position={[-0.08, 0.045, 0.02]} size={[0.5, 0.05]} color="#cfcac0" opacity={0.85} />
        <UIBar position={[-0.17, -0.045, 0.02]} size={[0.32, 0.036]} color={DIM} />
        <RoundedBox args={[0.26, 0.13, 0.022]} radius={0.045} smoothness={2} position={[0.53, 0, 0.02]}>
          <meshBasicMaterial color={online ? cyan : gold} />
        </RoundedBox>
        <UIBar position={[0.53, 0, 0.036]} size={[0.13, 0.03]} color="#0a222a" />
      </group>

      {/* queue header */}
      <group position={[0, 0.66, UI_Z]}>
        <UIBar position={[-0.5, 0, 0]} size={[0.3, 0.042]} color={GREY} opacity={0.7} />
        <Dot position={[0.44, 0, 0]} color={online ? cyan : gold} r={0.03} />
        <UIBar position={[0.55, 0, 0]} size={[0.14, 0.032]} color={DIM} />
      </group>

      {/* queued documents */}
      {rows.map((r, i) => (
        <group key={i} position={[0.02 * (i % 2 ? -1 : 1), r.y, UI_Z]}>
          <RoundedBox args={[1.46, 0.34, 0.026]} radius={0.07} smoothness={3}>
            <meshBasicMaterial color={PANEL} />
          </RoundedBox>
          <ThinLine points={PTS.row} color={online ? cyan : gold} opacity={0.2} loop position={[0, 0, 0.014]} />
          <RoundedBox args={[0.22, 0.22, 0.026]} radius={0.05} smoothness={3} position={[-0.56, 0, 0.02]}>
            <meshBasicMaterial color={i === 0 ? gold : "#2a2620"} />
          </RoundedBox>
          <mesh position={[-0.60, -0.02, 0.04]} rotation={[0, 0, Math.PI / 2]}>
            <circleGeometry args={[0.065, 3]} />
            <meshBasicMaterial color={i === 0 ? "#332509" : "#4a453c"} />
          </mesh>
          <UIBar position={[-0.05, 0.06, 0.02]} size={[r.w, 0.045]} color="#c4c0b6" opacity={0.8} />
          <UIBar position={[-0.15, -0.04, 0.02]} size={[r.w * 0.6, 0.034]} color={DIM} />
          <RoundedBox args={[0.22, 0.11, 0.02]} radius={0.04} smoothness={2} position={[0.53, 0.03, 0.02]}>
            <meshBasicMaterial color={i === 2 && online ? cyan : online ? cyan : gold} transparent opacity={0.8} />
          </RoundedBox>
          <UIBar position={[0.53, 0.03, 0.036]} size={[0.1, 0.026]} color="#0a222a" />
          <Dot position={[0.53, -0.09, 0.02]} color={DIM} r={0.018} />
        </group>
      ))}

      {/* live sync progress */}
      <group position={[0, -1.05, UI_Z]}>
        <UIBar position={[-0.4, 0.14, 0]} size={[0.3, 0.036]} color={DIM} />
        <UIBar position={[0.55, 0.14, 0]} size={[0.16, 0.036]} color={online ? cyan : gold} opacity={0.8} />
        <RoundedBox args={[1.46, 0.1, 0.022]} radius={0.05} smoothness={3}>
          <meshBasicMaterial color="#201d19" />
        </RoundedBox>
        <mesh ref={fill} position={[0, 0, 0.016]} scale={[0.24, 1, 1]}>
          <boxGeometry args={[1.44, 0.07, 0.012]} />
          <meshBasicMaterial ref={fillMat} color={cyan} transparent opacity={0.95} />
        </mesh>
        <mesh position={[-0.69, 0, 0.02]}>
          <circleGeometry args={[0.045, 16]} />
          <meshBasicMaterial color={online ? cyan : gold} />
        </mesh>
        <UIBar position={[0.15, -0.18, 0]} size={[0.7, 0.036]} color={DIM} />
        <UIBar position={[-0.35, -0.18, 0]} size={[0.16, 0.036]} color={GREY} opacity={0.5} />
      </group>
    </group>
  );
}

/* ---------------------------------------------------------------------------
   03 · PUSH NOTIFICATIONS — bell hero + inbox stack
--------------------------------------------------------------------------- */
function ContentPush({ gold, cyan }) {
  const bell = useRef();
  useFrame((state) => {
    if (!bell.current) return;
    bell.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.6) * 0.09;
  });

  const cards = [
    { y: 0.2, x: 0.02, hot: true },
    { y: -0.25, x: -0.015, hot: false },
    { y: -0.7, x: 0.015, hot: false },
  ];

  return (
    <group>
      <group position={[0, 0.82, UI_Z]}>
        <mesh scale={[1.7, 1.0, 1]}>
          <circleGeometry args={[0.3, 32]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.08}
            blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <group ref={bell}>
          <mesh position={[0, 0.03, 0]}>
            <sphereGeometry args={[0.19, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
            <meshBasicMaterial color={gold} wireframe transparent opacity={0.95} />
          </mesh>
          <mesh position={[0, -0.13, 0]}>
            <boxGeometry args={[0.24, 0.026, 0.012]} />
            <meshBasicMaterial color={gold} />
          </mesh>
          <mesh position={[0, -0.19, 0]}>
            <sphereGeometry args={[0.04, 8, 6]} />
            <meshBasicMaterial color={gold} wireframe />
          </mesh>
        </group>
        <mesh position={[0.2, 0.17, 0.01]}>
          <circleGeometry args={[0.06, 16]} /><meshBasicMaterial color={cyan} />
        </mesh>
        <mesh position={[0.2, 0.17, 0.014]}>
          <circleGeometry args={[0.032, 12]} /><meshBasicMaterial color="#0a222a" />
        </mesh>
      </group>

      {cards.map((c, i) => (
        <group key={i} position={[c.x, c.y, UI_Z + i * 0.001]} rotation={[0, 0, c.x]}>
          <RoundedBox args={[1.46, 0.38, 0.028]} radius={0.08} smoothness={3}>
            <meshBasicMaterial color={c.hot ? "#1b1915" : PANEL} />
          </RoundedBox>
          <ThinLine points={PTS.row} color={c.hot ? cyan : HAIR} opacity={c.hot ? 0.5 : 0.9} loop position={[0, 0, 0.015]} scale={[1, 1.12, 1]} />
          <RoundedBox args={[0.24, 0.24, 0.026]} radius={0.06} smoothness={3} position={[-0.55, 0, 0.02]}>
            <meshBasicMaterial color={gold} />
          </RoundedBox>
          <mesh position={[-0.61, -0.02, 0.04]} rotation={[0, 0, Math.PI / 2]}>
            <circleGeometry args={[0.07, 3]} /><meshBasicMaterial color="#332509" />
          </mesh>
          <UIBar position={[-0.04, 0.07, 0.02]} size={[0.62, 0.045]} color="#d6d2c8" opacity={0.9} />
          <UIBar position={[-0.12, -0.015, 0.02]} size={[0.46, 0.036]} color={GREY} opacity={0.6} />
          <UIBar position={[-0.19, -0.09, 0.02]} size={[0.32, 0.028]} color={DIM} />
          <UIBar position={[0.56, 0.12, 0.02]} size={[0.1, 0.026]} color={DIM} />
          <Dot position={[0.57, -0.08, 0.02]} color={c.hot ? cyan : "#3a3730"} r={0.03} />
        </group>
      ))}

      <group position={[0, -1.22, UI_Z]}>
        <RoundedBox args={[1.46, 0.2, 0.028]} radius={0.1} smoothness={3}>
          <meshBasicMaterial color={cyan} transparent opacity={0.92} />
        </RoundedBox>
        <UIBar position={[0, 0, 0.024]} size={[0.5, 0.05]} color="#06222c" />
        <mesh position={[0.5, 0, 0.024]}><circleGeometry args={[0.045, 16]} /><meshBasicMaterial color="#06222c" /></mesh>
      </group>
    </group>
  );
}

/* ---------------------------------------------------------------------------
   04 · LINKS & PAYMENTS — checkout with self-drawing success mark
--------------------------------------------------------------------------- */
function ContentPayments({ active, gold, cyan }) {
  const p = useRef(0);
  const ring = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(arcPoints(0.2, 44, Math.PI / 2, Math.PI * 2.5));
    const m = new THREE.LineBasicMaterial({ color: cyan, transparent: true, opacity: 0.95 });
    const l = new THREE.Line(g, m);
    l.geometry.setDrawRange(0, 0);
    return l;
  }, [cyan]);
  const check = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.085, 0.01, 0),
      new THREE.Vector3(-0.02, -0.06, 0),
      new THREE.Vector3(0.1, 0.07, 0),
    ]);
    const g = new THREE.BufferGeometry().setFromPoints(curve.getPoints(22));
    const m = new THREE.LineBasicMaterial({ color: cyan, transparent: true, opacity: 0.95 });
    const l = new THREE.Line(g, m);
    l.geometry.setDrawRange(0, 0);
    return l;
  }, [cyan]);

  useEffect(() => () => {
    ring.geometry.dispose(); ring.material.dispose();
    check.geometry.dispose(); check.material.dispose();
  }, [ring, check]);

  useFrame((_, dt) => {
    p.current = lerp(p.current, active ? 1 : 0, 1 - Math.pow(0.004, dt));
    const rt = clamp((p.current - 0.32) / 0.3, 0, 1);
    const ct = clamp((p.current - 0.66) / 0.22, 0, 1);
    ring.geometry.setDrawRange(0, Math.floor(rt * 44));
    check.geometry.setDrawRange(0, Math.floor(ct * 22));
  });

  return (
    <group>
      <group position={[0, 0.92, UI_Z]}>
        <RoundedBox args={[0.5, 0.5, 0.026]} radius={0.09} smoothness={3} position={[-0.46, 0, 0]}>
          <meshBasicMaterial color={gold} />
        </RoundedBox>
        <mesh position={[-0.52, -0.05, 0.018]} rotation={[0, 0, Math.PI / 2]}>
          <circleGeometry args={[0.13, 3]} /><meshBasicMaterial color="#342609" />
        </mesh>
        <UIBar position={[0.18, 0.08, 0]} size={[0.6, 0.05]} color="#d6d2c8" opacity={0.9} />
        <UIBar position={[0.08, -0.03, 0]} size={[0.4, 0.036]} color={GREY} opacity={0.55} />
        <RoundedBox args={[0.24, 0.11, 0.02]} radius={0.04} smoothness={2} position={[0.55, -0.06, 0]}>
          <meshBasicMaterial color={cyan} transparent opacity={0.9} />
        </RoundedBox>
      </group>

      <mesh position={[0, 0.56, UI_Z]}>
        <planeGeometry args={[1.46, 0.012]} /><meshBasicMaterial color={HAIR} />
      </mesh>

      {[{ y: 0.38, w: 0.4, vw: 0.16, c: GREY }, { y: 0.18, w: 0.3, vw: 0.22, c: gold }].map((r, i) => (
        <group key={i} position={[0, r.y, UI_Z]}>
          <UIBar position={[-0.48, 0, 0]} size={[r.w, 0.036]} color={r.c} opacity={0.7} />
          <UIBar position={[0.58, 0, 0]} size={[r.vw, 0.036]} color={r.c} opacity={0.9} />
        </group>
      ))}

      {/* payment card */}
      <group position={[0.02, -0.35, UI_Z]}>
        <RoundedBox args={[1.46, 0.68, 0.03]} radius={0.1} smoothness={4}>
          <meshBasicMaterial color="#17130c" />
        </RoundedBox>
        <ThinLine points={PTS.card} color={gold} opacity={0.5} loop position={[0, 0, 0.018]} />
        <mesh position={[-0.5, 0.17, 0.024]}>
          <planeGeometry args={[0.22, 0.17]} /><meshBasicMaterial color={gold} transparent opacity={0.95} />
        </mesh>
        <mesh position={[-0.5, 0.17, 0.03]}>
          <planeGeometry args={[0.14, 0.02]} /><meshBasicMaterial color="#2c2109" />
        </mesh>
        <UIBar position={[0.0, 0.18, 0.022]} size={[0.34, 0.042]} color={GREY} opacity={0.5} />
        <UIBar position={[0.55, 0.18, 0.022]} size={[0.16, 0.05]} color={cyan} opacity={0.85} />
        {[-0.51, -0.22, 0.07, 0.36].map((x) => (
          <mesh key={x} position={[x, -0.06, 0.022]}>
            <planeGeometry args={[0.2, 0.045]} /><meshBasicMaterial color={cyan} transparent opacity={0.8} />
          </mesh>
        ))}
        <UIBar position={[-0.44, -0.22, 0.022]} size={[0.36, 0.036]} color={GREY} opacity={0.55} />
        <Dot position={[0.3, -0.23, 0.024]} color={gold} r={0.07} opacity={0.9} />
        <Dot position={[0.4, -0.23, 0.025]} color={cyan} r={0.07} opacity={0.55} />
        <mesh position={[-0.4, 0.17, 0.04]}><circleGeometry args={[0.05, 16]} /><meshBasicMaterial color="#17130c" /></mesh>
      </group>

      {/* success draw */}
      <group position={[0, -1.05, UI_Z + 0.01]}>
        <group position={[-0.48, 0, 0]}>
          <mesh>
            <circleGeometry args={[0.21, 32]} />
            <meshBasicMaterial color={cyan} transparent opacity={0.07} />
          </mesh>
          <primitive object={ring} />
          <primitive object={check} />
        </group>
        <UIBar position={[0.15, 0.055, 0]} size={[0.7, 0.05]} color="#cfcac0" opacity={0.85} />
        <UIBar position={[0.02, -0.04, 0]} size={[0.46, 0.036]} color={DIM} />
        <RoundedBox args={[0.4, 0.12, 0.02]} radius={0.04} smoothness={2} position={[0.5, -0.04, 0]}>
          <meshBasicMaterial color="#0d2027" />
        </RoundedBox>
        <UIBar position={[0.5, -0.04, 0.016]} size={[0.2, 0.028]} color={cyan} opacity={0.85} />
      </group>
    </group>
  );
}

/* ---------------------------------------------------------------------------
   Rear panel — camera island, lenses, monogram, fine print
--------------------------------------------------------------------------- */
function PhoneBack({ gold, cyan }) {
  const lens = (x, y, size, accent) => (
    <group position={[x, y, 0.065]}>
      <mesh>
        <circleGeometry args={[0.15 * size, 26]} />
        <meshBasicMaterial color="#0a0b0d" />
      </mesh>
      <ThinLine points={PTS.backLensOuter} color={accent} opacity={accent === gold ? 0.75 : 0.35} loop scale={size} />
      <ThinLine points={PTS.backLensInner} color="#3d3b36" opacity={0.9} loop scale={size} />
      <mesh position={[0, 0, 0.004]}>
        <circleGeometry args={[0.075 * size, 22]} />
        <meshBasicMaterial color="#0d1115" />
      </mesh>
      <mesh position={[0.018, 0.018, 0.006]}>
        <circleGeometry args={[0.028 * size, 12]} />
        <meshBasicMaterial color={cyan} transparent opacity={0.45} />
      </mesh>
      <Dot position={[-0.035, 0.035, 0.007]} color="#e8f7ff" r={0.012} opacity={0.75} />
    </group>
  );

  return (
    <group position={[0, 0, -PHONE.d / 2 - 0.002]} rotation={[0, Math.PI, 0]}>
      <RoundedBox args={[1.88, 3.96, 0.03]} radius={0.18} smoothness={4} position={[0, 0, 0.014]}>
        <meshStandardMaterial
          color="#121218" roughness={0.34} metalness={0.72}
          emissive="#151a20" emissiveIntensity={0.5}
        />
      </RoundedBox>

      {/* camera island */}
      <RoundedBox args={[0.84, 0.88, 0.05]} radius={0.19} smoothness={4} position={[0.42, 1.22, 0.04]}>
        <meshStandardMaterial color="#121216" roughness={0.32} metalness={0.7} />
      </RoundedBox>
      <ThinLine points={PTS.heroBorder} color={gold} opacity={0.5} loop position={[0.42, 1.22, 0.066]} scale={[0.56, 0.86, 1]} />
      {lens(0.28, 1.41, 1, gold)}
      {lens(0.58, 1.35, 0.86, gold)}
      {lens(0.28, 1.06, 0.86, "#a8a49a")}
      <mesh position={[0.6, 1.06, 0.068]}>
        <circleGeometry args={[0.055, 16]} />
        <meshBasicMaterial color="#f6e6b6" transparent opacity={0.75} />
      </mesh>
      <Dot position={[0.24, 1.41, 0.068]} color="#4d4a44" r={0.03} />

      {/* gold monogram */}
      <group position={[0, -0.02, 0.05]}>
        <mesh position={[-0.075, 0, 0.006]}><boxGeometry args={[0.032, 0.27, 0.014]} /><meshBasicMaterial color={gold} /></mesh>
        <mesh position={[-0.015, 0.12, 0.006]}><boxGeometry args={[0.13, 0.032, 0.014]} /><meshBasicMaterial color={gold} /></mesh>
        <mesh position={[-0.025, 0.0, 0.006]}><boxGeometry args={[0.105, 0.032, 0.014]} /><meshBasicMaterial color={gold} /></mesh>
        <mesh position={[-0.015, -0.12, 0.006]}><boxGeometry args={[0.13, 0.032, 0.014]} /><meshBasicMaterial color={gold} /></mesh>
        <ThinLine points={PTS.backLogoTick} color={gold} opacity={0.3} loop position={[0, 0, 0.005]} />
      </group>

      {/* nfc + fine print */}
      <ThinLine points={PTS.backNfc} color={gold} opacity={0.25} position={[0.44, 0.9, 0.04]} />
      <ThinLine points={[new THREE.Vector3(0.72, -1.5, 0.04), new THREE.Vector3(0.72, 1.5, 0.04)]} color={gold} opacity={0.12} />
      <mesh position={[0.42, 0.9, 0.045]}>
        <circleGeometry args={[0.02, 10]} /><meshBasicMaterial color={gold} transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, -1.55, 0.045]}>
        <boxGeometry args={[0.16, 0.024, 0.012]} /><meshBasicMaterial color={cyan} transparent opacity={0.8} />
      </mesh>
      <UIBar position={[-0.28, -1.68, 0.045]} size={[0.34, 0.022]} color="#3b3833" />
      <UIBar position={[-0.34, -1.75, 0.045]} size={[0.22, 0.02]} color="#302e29" />
      <UIBar position={[0.5, -1.68, 0.045]} size={[0.16, 0.022]} color="#3b3833" />
      <Dot position={[0.34, -1.72, 0.045]} color={gold} r={0.022} opacity={0.7} />
    </group>
  );
}

/* ---------------------------------------------------------------------------
   The phone
--------------------------------------------------------------------------- */
function Phone({ platform, feature, online, gold, cyan, hovered, pulsePing, onAction }) {
  const morph = useRef(0);
  const glow = useRef(0);
  const pulse = useRef(0);
  const island = useRef();
  const hole = useRef();
  const lightMat = useRef();
  const keyMat = useRef();

  const goldC = useMemo(() => new THREE.Color(gold), [gold]);
  const cyanC = useMemo(() => new THREE.Color(cyan), [cyan]);

  // screen edge race-light (raw three line, animated material)
  const edgeRef = useRef();
  const edgeLine = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(PTS.screenEdge);
    const m = new THREE.LineBasicMaterial({ color: cyan, transparent: true, opacity: 0.14 });
    return new THREE.LineLoop(g, m);
  }, [cyan]);
  useEffect(() => () => { edgeLine.geometry.dispose(); edgeLine.material.dispose(); }, [edgeLine]);

  useEffect(() => { if (pulsePing > 0) pulse.current = 1; }, [pulsePing]);

  useFrame((state, dt) => {
    const k = 1 - Math.pow(0.0015, dt);
    morph.current = lerp(morph.current, platform === "android" ? 1 : 0, k);
    glow.current = lerp(glow.current, hovered ? 1 : 0, k);
    pulse.current = Math.max(0, pulse.current - dt * 1.7);
    const m = morph.current;
    const t = state.clock.elapsedTime;

    if (island.current) island.current.scale.set(lerp(1, 0.26, m), 1, 1);
    if (hole.current) hole.current.scale.setScalar(Math.max(0.001, m));

    if (lightMat.current) {
      lightMat.current.opacity = 0.028 + glow.current * 0.1 + pulse.current * 0.16;
    }
    const em = edgeRef.current.material;
    em.opacity = 0.14 + glow.current * 0.4 + pulse.current * 0.28 + Math.sin(t * 1.6) * 0.05;
    em.color.copy(cyanC).lerp(goldC, feature === 3 ? 0.7 : 0);
    if (keyMat.current) keyMat.current.opacity = 0.45 + glow.current * 0.5;
  });

  return (
    <group>
      {/* ---------- chassis ---------- */}
      <RoundedBox args={[PHONE.w, PHONE.h, 0.2]} radius={0.2} smoothness={5}>
        <meshStandardMaterial
          color="#c59a44" metalness={0.62} roughness={0.26}
          emissive="#5a3f10" emissiveIntensity={0.55}
        />
      </RoundedBox>
      <RoundedBox args={[PHONE.w - 0.055, PHONE.h - 0.055, 0.238]} radius={0.185} smoothness={5}>
        <meshStandardMaterial
          color="#0b0b0f" metalness={0.45} roughness={0.32}
          emissive="#0a0805" emissiveIntensity={0.4}
        />
      </RoundedBox>
      {/* signature gold silhouette rails (front + back) */}
      <ThinLine points={PTS.silhouette} color={gold} opacity={0.5} loop position={[0, 0, 0.104]} />
      <ThinLine points={PTS.silhouette} color={gold} opacity={0.32} loop position={[0, 0, -0.104]} />

      <ThinLine points={PTS.railL} color={gold} opacity={0.4} />
      <ThinLine points={PTS.railR} color={gold} opacity={0.4} />
      <ThinLine points={PTS.jaw} color={cyan} opacity={0.22} />

      {/* physical keys */}
      <RoundedBox args={[0.05, 0.46, 0.075]} radius={0.022} smoothness={3} position={[0.972, 0.55, 0.01]}>
        <meshStandardMaterial color="#c9a04b" metalness={0.7} roughness={0.3} emissive="#4a3309" emissiveIntensity={0.6} />
      </RoundedBox>
      <mesh position={[0.997, 0.55, 0.045]}>
        <boxGeometry args={[0.012, 0.3, 0.02]} /><meshBasicMaterial ref={keyMat} color={cyan} transparent opacity={0.6} />
      </mesh>
      <RoundedBox args={[0.05, 0.34, 0.075]} radius={0.022} smoothness={3} position={[-0.972, 0.72, 0.01]}>
        <meshStandardMaterial color="#c9a04b" metalness={0.7} roughness={0.3} emissive="#4a3309" emissiveIntensity={0.6} />
      </RoundedBox>
      <RoundedBox args={[0.05, 0.26, 0.075]} radius={0.022} smoothness={3} position={[-0.972, 0.3, 0.01]}>
        <meshStandardMaterial color="#c9a04b" metalness={0.7} roughness={0.3} emissive="#4a3309" emissiveIntensity={0.6} />
      </RoundedBox>

      {/* ---------- rear ---------- */}
      <PhoneBack gold={gold} cyan={cyan} />

      {/* ---------- front glass ---------- */}
      <ThinLine points={PTS.bezel} color={gold} opacity={0.5} loop position={[0, 0, SCR_Z + 0.016]} />
      <RoundedBox args={[SCR.w, SCR.h, 0.022]} radius={SCR.r} smoothness={5} position={[0, 0, SCR_Z]}>
        <meshBasicMaterial color="#050507" />
      </RoundedBox>
      <primitive ref={edgeRef} object={edgeLine} position={[0, 0, UI_Z + 0.03]} />

      {/* glass sheen */}
      <group position={[0, 0, UI_Z + 0.05]}>
        <mesh position={[0.34, 0.2, 0]} rotation={[0, 0, 0.34]}>
          <planeGeometry args={[0.46, 3.3]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.035}
            blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh position={[-0.6, 0.9, 0]} rotation={[0, 0, 0.34]}>
          <planeGeometry args={[0.1, 2.1]} />
          <meshBasicMaterial color="#cdefff" transparent opacity={0.05}
            blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>

      {/* screen halo */}
      <mesh position={[0, 0, SCR_Z + 0.021]}>
        <planeGeometry args={[1.72, 3.78]} />
        <meshBasicMaterial ref={lightMat} color={cyan} transparent opacity={0.03}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* dynamic island ⇄ punch-hole */}
      <group ref={island} position={[0, 1.77, UI_Z + 0.012]}>
        <RoundedBox args={[0.6, 0.15, 0.032]} radius={0.075} smoothness={4}>
          <meshBasicMaterial color="#000000" />
        </RoundedBox>
        <mesh position={[0.18, 0, 0.02]}>
          <circleGeometry args={[0.033, 16]} /><meshBasicMaterial color="#12242c" />
        </mesh>
        <ThinLine points={PTS.ring} color={cyan} opacity={0.6} loop position={[0.18, 0, 0.021]} scale={0.68} />
        <Dot position={[0.24, 0, 0.022]} color="#1d3f4c" r={0.012} />
      </group>
      <group ref={hole} position={[0, 1.77, UI_Z + 0.012]} scale={0.001}>
        <mesh><circleGeometry args={[0.072, 22]} /><meshBasicMaterial color="#000000" /></mesh>
        <ThinLine points={PTS.hole} color={cyan} opacity={0.85} loop position={[0, 0, 0.004]} />
        <mesh position={[0.012, 0.012, 0.006]}>
          <circleGeometry args={[0.02, 10]} /><meshBasicMaterial color="#1b3d4a" />
        </mesh>
      </group>

      {/* ---------- screen UI ---------- */}
      <ScreenStatus cyan={cyan} />
      <ScreenHeader gold={gold} cyan={cyan} />
      <ScreenChrome cyan={cyan} />

      <ScreenLayer active={feature === 0} z={0}>
        <ContentCrossPlatform gold={gold} cyan={cyan} platform={platform} onAction={onAction} />
      </ScreenLayer>
      <ScreenLayer active={feature === 1} z={0.003}>
        <ContentOffline gold={gold} cyan={cyan} online={online} />
      </ScreenLayer>
      <ScreenLayer active={feature === 2} z={0.006}>
        <ContentPush gold={gold} cyan={cyan} />
      </ScreenLayer>
      <ScreenLayer active={feature === 3} z={0.009}>
        <ContentPayments gold={gold} cyan={cyan} active={feature === 3} />
      </ScreenLayer>
    </group>
  );
}

/* ============================================================================
   PHONE RIG — float, cursor parallax, hover lift, children = everything
   that must move with the phone (notifications, payment card)
   ============================================================================ */

function PhoneRig({ children, hovered, setHovered }) {
  const rig = useRef();
  const liftScale = useRef(1);


  useFrame((state, dt) => {
    if (!rig.current) return;
    const t = state.clock.elapsedTime;
    const k = 1 - Math.pow(0.002, dt);
    // gentle float
    const floatY = Math.sin(t * 0.9) * 0.09 + (hovered ? 0.12 : 0);
    rig.current.position.y = lerp(rig.current.position.y, floatY, k);
    // parallax tilt toward cursor
    rig.current.rotation.x = lerp(rig.current.rotation.x, -state.pointer.y * 0.14, k * 0.6);
    rig.current.rotation.y = lerp(rig.current.rotation.y, state.pointer.x * 0.2, k * 0.6);
    // hover scale
    liftScale.current = lerp(liftScale.current, hovered ? 1.045 : 1, k);
    rig.current.scale.setScalar(liftScale.current);
  });

  return (
    <group
      ref={rig}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
    >
      {children}
    </group>
  );
}

/* ============================================================================
   FEATURE 02 — OFFLINE-FIRST : cloud + queued counter + sync packets
   ============================================================================ */

function CloudSync({ online, queued, flush, feature, gold, cyan, onToggleOnline }) {
  const cloudGroup = useRef();
  const cloudMats = useRef([]);
  const slashMat = useRef();
  const [cloudHover, setCloudHover] = useState(false);
  const cloudPos = useMemo(() => new THREE.Vector3(1.42, 2.02, -0.1), []);

  // Flight path phone → cloud
  const curve = useMemo(() => new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0.45, 1.45, 0.35),
    new THREE.Vector3(1.9, 1.6, 0.9),
    cloudPos.clone().add(new THREE.Vector3(0, -0.18, 0)),
  ), [cloudPos]);

  // Packet pool
  const POOL = 8;
  const packetRefs = useRef([]);
  const packets = useRef(Array.from({ length: POOL }, () => ({ start: -1, dur: 0.9 })));
  const pendingFlush = useRef(0);
  const lastAmbient = useRef(0);

  useEffect(() => {
    if (flush.id > 0 && flush.count > 0) pendingFlush.current = Math.min(flush.count, POOL);
  }, [flush]);


  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const k = 1 - Math.pow(0.001, dt);

    // Schedule a burst of packets after coming back online
    if (pendingFlush.current > 0) {
      const n = pendingFlush.current;
      for (let i = 0; i < n; i++) packets.current[i].start = t + i * 0.16;
      pendingFlush.current = 0;
    }
    // Ambient single packet while online & offline-first feature active
    if (online && feature === 1 && t - lastAmbient.current > 2.4) {
      lastAmbient.current = t;
      const idle = packets.current.find((p) => p.start < 0 || t > p.start + p.dur);
      if (idle) idle.start = t;
    }
    // Animate packets along the bezier
    packets.current.forEach((p, i) => {
      const mesh = packetRefs.current[i];
      if (!mesh) return;
      const age = t - p.start;
      if (p.start < 0 || age < 0 || age > p.dur) { mesh.visible = false; return; }
      const f = age / p.dur;
      mesh.visible = true;
      curve.getPoint(easeInOut(f), mesh.position);
      const s = Math.sin(f * Math.PI) * 0.055 + 0.01;
      mesh.scale.setScalar(s);
    });

    // Cloud dim / glow
    const targetOp = online ? (cloudHover ? 1 : 0.85) : 0.16;
    cloudMats.current.forEach((m) => { if (m) m.opacity = lerp(m.opacity, targetOp, k); });
    if (slashMat.current) slashMat.current.opacity = lerp(slashMat.current.opacity, online ? 0 : 0.9, k);
    if (cloudGroup.current) cloudGroup.current.position.y = cloudPos.y + Math.sin(t * 1.3) * 0.05;
  });

  const puffs = [
    { p: [0, 0, 0], r: 0.21 },
    { p: [-0.24, -0.05, 0], r: 0.15 },
    { p: [0.24, -0.04, 0], r: 0.16 },
    { p: [0.02, 0.12, 0], r: 0.16 },
  ];

  return (
    <group>
      {/* the cloud — wireframe puffs, clickable toggle */}
      <group
        ref={cloudGroup}
        position={cloudPos.toArray()}
        scale={0.9}
        onClick={(e) => { e.stopPropagation(); onToggleOnline(); }}
        onPointerOver={(e) => { e.stopPropagation(); setCloudHover(true); }}
        onPointerOut={() => setCloudHover(false)}
      >
        {/* invisible hit area */}
        <mesh visible={false}>
          <sphereGeometry args={[0.55, 8, 8]} />
          <meshBasicMaterial />
        </mesh>
        {puffs.map((pf, i) => (
          <mesh key={i} position={pf.p}>
            <sphereGeometry args={[pf.r, 10, 8]} />
            <meshBasicMaterial
              ref={(el) => (cloudMats.current[i] = el)}
              color={cyan} wireframe transparent opacity={0.85}
            />
          </mesh>
        ))}
        {/* offline slash */}
        <mesh position={[0, 0, 0.14]} rotation={[0, 0, 0.68]}>
          <planeGeometry args={[0.95, 0.022]} />
          <meshBasicMaterial ref={slashMat} color={gold} transparent opacity={0} />
        </mesh>
      </group>

      {/* sync packets */}
      {Array.from({ length: POOL }).map((_, i) => (
        <mesh key={i} ref={(el) => (packetRefs.current[i] = el)} visible={false}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/* ============================================================================
   FEATURE 03 — PUSH NOTIFICATIONS : cards pop out, bounce up, fade
   ============================================================================ */

function PopCard({ gold, cyan, innerRef }) {
  // one notification card built from meshes; parent animates via ref
  return (
    <group ref={innerRef} visible={false}>
      <RoundedBox args={[1.34, 0.42, 0.04]} radius={0.07} smoothness={3}>
        <meshBasicMaterial color="#1a1813" transparent opacity={0.95} userData={{ op: 0.95 }} />
      </RoundedBox>
      {/* gold app dot */}
      <mesh position={[-0.5, 0, 0.035]}>
        <circleGeometry args={[0.085, 18]} />
        <meshBasicMaterial color={gold} transparent userData={{ op: 1 }} />
      </mesh>
      {/* text lines */}
      <mesh position={[0.08, 0.075, 0.035]}>
        <planeGeometry args={[0.78, 0.055]} />
        <meshBasicMaterial color="#b9b9b9" transparent userData={{ op: 0.9 }} />
      </mesh>
      <mesh position={[-0.03, -0.075, 0.035]}>
        <planeGeometry args={[0.56, 0.05]} />
        <meshBasicMaterial color="#6d6d6d" transparent userData={{ op: 0.8 }} />
      </mesh>
      {/* cyan unread dot */}
      <mesh position={[0.57, 0.11, 0.035]}>
        <circleGeometry args={[0.035, 14]} />
        <meshBasicMaterial color={cyan} transparent userData={{ op: 1 }} />
      </mesh>
    </group>
  );
}

function Notifications({ active, bellPing, gold, cyan }) {
  const SLOTS = 3;
  const refs = useRef([]);
  const slots = useRef(Array.from({ length: SLOTS }, () => ({ t: -99, side: 1 })));
  const next = useRef(0);
  const spawnQueue = useRef(0);
  const lastAuto = useRef(0);

  // bell icon / dot click → immediate pop
  useEffect(() => { if (bellPing > 0) spawnQueue.current += 1; }, [bellPing]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // auto pops while the feature is active
    if (active && t - lastAuto.current > 1.5) { lastAuto.current = t; spawnQueue.current += 1; }
    // consume spawn queue
    if (spawnQueue.current > 0) {
      spawnQueue.current -= 1;
      const s = slots.current[next.current];
      s.t = t; s.side = next.current % 2 === 0 ? 1 : -1;
      next.current = (next.current + 1) % SLOTS;
    }
    // animate each slot: pop (back-ease), rise, fade
    const DUR = 2.3;
    slots.current.forEach((s, i) => {
      const g = refs.current[i];
      if (!g) return;
      const age = t - s.t;
      if (age < 0 || age > DUR) { g.visible = false; return; }
      g.visible = true;
      const popT = clamp(age / 0.4, 0, 1);
      const rise = easeInOut(clamp(age / DUR, 0, 1));
      const fade = age < 0.3 ? age / 0.3 : age > DUR - 0.7 ? (DUR - age) / 0.7 : 1;
      g.position.set(s.side * 1.28 + Math.sin(age * 2 + i) * 0.07, 0.85 + rise * 1.5, 1.35);
      g.scale.setScalar((easeOutBack(popT) * 0.98 + 0.02) * 1.1);
      g.rotation.z = s.side * 0.04 * Math.sin(age * 3);
      g.traverse((o) => {
        if (o.material && o.material.userData.op !== undefined) {
          o.material.opacity = o.material.userData.op * fade;
        }
      });
    });
  });

  return (
    <group>
      {Array.from({ length: SLOTS }).map((_, i) => (
        <PopCard key={i} gold={gold} cyan={cyan} innerRef={(el) => (refs.current[i] = el)} />
      ))}
    </group>
  );
}

/* ============================================================================
   FEATURE 04 — DEEP LINKS & PAYMENTS : card slides out + self-drawing check
   ============================================================================ */

function PaymentCard({ active, gold, cyan }) {
  const group = useRef();
  const prog = useRef(0);
  const mats = useRef([]);

  // Self-drawing check ring + check mark (raw lines + setDrawRange)
  const ring = useMemo(() => {
    const pts = arcPoints(0.26, 48, Math.PI * 0.5, Math.PI * 2.5);
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const m = new THREE.LineBasicMaterial({ color: cyan, transparent: true, opacity: 0.95 });
    const l = new THREE.Line(g, m);
    l.geometry.setDrawRange(0, 0);
    return l;
  }, [cyan]);
  const check = useMemo(() => {
    const pts = [
      new THREE.Vector3(-0.11, 0.0, 0),
      new THREE.Vector3(-0.025, -0.09, 0),
      new THREE.Vector3(0.13, 0.09, 0),
    ];
    // resample so the draw-on feels smooth
    const curve = new THREE.CatmullRomCurve3(pts);
    const g = new THREE.BufferGeometry().setFromPoints(curve.getPoints(24));
    const m = new THREE.LineBasicMaterial({ color: cyan, transparent: true, opacity: 0.95 });
    const l = new THREE.Line(g, m);
    l.geometry.setDrawRange(0, 0);
    return l;
  }, [cyan]);
  useEffect(() => () => {
    ring.geometry.dispose(); ring.material.dispose();
    check.geometry.dispose(); check.material.dispose();
  }, [ring, check]);

  const borderPts = useMemo(() => roundedRectPoints(1.48, 0.94, 0.1, 8), []);

  useFrame((_, dt) => {
    const k = 1 - Math.pow(0.004, dt);
    prog.current = lerp(prog.current, active ? 1 : 0, k * 0.8);
    const p = prog.current;
    if (!group.current) return;

    // slide out of the phone to the right
    const slide = easeInOut(clamp(p / 0.45, 0, 1));
    group.current.visible = p > 0.01;
    group.current.position.set(lerp(0.1, 1.92, slide), lerp(-0.4, -0.9, slide), lerp(0.15, 0.95, slide));
    group.current.rotation.y = lerp(-0.9, -0.28, slide);
    group.current.scale.setScalar(lerp(0.25, 1, slide));
    mats.current.forEach((m) => { if (m) m.opacity = (m.userData.op ?? 1) * slide; });

    // draw the success ring then the check mark
    const ringT = clamp((p - 0.5) / 0.3, 0, 1);
    const checkT = clamp((p - 0.78) / 0.18, 0, 1);
    ring.geometry.setDrawRange(0, Math.floor(ringT * 48));
    check.geometry.setDrawRange(0, Math.floor(checkT * 24));
    ring.material.setValues({ opacity: slide * 0.95 });
    check.material.setValues({ opacity: slide * 0.95 });
  });


  return (
    <group ref={group} visible={false}>
      {/* card body */}
      <RoundedBox args={[1.5, 0.96, 0.05]} radius={0.1} smoothness={3}>
        <meshBasicMaterial color="#241d10" transparent opacity={0.98} ref={(material) => {
            if (material && material.userData.op === undefined) material.userData.op = material.opacity;
            mats.current[0] = material;
          }} />
      </RoundedBox>
      <group position={[0, 0, 0.032]}>
        <ThinLine points={borderPts} color={gold} opacity={0.7} loop />
        {/* chip */}
        <mesh position={[-0.5, 0.22, 0.004]}>
          <planeGeometry args={[0.24, 0.17]} />
          <meshBasicMaterial color={gold} transparent opacity={0.95} ref={(material) => {
            if (material && material.userData.op === undefined) material.userData.op = material.opacity;
            mats.current[1] = material;
          }} />
        </mesh>
        {/* gold contact chip */}
        <mesh position={[-0.5, 0.2, 0.006]}>
          <planeGeometry args={[0.2, 0.15]} />
          <meshBasicMaterial color="#d8b263" transparent opacity={0.95} ref={(material) => {
            if (material && material.userData.op === undefined) material.userData.op = material.opacity;
            mats.current[7] = material;
          }} />
        </mesh>
        {/* number bars */}
        {[-0.43, -0.14, 0.15, 0.44].map((x, i) => (
          <mesh key={i} position={[x, -0.1, 0.006]}>
            <planeGeometry args={[0.22, 0.06]} />
            <meshBasicMaterial color={cyan} transparent opacity={0.92} ref={(material) => {
            if (material && material.userData.op === undefined) material.userData.op = material.opacity;
            mats.current[2 + i] = material;
          }} />
          </mesh>
        ))}
        {/* name + expiry bars */}
        <mesh position={[-0.3, -0.32, 0.006]}>
          <planeGeometry args={[0.46, 0.045]} />
          <meshBasicMaterial color="#8e8a80" transparent opacity={0.9} ref={(material) => {
            if (material && material.userData.op === undefined) material.userData.op = material.opacity;
            mats.current[6] = material;
          }} />
        </mesh>
        <mesh position={[0.52, 0.36, 0.006]}>
          <planeGeometry args={[0.3, 0.035]} />
          <meshBasicMaterial color={gold} transparent opacity={0.85} ref={(material) => {
            if (material && material.userData.op === undefined) material.userData.op = material.opacity;
            mats.current[8] = material;
          }} />
        </mesh>
        <mesh position={[0.52, 0.29, 0.006]}>
          <planeGeometry args={[0.2, 0.028]} />
          <meshBasicMaterial color="#8e8a80" transparent opacity={0.7} ref={(material) => {
            if (material && material.userData.op === undefined) material.userData.op = material.opacity;
            mats.current[9] = material;
          }} />
        </mesh>
        {/* success ring + check, top-right of the card */}
        <group position={[0.48, 0.24, 0.01]}>
          <primitive object={ring} />
          <primitive object={check} />
        </group>
      </group>
    </group>
  );
}

/* ============================================================================
   ORBITING ICONS — wireframe chat / camera / pin / bell / card on a tilted ring
   ============================================================================ */

function IconShape({ type }) {
  switch (type) {
    case "chat":
      return (
        <>
          <mesh><boxGeometry args={[1.1, 0.75, 0.3]} /><meshBasicMaterial wireframe /></mesh>
          <mesh position={[-0.25, -0.52, 0]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.18, 0.3, 4]} /><meshBasicMaterial wireframe />
          </mesh>
        </>
      );
    case "camera":
      return (
        <>
          <mesh><boxGeometry args={[1.05, 0.7, 0.4]} /><meshBasicMaterial wireframe /></mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0.05, 0, 0.22]}>
            <cylinderGeometry args={[0.24, 0.24, 0.12, 12]} /><meshBasicMaterial wireframe />
          </mesh>
        </>
      );
    case "pin":
      return (
        <>
          <mesh position={[0, -0.25, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.32, 0.7, 10]} /><meshBasicMaterial wireframe />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <sphereGeometry args={[0.32, 10, 8]} /><meshBasicMaterial wireframe />
          </mesh>
        </>
      );
    case "bell":
      return (
        <>
          <mesh position={[0, 0.05, 0]}>
            <sphereGeometry args={[0.42, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            <meshBasicMaterial wireframe />
          </mesh>
          <mesh position={[0, -0.32, 0]}>
            <sphereGeometry args={[0.1, 8, 6]} /><meshBasicMaterial wireframe />
          </mesh>
        </>
      );
    case "card":
    default:
      return (
        <>
          <mesh><boxGeometry args={[1.15, 0.72, 0.08]} /><meshBasicMaterial wireframe /></mesh>
          <mesh position={[0, 0.16, 0.05]}>
            <planeGeometry args={[1.15, 0.14]} /><meshBasicMaterial wireframe />
          </mesh>
        </>
      );
  }
}

function OrbitIcons({ gold, cyan, onIconClick }) {
  const ICONS = ["chat", "camera", "pin", "bell", "card"];
  const ring = useRef();
  const iconRefs = useRef([]);
  const hover = useRef(-1);
  const hoverAmt = useRef(ICONS.map(() => 0));
  const R = 2.75;
  const GLYPH_SCALE = 0.74;

  const pathPts = useMemo(() => arcPoints(R, 110), []);
  const goldColor = useMemo(() => new THREE.Color(gold), [gold]);
  const cyanColor = useMemo(() => new THREE.Color(cyan), [cyan]);
  const tmp = useMemo(() => new THREE.Color(), []);


  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (ring.current) ring.current.rotation.z = t * 0.14;
    const k = 1 - Math.pow(0.001, dt);
    iconRefs.current.forEach((g, i) => {
      if (!g) return;
      // counter-rotate so icons stay upright, spin gently on own axis
      g.rotation.z = -t * 0.14;
      const inner = g.children[0];
      if (inner) inner.rotation.y = t * 0.6 + i;
      // hover grow + recolor to gold
      hoverAmt.current[i] = lerp(hoverAmt.current[i], hover.current === i ? 1 : 0, k);
      const h = hoverAmt.current[i];
      g.scale.setScalar(0.2 * (1 + h * 0.4));
      tmp.copy(cyanColor).lerp(goldColor, h);
      g.traverse((o) => { if (o.material && o.material.wireframe) o.material.color.copy(tmp); });
    });
  });

  return (
    // tilted cyan orbit ring, like a gyroscope band around the phone
    <group rotation={[1.25, 0.18, -0.15]}>
      <group ref={ring}>
        <ThinLine points={pathPts} color={cyan} opacity={0.28} loop />
        {ICONS.map((type, i) => {
          const a = (i / ICONS.length) * Math.PI * 2;
          return (
            <group
              key={type}
              position={[Math.cos(a) * R, Math.sin(a) * R, 0]}
              ref={(el) => (iconRefs.current[i] = el)}
              scale={0.17}
              onClick={(e) => { e.stopPropagation(); onIconClick(type); }}
              onPointerOver={(e) => { e.stopPropagation(); hover.current = i; }}
              onPointerOut={() => { if (hover.current === i) hover.current = -1; }}
            >
              {/* counter-tilt so icons face the camera-ish */}
              <group rotation={[-1.25, 0, 0]}>
                {/* invisible hit sphere makes small icons easy to click */}
                <mesh visible={false}><sphereGeometry args={[1.6, 6, 6]} /><meshBasicMaterial /></mesh>
                {/* app-chip backing + thin ring */}
                <mesh position={[0, 0, -0.06]}>
                  <circleGeometry args={[0.95, 28]} />
                  <meshBasicMaterial color="#0b0d0e" transparent opacity={0.88} />
                </mesh>
                <ThinLine points={PTS.iconRing} color={gold} opacity={0.45} loop position={[0, 0, -0.05]} />
                {/* the wireframe glyph */}
                <group scale={GLYPH_SCALE} position={[0, 0, 0.04]}>
                  <IconShape type={type} />
                </group>
              </group>
            </group>
          );
        })}
      </group>
    </group>
  );
}

/* ============================================================================
   CONTROLS — drag to rotate (no zoom / pan), eases back to front pose
   ============================================================================ */

function EaseBackControls({ enabled, view = "front" }) {
  const ref = useRef();
  const dragging = useRef(false);
  useFrame((_, dt) => {
    const c = ref.current;
    if (!c) return;
    if (!dragging.current) {
      const k = 1 - Math.pow(0.02, dt);
      const targetAzimuth = view === "back" ? Math.PI : 0;
      c.setAzimuthalAngle(lerp(c.getAzimuthalAngle(), targetAzimuth, k));
      c.setPolarAngle(lerp(c.getPolarAngle(), Math.PI / 2, k));
    }
    c.update();
  });
  return (
    <OrbitControls
      ref={ref}
      enabled={enabled}
      enableZoom={false}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.55}
      onStart={() => (dragging.current = true)}
      onEnd={() => (dragging.current = false)}
    />
  );
}

/* ============================================================================
   RESPONSIVE STAGE — scales the whole composition to the canvas aspect ratio
   ============================================================================ */

function ResponsiveStage({ children }) {
  const g = useRef();
  useFrame(({ size }) => {
    if (!g.current) return;
    // narrow canvases need a touch more breathing room around the phone
    const target = Math.min(0.955, 0.8 * size.width / size.height);
    g.current.scale.setScalar(lerp(g.current.scale.x, target, 0.12));
    g.current.position.y = lerp(g.current.position.y, 0, 0.12);
  });
  return <group ref={g} scale={0.8}>{children}</group>;
}

/* ============================================================================
   SCENE ROOT (inside Canvas)
   ============================================================================ */

function SceneRoot({ state, gold, cyan, enableRotate, onIconClick, onToggleOnline, onScreenAction }) {
  const [hovered, setHovered] = useState(false);
  const { feature, platform, online, queued, flush, bellPing, pulsePing, view } = state;

  return (
    <>
      {/* cheap lighting: one key light + ambient for the glossy body */}
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 6]} intensity={1.5} />
      <directionalLight position={[-4, -2, 3]} intensity={0.4} color={cyan} />
      <RigLight gold={gold} cyan={cyan} />
      <pointLight position={[0, 0, 2.2]} intensity={0.5} color={gold} distance={5} />

      {/* Fit the model inside the existing square service card. */}
      <ResponsiveStage>
        {/* atmospheric bloom behind the device */}
        <SoftGlow color={gold} opacity={0.22} scale={[9, 10]} position={[0, 0.1, -1.4]} />
        <SoftGlow color={cyan} opacity={0.16} scale={[6, 7]} position={[0.7, -0.4, -1.2]} />

        <GoldDust gold={gold} />

        <PulseRing trigger={pulsePing} gold={gold} cyan={cyan} />

        <PhoneRig hovered={hovered} setHovered={setHovered}>
          <Phone
            platform={platform} feature={feature} online={online}
            gold={gold} cyan={cyan} hovered={hovered} pulsePing={pulsePing}
            onAction={onScreenAction}
          />
          <Notifications active={feature === 2} bellPing={bellPing} gold={gold} cyan={cyan} />
          <PaymentCard active={feature === 3} gold={gold} cyan={cyan} />
        </PhoneRig>

        <CloudSync
          online={online} queued={queued} flush={flush} feature={feature}
          gold={gold} cyan={cyan} onToggleOnline={onToggleOnline}
        />
        <OrbitIcons gold={gold} cyan={cyan} onIconClick={onIconClick} />

      </ResponsiveStage>

      <EaseBackControls enabled={enableRotate} view={view} />
    </>
  );
}


const initialState = {
  feature: 0, autoPlay: true, platform: "ios", online: true, queued: 0,
  flush: { id: 0, count: 0 }, bellPing: 0, pulsePing: 0, view: "front",
};

function sceneReducer(state, action) {
  switch (action.type) {
    case "pause":
      return state.autoPlay ? { ...state, autoPlay: false } : state;
    case "advance":
      return { ...state, feature: (state.feature + 1) % FEATURE_COUNT };
    case "platform":
      return { ...state, platform: state.platform === "ios" ? "android" : "ios" };
    case "queue":
      return { ...state, queued: Math.min(state.queued + 1, 12) };
    case "network": {
      const online = action.online ?? !state.online;
      const flush = !state.online && online && state.queued > 0;
      return {
        ...state, online,
        autoPlay: action.manual ? false : state.autoPlay,
        feature: action.manual ? 1 : state.feature,
        queued: flush ? 0 : state.queued,
        flush: flush ? { id: state.flush.id + 1, count: state.queued } : state.flush,
      };
    }
    case "icon": {
      const notification = action.icon === "bell" || action.icon === "chat";
      return {
        ...state, autoPlay: false,
        feature: notification ? 2 : action.icon === "card" ? 3 : 0,
        pulsePing: state.pulsePing + 1,
        bellPing: state.bellPing + (notification ? 1 : 0),
      };
    }
    case "screen": {
      const feature = (state.feature + 1) % FEATURE_COUNT;
      return { ...state, autoPlay: false, feature,
        pulsePing: state.pulsePing + 1,
        bellPing: state.bellPing + (feature === 2 ? 1 : 0),
      };
    }
    default:
      return state;
  }
}

function subscribePointer(callback) {
  const media = window.matchMedia("(pointer: coarse)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const getTouchSnapshot = () => window.matchMedia("(pointer: coarse)").matches;
const getServerTouchSnapshot = () => true;

export default function AppDevScene({ light = false, renderActive = true }) {
  const [state, dispatch] = useReducer(sceneReducer, initialState);
  const isTouch = useSyncExternalStore(subscribePointer, getTouchSnapshot, getServerTouchSnapshot);
  const gold = light ? "#b87d14" : "#f5c451";
  const cyan = light ? "#0077b6" : "#6cc7e8";

  useEffect(() => {
    if (!renderActive) return;
    if (state.online) return;
    const id = window.setInterval(() => dispatch({ type: "queue" }), 650);
    return () => window.clearInterval(id);
  }, [state.online, renderActive]);

  useEffect(() => {
    if (!renderActive) return;
    if (!state.autoPlay) return;
    const id = window.setInterval(() => dispatch({ type: "advance" }), 3200);
    return () => window.clearInterval(id);
  }, [state.autoPlay, renderActive]);

  useEffect(() => {
    if (!renderActive) return;
    if (!state.autoPlay) return;
    const timers = [];
    if (state.feature === 0) {
      timers.push(window.setTimeout(() => dispatch({ type: "platform" }), 1100));
    }
    if (state.feature === 1) {
      timers.push(window.setTimeout(() => dispatch({ type: "network", online: false }), 200));
      timers.push(window.setTimeout(() => dispatch({ type: "network", online: true }), 2300));
    }
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [state.feature, state.autoPlay, renderActive]);

  const onIconClick = useCallback((icon) => dispatch({ type: "icon", icon }), []);
  const onToggleOnline = useCallback(() => dispatch({ type: "network", manual: true }), []);
  const onScreenAction = useCallback(() => dispatch({ type: "screen" }), []);

  return (
    <div className="absolute inset-0"
      onPointerDownCapture={(event) => { if (event.pointerType !== "touch" || !event.isPrimary) dispatch({ type: "pause" }); }}
      onClickCapture={(event) => { if (event.nativeEvent.pointerType === "touch") dispatch({ type: "pause" }); }}
    >
      <ScenePreparation name="app">
        {(onPrepared) => (
          <Canvas
            frameloop={renderActive ? "always" : "demand"}
            gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
            dpr={servicePixelRatio(renderActive)}
            camera={{ position: [0, 0, 8.45], fov: 44 }}
            style={{ position: "absolute", inset: 0, background: "transparent", touchAction: isTouch ? "pan-y" : "none" }}
          >
            <SceneViewport fov={44} />
            <SceneRoot
              state={state} gold={gold} cyan={cyan} enableRotate
              onIconClick={onIconClick} onToggleOnline={onToggleOnline} onScreenAction={onScreenAction}
            />
            <SceneCompilation />
            <SceneWarmup onRendered={onPrepared} />
          </Canvas>
        )}
      </ScenePreparation>
    </div>
  );
}
