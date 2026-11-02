"use client";

/** 3D scene adapted from saas three.js/src/SaasProductScene.jsx.
 * Preview page styling, HUD controls, and HTML labels are excluded. */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useReducer,
  useSyncExternalStore,
} from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";

/* ------------------------------------------------------------------
   SAAS PRODUCT SCENE — "The SaaS Loop"
   A procedural, self-contained R3F story: idea → customers → cash.
   No textures, models or images. Pure geometry + DOM labels.
-------------------------------------------------------------------*/

const CORAL = "#ff6b6b";
const STAGE_MS = 4400;

const STAGES = [
  {
    n: "01",
    title: "IDEA TO MVP",
    tab: "Idea to MVP",
    desc: "A working core first — customers can use the product from day one.",
    tip: "SPARK → WIREFRAME → PRODUCT",
  },
  {
    n: "02",
    title: "AUTH, TEAMS, ROLES",
    tab: "Auth & teams",
    desc: "Customers sign up, invite their team and enter a private workspace.",
    tip: "TAP A TENANT TO INSPECT IT",
  },
  {
    n: "03",
    title: "SUBSCRIPTIONS & WEBHOOKS",
    tab: "Subscriptions",
    desc: "They pay monthly; webhooks keep access in sync automatically.",
    tip: "TAP A PLAN CARD TO CHANGE IT",
  },
  {
    n: "04",
    title: "USAGE & PLANS",
    tab: "Usage & plans",
    desc: "Metering turns a reached limit into a natural, paid upgrade.",
    tip: "CORAL = LIMIT · CYAN = HEALTHY",
  },
  {
    n: "05",
    title: "BILLING & MRR",
    tab: "Billing & MRR",
    desc: "Paid invoices become recurring revenue that compounds every month.",
    tip: "MRR TICKS TO $12,400",
  },
];

const PLANS = [
  { id: "free", name: "FREE", price: "$0", per: "/mo", limit: 25000, seats: 3, note: "1 WORKSPACE" },
  { id: "pro", name: "PRO", price: "$29", per: "/mo", limit: 60000, seats: 12, note: "MOST POPULAR" },
  { id: "business", name: "BUSINESS", price: "$99", per: "/mo", limit: 120000, seats: 40, note: "SCALE + SSO" },
];

const POD_DEFS = [
  {
    id: "acme",
    name: "ACME",
    pos: [-2.2, -0.58, 0.75],
    usageBase: 0.42,
    seats: 12,
    team: [
      { name: "Riya", role: "Owner" },
      { name: "Marco", role: "Admin" },
      { name: "Jin", role: "Member" },
    ],
  },
  {
    id: "nova",
    name: "NOVA",
    pos: [2.2, -0.58, 0.75],
    usageBase: 0.64,
    seats: 8,
    team: [
      { name: "Ada", role: "Owner" },
      { name: "Kai", role: "Admin" },
      { name: "Noor", role: "Member" },
    ],
  },
  {
    id: "zenith",
    name: "ZENITH",
    pos: [0, -0.92, 1.72],
    usageBase: 0.52,
    seats: 24,
    team: [
      { name: "Omar", role: "Owner" },
      { name: "Lea", role: "Admin" },
      { name: "Vic", role: "Member" },
    ],
  },
];

const DEFAULT_CAM = [0, 0.95, 9.7];
const CAM_TARGET = [0, 0.16, 0];
const GATE_POS = [-1.5, -0.5, 2.05];

/* ------------------------------ utils ------------------------------ */

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const damp = (current, target, lambda, dt) =>
  THREE.MathUtils.damp(current, target, lambda, dt);
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOutCubic = (x) => 1 - Math.pow(1 - clamp(x), 3);
const fmt = (n) => Math.round(n).toLocaleString("en-US");


/* The stage clock is shared with every object through context. */
const TimelineContext = React.createContext(null);
const useTimeline = () => React.useContext(TimelineContext);

/* Capture the authored opacity of every material so groups can fade. */
function useCaptureOpacities(groupRef) {
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.traverse((node) => {
      const mats = node.material
        ? Array.isArray(node.material)
          ? node.material
          : [node.material]
        : [];
      mats.forEach((m) => {
        if (m.userData.__baseOpacity === undefined) {
          m.userData.__baseOpacity = m.opacity ?? 1;
        }
        m.transparent = true;
      });
    });
  }, [groupRef]);
}

/* A group that eases in/out for its stage. */
function StageGroup({ active, children, speed = 5, from = 0.82, ...props }) {
  const group = useRef();
  const v = useRef(active ? 1 : 0);
  useCaptureOpacities(group);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    v.current = damp(v.current, active ? 1 : 0, speed, dt);
    g.visible = v.current > 0.015;
    const s = from + (1 - from) * v.current;
    g.scale.setScalar(Math.max(0.001, s));
    g.traverse((node) => {
      const mats = node.material
        ? Array.isArray(node.material)
          ? node.material
          : [node.material]
        : [];
      mats.forEach((m) => {
        if (m.userData.__baseOpacity !== undefined) {
          m.opacity = m.userData.__baseOpacity * v.current;
        }
      });
    });
  });

  return (
    <group ref={group} {...props}>
      {children}
    </group>
  );
}

/* Thin flat stroke, used for wireframe sketches. */
function Stroke({ position, size, color, opacity = 0.7, ...props }) {
  return (
    <mesh position={position} {...props}>
      <boxGeometry args={[size[0], size[1], size[2] ?? 0.004]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

/* --------------------------- responsive camera --------------------------- */

function CameraRig({ focusId, enableRotate, controlsRef }) {
  const { camera, size } = useThree();
  const prevFocus = useRef(focusId);
  const returning = useRef(false);
  const dragging = useRef(false);
  const aspectFix = useRef(false);
  const lastAspect = useRef(0);
  const tmpDefault = useMemo(() => new THREE.Vector3(), []);
  const tmpTarget = useMemo(() => new THREE.Vector3(), []);
  const tmpCam = useMemo(() => new THREE.Vector3(), []);

  const focusPod = focusId ? POD_DEFS.find((p) => p.id === focusId) : null;

  useFrame((_, dt) => {
    const controls = controlsRef.current;
    const aspect = size.width / Math.max(1, size.height);
    const fitZ = Math.max(9.5, 3.2 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect));
    tmpDefault.set(DEFAULT_CAM[0], DEFAULT_CAM[1], fitZ);
    tmpTarget.set(CAM_TARGET[0], CAM_TARGET[1], CAM_TARGET[2]);

    if (prevFocus.current !== focusId) {
      prevFocus.current = focusId;
      returning.current = !focusId;
      if (controls) controls.enabled = false;
    }

    if (focusPod) {
      /* Centre on the inspected tenant so its detail card always fits. */
      tmpCam.set(focusPod.pos[0], focusPod.pos[1] + 1.1, focusPod.pos[2] + 5.0);
      camera.position.lerp(tmpCam, 1 - Math.exp(-dt * 3.2));
      if (controls) {
        controls.target.lerp(
          tmpCam.set(focusPod.pos[0], focusPod.pos[1] + 0.8, focusPod.pos[2] + 0.3),
          1 - Math.exp(-dt * 3.2)
        );
      }
      return;
    }

    /* Responsive framing: keep the full loop in view at any aspect ratio. */
    if (!focusPod && !returning.current && !dragging.current) {
      if (Math.abs(lastAspect.current - aspect) > 0.015 || !aspectFix.current) {
        lastAspect.current = aspect;
        aspectFix.current = true;
        tmpCam.copy(camera.position).sub(controls ? controls.target : tmpTarget);
        const dist = Math.max(0.1, tmpCam.length());
        camera.position.copy(controls ? controls.target : tmpTarget).add(tmpCam.multiplyScalar(fitZ / dist));
        camera.position.setY(DEFAULT_CAM[1]);
        if (controls) controls.update();
      }
    }

    if (returning.current) {
      camera.position.lerp(tmpDefault, 1 - Math.exp(-dt * 2.6));
      if (controls) {
        controls.target.lerp(tmpTarget, 1 - Math.exp(-dt * 2.6));
        if (camera.position.distanceTo(tmpDefault) < 0.05) {
          returning.current = false;
          if (enableRotate) {
            controls.enabled = true;
            controls.update();
          }
        }
      }
    }
  });

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.target.set(CAM_TARGET[0], CAM_TARGET[1], CAM_TARGET[2]);
    const onStart = () => {
      returning.current = false;
      dragging.current = true;
    };
    const onEnd = () => {
      dragging.current = false;
      returning.current = true;
      controls.enabled = false;
    };
    controls.addEventListener("start", onStart);
    controls.addEventListener("end", onEnd);
    return () => {
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
    };
  }, [controlsRef]);

  return null;
}

/* ------------------------------- ticker -------------------------------- */

function Ticker({ clockRef, stage, stageStartRef }) {
  useFrame(() => {
    const c = clockRef.current;
    c.stage = stage;
    c.p = clamp((performance.now() - stageStartRef.current) / STAGE_MS);
    c.t = performance.now() / 1000;
  });
  return null;
}

/* =====================================================================
   SCENE CONTENT — components below are defined further down the file.
===================================================================== */

function SceneContent({
  stage,
  plan,
  gold,
  cyan,
  focusId,
  setFocus,
  onSelectPlan,
  onUserInteract,
  controlsRef,
  enableRotate,
}) {
  const parallax = useRef();
  const [hovered, setHovered] = useState(null);

  return (
    <>
      <ParallaxGroup groupRef={parallax}>
        <SceneBody
          stage={stage}
          plan={plan}
          gold={gold}
          cyan={cyan}
          focusId={focusId}
          setFocus={setFocus}
          onSelectPlan={onSelectPlan}
          onUserInteract={onUserInteract}
          hovered={hovered}
          setHovered={setHovered}
        />
      </ParallaxGroup>

      <CameraRig focusId={focusId} enableRotate={enableRotate} controlsRef={controlsRef} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={enableRotate && !focusId}
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
        minPolarAngle={1.02}
        maxPolarAngle={1.68}
        minAzimuthAngle={-0.85}
        maxAzimuthAngle={0.85}
      />
    </>
  );
}

function ParallaxGroup({ groupRef, children }) {
  useFrame(({ pointer }, dt) => {
    const g = groupRef.current;
    if (!g) return;
    g.rotation.y = damp(g.rotation.y, pointer.x * 0.16, 2.4, dt);
    g.rotation.x = damp(g.rotation.x, -pointer.y * 0.055, 2.4, dt);
  });
  return <group ref={groupRef}>{children}</group>;
}

/* =====================================================================
   Everything below is filled in by the scene modules.
===================================================================== */

function SceneBody({
  stage,
  plan,
  gold,
  cyan,
  focusId,
  setFocus,
  onSelectPlan,
  onUserInteract,
  hovered,
  setHovered,
}) {
  return (
    <group>
      <ProductCore stage={stage} gold={gold} cyan={cyan} />
      <CycleRing stage={stage} gold={gold} cyan={cyan} />
      <PaymentGateway stage={stage} gold={gold} cyan={cyan} muted={Boolean(focusId)} />
      <AuthGate stage={stage} gold={gold} cyan={cyan} />
      <AvatarField stage={stage} gold={gold} cyan={cyan} />
      <RoleIcons stage={stage} gold={gold} cyan={cyan} />
      <PlanCards stage={stage} plan={plan} muted={Boolean(focusId)} gold={gold} cyan={cyan} onSelect={onSelectPlan} onUserInteract={onUserInteract} />
      <UsageGaugeRow stage={stage} plan={plan} gold={gold} cyan={cyan} />
      <RevenueChart stage={stage} gold={gold} cyan={cyan} />
      <InvoiceSheet stage={stage} gold={gold} cyan={cyan} />
      {POD_DEFS.map((pod) => (
        <TenantPod
          key={pod.id}
          pod={pod}
          stage={stage}
          plan={plan}
          gold={gold}
          cyan={cyan}
          hovered={hovered === pod.id}
          focused={focusId === pod.id}
          anyFocus={Boolean(focusId)}
          onHover={(on) => setHovered(on ? pod.id : null)}
          onClick={() => {
            setFocus(pod.id);
            onUserInteract();
          }}
          onUserInteract={onUserInteract}
        />
      ))}
      <Dust gold={gold} cyan={cyan} />
    </group>
  );
}

/* =====================================================================
   PRODUCT CORE — a floating glass dashboard on a gold wireframe rig.
   Stage 01 sketches it line-by-line, then fills the UI.
===================================================================== */

const PANEL_W = 2.16;
const PANEL_H = 1.32;

function ProductCore({ stage, gold, cyan }) {
  const clock = useTimeline();
  const root = useRef();
  const content = useRef();
  const sketch = useRef();
  const spark = useRef();
  const sparkGlow = useRef();
  const fillMats = useRef([]);
  const ringA = useRef();
  const ringB = useRef();

  const sketchStrokes = useMemo(
    () => [
      { pos: [0, PANEL_H / 2, 0.005], size: [PANEL_W, 0.012, 0.003], d: 0 },
      { pos: [PANEL_W / 2, 0, 0.005], size: [0.012, PANEL_H, 0.003], d: 0.1 },
      { pos: [0, -PANEL_H / 2, 0.005], size: [PANEL_W, 0.012, 0.003], d: 0.2 },
      { pos: [-PANEL_W / 2, 0, 0.005], size: [0.012, PANEL_H, 0.003], d: 0.3 },
      { pos: [0, 0.44, 0.005], size: [PANEL_W, 0.008, 0.003], d: 0.4 },
      { pos: [-0.74, -0.08, 0.005], size: [0.008, 1.0, 0.003], d: 0.5 },
      { pos: [0.12, 0.17, 0.005], size: [1.68, 0.008, 0.003], d: 0.6 },
      { pos: [0.12, -0.28, 0.005], size: [1.68, 0.008, 0.003], d: 0.7 },
    ],
    []
  );

  /* Dashboard chart line geometry */
  const chartGeo = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 22; i += 1) {
      const x = -0.52 + (i / 22) * 1.28;
      const y = -0.34 + Math.sin(i * 0.62) * 0.055 + (i / 22) * 0.12;
      pts.push(new THREE.Vector3(x, y, 0.085));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  useEffect(() => () => chartGeo.dispose(), [chartGeo]);

  useEffect(() => {
    const list = [];
    content.current?.traverse((node) => {
      if (!node.material) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((m) => {
        if (m.userData.__coreBase === undefined) m.userData.__coreBase = m.opacity ?? 1;
        list.push(m);
      });
    });
    fillMats.current = list;
  }, []);

  useFrame((state, dt) => {
    const t = clock.current;
    const active = stage === 0;
    const p = active ? t.p : 1;
    const time = t.t || state.clock.elapsedTime;

    if (root.current) {
      root.current.position.y = 0.5 + Math.sin(time * 0.7) * 0.045;
      root.current.rotation.y = Math.sin(time * 0.3) * 0.045;
      root.current.rotation.z = Math.sin(time * 0.42) * 0.008;
      const pop = active ? 0.35 + 0.65 * smoothstep(0.02, 0.22, p) : 1;
      root.current.scale.setScalar(damp(root.current.scale.x, pop, 8, dt));
    }

    /* UI content fades in after the wireframe has been sketched. */
    const fill = active ? smoothstep(0.3, 0.7, p) : 1;
    fillMats.current.forEach((m) => {
      m.opacity = (m.userData.__coreBase ?? 1) * fill;
    });
    if (content.current) {
      content.current.position.y = damp(content.current.position.y, active ? (1 - fill) * -0.025 : 0, 6, dt);
    }

    /* Blueprint lines draw sequentially. */
    if (sketch.current) {
      sketch.current.visible = active && p < 0.55;
      sketch.current.children.forEach((child, i) => {
        if (!child.userData.sketch) return;
        const s = child.userData;
        const draw = smoothstep(0.02 + s.d * 0.42, 0.12 + s.d * 0.42, p);
        child.scale.x = s.size[0] > s.size[1] ? Math.max(0.001, draw) : 1;
        child.scale.y = s.size[1] > s.size[0] ? Math.max(0.001, draw) : 1;
      });
    }

    /* The cyan idea-spark travels around the sketch. */
    if (spark.current && sparkGlow.current) {
      spark.current.visible = active && p < 0.62;
      sparkGlow.current.visible = active && p < 0.62;
      const seg = clamp(p / 0.55) * 4;
      const side = Math.min(3, Math.floor(seg));
      const f = seg - side;
      const hw = PANEL_W / 2;
      const hh = PANEL_H / 2;
      let x = -hw;
      let y = hh;
      if (side === 0) x = -hw + f * PANEL_W;
      else if (side === 1) {
        x = hw;
        y = hh - f * PANEL_H;
      } else if (side === 2) {
        x = hw - f * PANEL_W;
        y = -hh;
      } else {
        x = -hw;
        y = -hh + f * PANEL_H;
      }
      spark.current.position.set(x, y, 0.15);
      sparkGlow.current.position.set(x, y, 0.14);
      const pulse = 1 + Math.sin(time * 7) * 0.18;
      sparkGlow.current.scale.setScalar(pulse);
    }

    if (ringA.current) ringA.current.rotation.z = time * 0.16;
    if (ringB.current) ringB.current.rotation.z = -time * 0.11;
  });

  return (
    <group ref={root} position={[0, 0.5, 0]}>
      {/* orbital rigs */}
      <group rotation={[1.2, 0.16, 0.32]}>
        <mesh>
          <torusGeometry args={[1.53, 0.0045, 6, 128]} />
          <meshBasicMaterial color={gold} transparent opacity={0.26} depthWrite={false} />
        </mesh>
        <group ref={ringA}>
          <mesh position={[1.53, 0, 0]}>
            <sphereGeometry args={[0.032, 10, 10]} />
            <meshBasicMaterial color={gold} transparent opacity={0.9} />
          </mesh>
          <mesh position={[-1.53, 0, 0]}>
            <sphereGeometry args={[0.018, 8, 8]} />
            <meshBasicMaterial color={cyan} transparent opacity={0.8} />
          </mesh>
        </group>
      </group>
      <group rotation={[1.45, -0.28, -0.22]}>
        <mesh>
          <torusGeometry args={[1.78, 0.0035, 6, 128]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.15} depthWrite={false} />
        </mesh>
        <group ref={ringB}>
          <mesh position={[0, 1.78, 0]}>
            <sphereGeometry args={[0.022, 8, 8]} />
            <meshBasicMaterial color={cyan} transparent opacity={0.75} />
          </mesh>
        </group>
      </group>

      {/* corner brackets */}
      {[
        [-1.15, 0.72],
        [1.15, 0.72],
        [-1.15, -0.72],
        [1.15, -0.72],
      ].map(([x, y], i) => (
        <group key={i} position={[x, y, 0]}>
          <Stroke position={[x > 0 ? -0.08 : 0.08, 0, 0.045]} size={[0.16, 0.009, 0.003]} color={gold} opacity={0.6} />
          <Stroke position={[0, y > 0 ? -0.08 : 0.08, 0.045]} size={[0.009, 0.16, 0.003]} color={gold} opacity={0.6} />
        </group>
      ))}

      {/* glass dashboard panel */}
      <group>
        <RoundedBox args={[PANEL_W, PANEL_H, 0.07]} radius={0.075} smoothness={3}>
          <meshBasicMaterial color="#17130f" transparent opacity={0.9} depthWrite={false} />
        </RoundedBox>
        <RoundedBox args={[PANEL_W - 0.05, PANEL_H - 0.05, 0.02]} radius={0.06} smoothness={2} position={[0, 0, 0.045]}>
          <meshBasicMaterial color="#221c14" transparent opacity={0.5} depthWrite={false} />
        </RoundedBox>
        <Stroke position={[0, PANEL_H / 2 - 0.03, 0.085]} size={[PANEL_W - 0.1, 0.003, 0.002]} color={gold} opacity={0.5} />

        <group ref={content}>
          {/* header chrome */}
          <group userData={{ coreFill: true }}>
            {[-0.94, -0.88, -0.82].map((x, i) => (
              <mesh key={x} position={[x, 0.55, 0.085]} userData={{ coreFill: true }}>
                <circleGeometry args={[0.017, 10]} />
                <meshBasicMaterial color={i === 0 ? gold : i === 1 ? cyan : "#7b6a4d"} transparent opacity={i === 2 ? 0.4 : 0.85} />
              </mesh>
            ))}
            <mesh position={[-0.22, 0.55, 0.085]} userData={{ coreFill: true }}>
              <planeGeometry args={[0.56, 0.075]} />
              <meshBasicMaterial color={gold} transparent opacity={0.09} />
            </mesh>
            <Stroke position={[-0.22, 0.55, 0.09]} size={[0.56, 0.06, 0.001]} color={gold} opacity={0.16} />
            <mesh position={[0.96, 0.55, 0.085]} userData={{ coreFill: true }}>
              <circleGeometry args={[0.04, 12]} />
              <meshBasicMaterial color={gold} transparent opacity={0.7} />
            </mesh>
          </group>

          {/* sidebar */}
          <group userData={{ coreFill: true }}>
            <Stroke position={[-0.74, -0.1, 0.08]} size={[0.006, 0.96, 0.002]} color={gold} opacity={0.22} />
            {[0.3, 0.16, 0.02, -0.12].map((y, i) => (
              <group key={y} position={[0, y, 0]} userData={{ coreFill: true }}>
                <mesh position={[-0.94, 0, 0.082]}>
                  <boxGeometry args={[0.06, 0.06, 0.004]} />
                  <meshBasicMaterial color={i === 0 ? gold : "#7c6a4a"} transparent opacity={i === 0 ? 0.85 : 0.35} />
                </mesh>
                <Stroke position={[-0.82, 0, 0.082]} size={[0.26, 0.018, 0.002]} color={gold} opacity={i === 0 ? 0.5 : 0.18} />
                {i === 0 && (
                  <mesh position={[-0.6, 0, 0.083]}>
                    <circleGeometry args={[0.012, 8]} />
                    <meshBasicMaterial color={cyan} transparent opacity={0.9} />
                  </mesh>
                )}
              </group>
            ))}
            <Stroke position={[-0.9, -0.42, 0.08]} size={[0.3, 0.06, 0.003]} color={cyan} opacity={0.2} />
          </group>

          {/* KPI cards */}
          <group position={[0.16, 0.25, 0]} userData={{ coreFill: true }}>
            {[
              { x: -0.44, tone: gold, v: 0.62 },
              { x: 0.06, tone: cyan, v: 0.4 },
              { x: 0.56, tone: gold, v: 0.78 },
            ].map((c, i) => (
              <group key={c.x} position={[c.x, 0, 0]}>
                <RoundedBox args={[0.42, 0.24, 0.012]} radius={0.03} smoothness={2} position={[0, 0, 0.078]}>
                  <meshBasicMaterial color={i === 1 ? "#1a2a30" : "#241d14"} transparent opacity={0.6} />
                </RoundedBox>
                <Stroke position={[0, 0.095, 0.088]} size={[0.42, 0.004, 0.001]} color={c.tone} opacity={0.25} />
                <Stroke position={[-0.05, 0.035, 0.09]} size={[0.22, 0.022, 0.001]} color={c.tone} opacity={0.7} />
                <Stroke position={[-0.1, -0.01, 0.09]} size={[0.12, 0.012, 0.001]} color="#8b7a5f" opacity={0.32} />
                <mesh position={[-0.13 + c.v * 0.05, -0.075, 0.09]} scale={[c.v, 0.28, 1]}>
                  <planeGeometry args={[0.26, 0.014]} />
                  <meshBasicMaterial color={c.tone} transparent opacity={0.35} />
                </mesh>
              </group>
            ))}
          </group>

          {/* chart card */}
          <group position={[0.16, -0.22, 0]} userData={{ coreFill: true }}>
            <RoundedBox args={[1.44, 0.5, 0.012]} radius={0.03} smoothness={2} position={[0, 0, 0.07]}>
              <meshBasicMaterial color="#1d1811" transparent opacity={0.55} />
            </RoundedBox>
            {[0, 1, 2].map((i) => (
              <Stroke key={i} position={[0, 0.14 - i * 0.13, 0.078]} size={[1.3, 0.003, 0.001]} color={gold} opacity={0.1} />
            ))}
            {[0.1, 0.25, 0.18, 0.36, 0.3, 0.47, 0.42].map((h, i) => (
              <mesh key={i} position={[-0.58 + i * 0.085, -0.2 + h / 2, 0.08]}>
                <boxGeometry args={[0.038, h, 0.004]} />
                <meshBasicMaterial color={gold} transparent opacity={0.16 + i * 0.03} />
              </mesh>
            ))}
            <line geometry={chartGeo}>
              <lineBasicMaterial color={cyan} transparent opacity={0.9} />
            </line>
            <mesh position={[0.76, 0.16, 0.085]}>
              <circleGeometry args={[0.02, 10]} />
              <meshBasicMaterial color={cyan} transparent opacity={0.95} />
            </mesh>
          </group>
        </group>
      </group>

      {/* blueprint wireframe overlay for stage 01 */}
      <group ref={sketch} position={[0, 0, 0]}>
        {sketchStrokes.map((s, i) => (
          <mesh
            key={i}
            position={[s.pos[0], s.pos[1], 0.115]}
            userData={{ sketch: true, size: s.size, d: s.d }}
          >
            <boxGeometry args={[s.size[0], s.size[1], 0.002]} />
            <meshBasicMaterial color={i % 2 === 0 ? gold : cyan} transparent opacity={0.75} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* idea spark */}
      <group>
        <mesh ref={spark}>
          <sphereGeometry args={[0.028, 12, 12]} />
          <meshBasicMaterial color={cyan} />
        </mesh>
        <mesh ref={sparkGlow}>
          <sphereGeometry args={[0.085, 12, 12]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>

      {null}

      {stage === 0 && (
        null
      )}
    </group>
  );
}

/* =====================================================================
   TENANT POD — a small wireframe office, one per customer company.
===================================================================== */

function TenantPod({
  pod,
  stage,
  plan,
  gold,
  cyan,
  hovered,
  focused,
  anyFocus,
  onHover,
  onClick,
}) {
  const clock = useTimeline();
  const root = useRef();
  const packet = useRef();
  const packetBack = useRef();
  const accent = useRef(new THREE.Color(gold));
  const lift = useRef(0);
  const bobSeed = useMemo(() => Math.abs(pod.pos[0]) * 0.7 + pod.pos[2], [pod.pos]);
  const planObj = PLANS[plan];
  const windowMats = useRef([]);

  const edges = useMemo(() => { const source = new THREE.BoxGeometry(0.6, 0.6, 0.42); const edges = new THREE.EdgesGeometry(source); source.dispose(); return edges; }, []);
  const roofEdges = useMemo(() => { const source = new THREE.BoxGeometry(0.66, 0.06, 0.48); const edges = new THREE.EdgesGeometry(source); source.dispose(); return edges; }, []);
  useEffect(
    () => () => {
      edges.dispose();
      roofEdges.dispose();
    },
    [edges, roofEdges]
  );

  const accentMats = useRef([]);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const coreLocal = useMemo(
    () => new THREE.Vector3(-pod.pos[0], 0.42 - pod.pos[1], -pod.pos[2]),
    [pod.pos]
  );

  const connection = useMemo(() => {
    const start = new THREE.Vector3(0, 0.32, 0);
    const mid = start.clone().lerp(coreLocal, 0.5);
    mid.y += 0.5;
    const curve = new THREE.QuadraticBezierCurve3(start, mid, coreLocal.clone());
    return {
      curve,
      geometry: new THREE.BufferGeometry().setFromPoints(curve.getPoints(36)),
    };
  }, [coreLocal]);

  useEffect(() => () => connection.geometry.dispose(), [connection]);

  useEffect(() => {
    accentMats.current = [];
    windowMats.current = [];
    root.current?.traverse((node) => {
      if (node.userData?.podAccent && node.material) accentMats.current.push(node.material);
      if (node.userData?.podWindow && node.material) windowMats.current.push(node.material);
    });
  }, []);

  useFrame((state, dt) => {
    const t = clock.current;
    const time = t.t || state.clock.elapsedTime;
    const g = root.current;
    if (!g) return;

    const targetLift = hovered ? 0.19 : focused ? 0.1 : 0;
    lift.current = damp(lift.current, targetLift, 7, dt);
    g.position.y = pod.pos[1] + lift.current + Math.sin(time * 0.8 + bobSeed) * 0.014;
    g.rotation.y = damp(g.rotation.y, hovered ? (pod.pos[0] > 0 ? 0.12 : -0.12) : 0, 4, dt);

    const hot = hovered || focused;
    tmpColor.set(hot ? cyan : "#9a8257");
    accent.current.lerp(tmpColor, 1 - Math.exp(-dt * 8));
    const dim = stage === 0 ? 0.45 : 1;
    accentMats.current.forEach((m) => {
      m.color.copy(accent.current);
      m.opacity = (hot ? 0.95 : 0.46) * dim;
    });
    windowMats.current.forEach((m) => {
      m.opacity = (hot ? 0.55 : 0.24) * dim;
    });

    /* Animated data pulse travelling from tenant to core. */
    if (packet.current) {
      packet.current.visible = stage >= 1;
      const pp = (time * 0.22 + bobSeed * 0.3) % 1;
      packet.current.position.copy(connection.curve.getPointAt(pp));
      const s = 0.7 + Math.sin(time * 5 + bobSeed) * 0.2;
      packet.current.scale.setScalar(s);
    }
    if (packetBack.current) {
      packetBack.current.visible = stage >= 3;
      const pp = (time * 0.18 + 0.4 + bobSeed * 0.2) % 1;
      packetBack.current.position.copy(connection.curve.getPointAt(1 - pp));
      packetBack.current.scale.setScalar(0.8);
      packetBack.current.material.opacity = 0.55;
    }
  });

  const usagePct = Math.round(pod.usageBase * 100);
  const status = stage >= 2 ? "ACTIVE" : stage === 1 ? "ONBOARDING" : "PROSPECT";
  const statusColor = stage >= 2 ? gold : stage === 1 ? cyan : "#8b7a5f";

  return (
    <group ref={root} position={pod.pos}>
      {/* connection to core */}
      <line geometry={connection.geometry}>
        <lineBasicMaterial color={cyan} transparent opacity={stage === 0 ? 0.13 : 0.32} depthWrite={false} />
      </line>
      <mesh ref={packet}>
        <sphereGeometry args={[0.024, 8, 8]} />
        <meshBasicMaterial color={cyan} transparent opacity={0.95} />
      </mesh>
      <mesh ref={packetBack}>
        <sphereGeometry args={[0.016, 8, 8]} />
        <meshBasicMaterial color={gold} transparent opacity={0.6} />
      </mesh>

      {/* platform */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <ringGeometry args={[0.3, 0.44, 64]} />
        <meshBasicMaterial color={gold} transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[0.45, 0.455, 64]} />
        <meshBasicMaterial color={gold} transparent opacity={0.38} />
      </mesh>

      {/* wireframe office building */}
      <group position={[0, 0.3, 0]}>
        <lineSegments geometry={edges}>
          <lineBasicMaterial userData={{ podAccent: true }} color={gold} transparent opacity={0.5} />
        </lineSegments>
        <mesh position={[0, 0.33, 0]}>
          <boxGeometry args={[0.6, 0.06, 0.42]} />
          <meshBasicMaterial color="#1c1711" transparent opacity={0.9} />
        </mesh>
        <lineSegments geometry={roofEdges} position={[0, 0.33, 0]}>
          <lineBasicMaterial userData={{ podAccent: true }} color={gold} transparent opacity={0.6} />
        </lineSegments>

        {/* office windows */}
        {[-0.16, 0, 0.16].map((x) =>
          [0.02, 0.14, 0.26].map((y) => (
            <mesh key={`${x}-${y}`} position={[x, y - 0.06, 0.211]}>
              <planeGeometry args={[0.085, 0.045]} />
              <meshBasicMaterial userData={{ podWindow: true }} color={cyan} transparent opacity={0.26} />
            </mesh>
          ))
        )}
        {[-0.12, 0, 0.12].map((z) => (
          <mesh key={z} position={[-0.301, 0.12, z]}>
            <planeGeometry args={[0.05, 0.05]} />
            <meshBasicMaterial userData={{ podWindow: true }} color={cyan} transparent opacity={0.2} />
          </mesh>
        ))}

        {/* antenna + beacon */}
        <mesh position={[0.18, 0.46, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.2, 5]} />
          <meshBasicMaterial color={gold} transparent opacity={0.55} />
        </mesh>
        <mesh position={[0.18, 0.57, 0]}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshBasicMaterial color={statusColor} transparent opacity={0.95} />
        </mesh>

        {/* ground floor accent */}
        <mesh position={[0, -0.24, 0.212]}>
          <planeGeometry args={[0.44, 0.05]} />
          <meshBasicMaterial color={gold} transparent opacity={0.16} />
        </mesh>
      </group>

      {/* tenant label — gauges take over this space from stage 04 */}
      {!hovered && !focused && stage < 3 && (
        null
      )}

      {/* hover tooltip */}
      {hovered && !focused && (
        null
      )}

      {/* focused tenant card */}
      {focused && (
        null
      )}

      {/* invisible hit area */}
      <mesh
        position={[0, 0.34, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(false);
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta > 5) return;
          onClick();
        }}
      >
        <boxGeometry args={[0.92, 1.0, 0.9]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

/* =====================================================================
   AUTH GATE — the gold arch customers pass through.
===================================================================== */

function AuthGate({ stage, gold, cyan }) {
  const clock = useTimeline();
  const root = useRef();
  const flash = useRef();
  const flashMat = useRef();
  const scanner = useRef();

  useFrame((state, dt) => {
    const p = clock.current.stage === 1 ? clock.current.p : 1;
    const time = clock.current.t || state.clock.elapsedTime;
    if (root.current) {
      root.current.position.y = GATE_POS[1] + Math.sin(time * 0.9) * 0.012;
      root.current.rotation.y = Math.sin(time * 0.35) * 0.12;
    }
    if (flash.current && flashMat.current) {
      const t = clamp((p - 0.15) / 0.3);
      flash.current.visible = stage === 1 && t > 0 && t < 1;
      flash.current.scale.setScalar(0.9 + t * 1.9);
      flashMat.current.opacity = (1 - t) * 0.65;
    }
    if (scanner.current) {
      scanner.current.position.y = -0.05 + ((time * 0.35) % 1) * 0.5;
      scanner.current.material.opacity = 0.1 + Math.sin(time * 3) * 0.03;
    }
    
  });

  return (
    <group ref={root} position={GATE_POS}>
      <StageGroup active={stage === 1} speed={5} from={0.8}>
        {/* base plate */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
          <ringGeometry args={[0.26, 0.34, 48]} />
          <meshBasicMaterial color={gold} transparent opacity={0.24} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
          <ringGeometry args={[0.42, 0.425, 48]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.18} />
        </mesh>

        {/* the arch */}
        <mesh>
          <torusGeometry args={[0.4, 0.015, 6, 48, Math.PI]} />
          <meshBasicMaterial color={gold} transparent opacity={0.95} />
        </mesh>
        <mesh position={[-0.4, -0.2, 0]}>
          <boxGeometry args={[0.016, 0.4, 0.016]} />
          <meshBasicMaterial color={gold} transparent opacity={0.7} />
        </mesh>
        <mesh position={[0.4, -0.2, 0]}>
          <boxGeometry args={[0.016, 0.4, 0.016]} />
          <meshBasicMaterial color={gold} transparent opacity={0.7} />
        </mesh>

        {/* scan sheet */}
        <mesh ref={scanner} position={[0, 0.15, 0]}>
          <planeGeometry args={[0.62, 0.03]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>

        {/* flash ring + check */}
        <mesh ref={flash}>
          <torusGeometry args={[0.34, 0.006, 4, 48]} />
          <meshBasicMaterial ref={flashMat} color={cyan} transparent opacity={0.4} depthWrite={false} />
        </mesh>
        {null}
      </StageGroup>

      {stage === 1 && (
        null
      )}
    </group>
  );
}

/* =====================================================================
   AVATARS — instanced people walking into their tenant workspace.
===================================================================== */

function AvatarField({ stage, gold, cyan }) {
  const clock = useTimeline();
  const heads = useRef();
  const bodies = useRef();
  const presence = useRef(0);
  const invite = useRef();
  const count = POD_DEFS.length * 4;

  const seed = useMemo(
    () =>
      POD_DEFS.flatMap((pod, pi) =>
        [0, 1, 2, 3].map((i) => ({
          pod,
          pi,
          i,
          end: new THREE.Vector3(pod.pos[0] + (i - 1.5) * 0.12, pod.pos[1] + 0.14, pod.pos[2] + 0.48),
          start: new THREE.Vector3(
            GATE_POS[0] + pi * 0.09 + i * 0.06,
            GATE_POS[1] + 0.08,
            GATE_POS[2] + 0.08 + i * 0.03
          ),
          delay: 0.06 + pi * 0.07 + i * 0.035,
        }))
      ),
    []
  );

  useEffect(() => {
    if (!heads.current || !bodies.current) return;
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i += 1) {
      m.makeTranslation(0, -10, 0);
      heads.current.setMatrixAt(i, m);
      bodies.current.setMatrixAt(i, m);
      heads.current.setColorAt(i, new THREE.Color(i % 4 === 0 ? gold : cyan));
      bodies.current.setColorAt(i, new THREE.Color(i % 4 === 0 ? gold : cyan));
    }
    heads.current.instanceMatrix.needsUpdate = true;
    bodies.current.instanceMatrix.needsUpdate = true;
    if (heads.current.instanceColor) heads.current.instanceColor.needsUpdate = true;
    if (bodies.current.instanceColor) bodies.current.instanceColor.needsUpdate = true;
  }, [count, gold, cyan]);

  useFrame((state, dt) => {
    const p = clock.current.stage === 1 ? clock.current.p : 1;
    const time = clock.current.t || state.clock.elapsedTime;
    presence.current = damp(presence.current, stage >= 1 ? 1 : 0, 4, dt);
    if (!heads.current || !bodies.current) return;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const pos = new THREE.Vector3();
    const inviteFrom = seed[0].end;

    seed.forEach((a, i) => {
      const walk = smoothstep(a.delay, a.delay + 0.3, p);
      const isInvited = a.i === 3;
      let appear = presence.current * (isInvited ? smoothstep(0.58, 0.78, p) : smoothstep(0.02, 0.14, p));
      if (stage >= 2) appear = presence.current * (isInvited ? 1 : 1);
      if (a.pi !== 0 && isInvited) appear = 0;

      const arc = Math.sin(walk * Math.PI) * 0.24;
      const bob = Math.sin(time * 7 + i) * 0.012 * (1 - walk);
      let x = THREE.MathUtils.lerp(a.start.x, a.end.x, easeOutCubic(walk));
      let z = THREE.MathUtils.lerp(a.start.z, a.end.z, easeOutCubic(walk));
      let y = a.end.y + bob + Math.sin(time * 1.3 + i) * 0.004 + arc * 0.2;

      if (isInvited && a.pi === 0) {
        const fly = smoothstep(0.58, 0.78, p);
        x = THREE.MathUtils.lerp(inviteFrom.x + 0.14, a.end.x, fly);
        z = THREE.MathUtils.lerp(inviteFrom.z + 0.02, a.end.z, fly);
        y = THREE.MathUtils.lerp(inviteFrom.y + 0.12, a.end.y, fly) + Math.sin(fly * Math.PI) * 0.15;
      }

      const s = Math.max(0.0001, appear * (0.92 + Math.sin(time * 2 + i) * 0.02));
      pos.set(x, y, z);
      scale.set(s, s, s);
      m.compose(pos, q, scale);
      bodies.current.setMatrixAt(i, m);

      pos.y = y + 0.155 * s;
      m.compose(pos, q, scale);
      heads.current.setMatrixAt(i, m);
    });

    heads.current.instanceMatrix.needsUpdate = true;
    bodies.current.instanceMatrix.needsUpdate = true;

    /* invite packet: avatar → new teammate */
    if (invite.current) {
      const f = smoothstep(0.5, 0.72, p);
      invite.current.visible = stage === 1 && f > 0 && f < 1;
      const from = inviteFrom;
      const to = seed[3].end;
      invite.current.position.set(
        THREE.MathUtils.lerp(from.x, to.x, f),
        THREE.MathUtils.lerp(from.y + 0.16, to.y + 0.14, f) + Math.sin(f * Math.PI) * 0.22,
        THREE.MathUtils.lerp(from.z, to.z, f)
      );
      invite.current.scale.setScalar(Math.max(0.001, 1 - Math.abs(f - 0.5) * 0.3));
    }
  });

  return (
    <group>
      <instancedMesh ref={bodies} args={[null, null, count]} frustumCulled={false}>
        <capsuleGeometry args={[0.029, 0.078, 4, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[null, null, count]} frustumCulled={false}>
        <sphereGeometry args={[0.041, 8, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.97} />
      </instancedMesh>

        <mesh ref={invite}>
          <octahedronGeometry args={[0.045, 0]} />
          <meshBasicMaterial color={gold} transparent opacity={0.95} />
        </mesh>
    </group>
  );
}

/* Role glyphs appear above each staffed pod. */
function RoleIcons({ stage, gold, cyan }) {
  return (
    <StageGroup active={stage >= 1} speed={4} from={0.6}>
      {POD_DEFS.map((pod, pi) => (
        <group key={pod.id} position={[pod.pos[0], pod.pos[1] + 0.36, pod.pos[2] + 0.49]}>
          {/* owner crown */}
          <group position={[-0.17, 0, 0]} rotation={[0, 0.25, 0]}>
            <mesh position={[0, 0.006, 0]}>
              <boxGeometry args={[0.055, 0.01, 0.02]} />
              <meshBasicMaterial color={gold} transparent opacity={0.95} />
            </mesh>
            {[-0.02, 0, 0.02].map((x) => (
              <mesh key={x} position={[x, 0.033, 0]}>
                <coneGeometry args={[0.009, 0.04, 4]} />
                <meshBasicMaterial color={gold} transparent opacity={0.9} />
              </mesh>
            ))}
          </group>
          {/* admin shield */}
          <mesh position={[0, 0.02, 0]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.032, 0.055, 3]} />
            <meshBasicMaterial color={cyan} transparent opacity={0.9} />
          </mesh>
          {/* member dot */}
          <mesh position={[0.17, 0.016, 0]}>
            <sphereGeometry args={[0.019, 8, 8]} />
            <meshBasicMaterial color={cyan} transparent opacity={0.65} />
          </mesh>
          <mesh position={[0, -0.04, 0]}>
            <planeGeometry args={[0.38, 0.0018]} />
            <meshBasicMaterial color={gold} transparent opacity={0.2} />
          </mesh>
        </group>
      ))}
    </StageGroup>
  );
}

/* =====================================================================
   PLAN CARDS — three floating plans; clicking one re-prices the loop.
===================================================================== */

function PlanCard({ data, index, selected, stage, gold, cyan, onSelect, onUserInteract }) {
  const group = useRef();
  const [hover, setHover] = useState(false);


  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const t = clockTime(state);
    const lift = selected ? 0.09 : 0;
    g.position.y = 1.94 + lift + Math.sin(t * 1.2 + index) * 0.022 + (hover ? 0.04 : 0);
    g.rotation.y = Math.sin(t * 0.5 + index) * 0.05;
    g.rotation.z = (index - 1) * 0.016;
    const s = selected ? 1.05 : 0.98;
    g.scale.setScalar(damp(g.scale.x, s, 6, dt));
  });

  return (
    <group ref={group} position={[(index - 1) * 1.34, 1.94, 0.55]}>
      <RoundedBox
        args={[0.94, 0.68, 0.035]}
        radius={0.06}
        smoothness={2}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => {
          setHover(false);
        }}
        onClick={(e) => {
          if (stage !== 2 || e.delta > 5) return;
          e.stopPropagation();
          onSelect(index);
          onUserInteract?.();
        }}
      >
        <meshBasicMaterial
          color={selected ? "#2a2113" : "#17140f"}
          transparent
          opacity={selected ? 0.96 : 0.82}
          depthWrite={false}
        />
      </RoundedBox>

      {/* border frame */}
      <mesh position={[0, 0, 0.021]}>
        <planeGeometry args={[0.94, 0.66]} />
        <meshBasicMaterial color={selected ? gold : "#5f5034"} transparent opacity={selected ? 0.2 : 0.08} />
      </mesh>
      <Stroke position={[0, 0.33, 0.03]} size={[0.94, 0.012, 0.002]} color={selected ? gold : "#7b6641"} opacity={selected ? 0.95 : 0.4} />
      <Stroke position={[0, -0.33, 0.03]} size={[0.94, 0.006, 0.002]} color={selected ? gold : "#7b6641"} opacity={selected ? 0.5 : 0.2} />
      <Stroke position={[-0.47, 0, 0.03]} size={[0.006, 0.66, 0.002]} color={selected ? gold : "#7b6641"} opacity={selected ? 0.5 : 0.2} />
      <Stroke position={[0.47, 0, 0.03]} size={[0.006, 0.66, 0.002]} color={selected ? gold : "#7b6641"} opacity={selected ? 0.5 : 0.2} />

      {selected && (
        <mesh position={[0, 0.365, 0.035]}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshBasicMaterial color={gold} />
        </mesh>
      )}

      {null}
    </group>
  );
}

function PlanCards({ stage, plan, muted, gold, cyan, onSelect, onUserInteract }) {
  return (
    <StageGroup active={stage === 2 && !muted} speed={5} from={0.85}>
      {PLANS.map((p, i) => (
        <PlanCard
          key={p.id}
          data={p}
          index={i}
          selected={plan === i}
          stage={stage}
          gold={gold}
          cyan={cyan}
          onSelect={onSelect}
          onUserInteract={onUserInteract}
        />
      ))}

    </StageGroup>
  );
}

/* Tiny helper used before the hook declaration for floating cards. */
function clockTime(state) {
  return typeof performance !== "undefined" ? performance.now() / 1000 : state.clock.elapsedTime;
}

/* =====================================================================
   PAYMENT GATEWAY — plan → coin → gateway → webhook → active tenant.
===================================================================== */

function PaymentGateway({ stage, gold, cyan, muted = false }) {
  const clock = useTimeline();
  const coin = useRef();
  const coinGlow = useRef();
  const pulse = useRef();
  const pulseMat = useRef();
  const webhook = useRef();
  const ring = useRef();
  const nova = POD_DEFS[1];

  const pathIn = useMemo(
    () =>
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0.5, 1.82, 0.72),
        new THREE.Vector3(1.9, 1.45, 1.55),
        new THREE.Vector3(0.8, 0.64, 1.72)
      ),
    []
  );

  const pathBack = useMemo(
    () =>
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0.8, 0.64, 1.72),
        new THREE.Vector3(0.5, 0.62, 1.55),
        new THREE.Vector3(0.22, 0.55, 0.45)
      ),
    []
  );

  const geoIn = useMemo(() => new THREE.BufferGeometry().setFromPoints(pathIn.getPoints(40)), [pathIn]);
  const geoBack = useMemo(() => new THREE.BufferGeometry().setFromPoints(pathBack.getPoints(40)), [pathBack]);
  useEffect(() => () => {
    geoIn.dispose();
    geoBack.dispose();
  }, [geoIn, geoBack]);

  useFrame((state, dt) => {
    const p = clock.current.stage === 2 ? clock.current.p : 1;
    const time = clock.current.t || state.clock.elapsedTime;
    const pay = easeOutCubic(smoothstep(0.12, 0.56, p));
    const hook = easeOutCubic(smoothstep(0.56, 0.84, p));

    if (coin.current && coinGlow.current) {
      const show = stage === 2 && !muted && p > 0.1 && p < 0.62;
      coin.current.visible = show;
      coinGlow.current.visible = show;
      const pos = pathIn.getPointAt(clamp(pay));
      coin.current.position.copy(pos);
      coinGlow.current.position.copy(pos);
      coin.current.rotation.x = time * 3;
      coin.current.rotation.y = time * 2;
      coinGlow.current.scale.setScalar(1 + Math.sin(time * 6) * 0.15);
    }

    if (webhook.current) {
      const show = stage === 2 && !muted && p > 0.56 && p < 0.9;
      webhook.current.visible = show;
      webhook.current.position.copy(pathBack.getPointAt(clamp(hook)));
      webhook.current.scale.setScalar(0.8 + Math.sin(time * 8) * 0.15);
    }

    if (pulse.current && pulseMat.current) {
      const t = clamp((p - 0.48) / 0.34);
      pulse.current.visible = stage === 2 && t > 0 && t < 1;
      pulse.current.scale.setScalar(0.9 + t * 1.8);
      pulseMat.current.opacity = (1 - t) * 0.55;
    }

    

    if (ring.current) ring.current.rotation.z = time * 0.35;
  });

  return (
    <group position={[0.8, 0.64, 1.72]}>
      <StageGroup active={stage === 2 && !muted} speed={5} from={0.8}>
        <group ref={ring}>
          <mesh>
            <torusGeometry args={[0.3, 0.012, 6, 64]} />
            <meshBasicMaterial color={gold} transparent opacity={0.9} />
          </mesh>
          <mesh rotation={[0, 0, 1.2]}>
            <torusGeometry args={[0.38, 0.004, 4, 80]} />
            <meshBasicMaterial color={cyan} transparent opacity={0.28} />
          </mesh>
          <mesh position={[-0.3, 0, 0]}>
            <sphereGeometry args={[0.018, 8, 8]} />
            <meshBasicMaterial color={cyan} transparent opacity={0.8} />
          </mesh>
        </group>
        <mesh position={[0, 0.02, 0]}>
          <planeGeometry args={[0.17, 0.11]} />
          <meshBasicMaterial color={gold} transparent opacity={0.18} />
        </mesh>
        <Stroke position={[0, 0.04, 0.01]} size={[0.15, 0.008, 0.002]} color={gold} opacity={0.8} />
        <Stroke position={[0, -0.01, 0.01]} size={[0.09, 0.008, 0.002]} color={gold} opacity={0.4} />
        <mesh position={[0.06, -0.015, 0.02]}>
          <circleGeometry args={[0.022, 12]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.8} />
        </mesh>

        <mesh ref={pulse}>
          <torusGeometry args={[0.36, 0.006, 4, 48]} />
          <meshBasicMaterial ref={pulseMat} color={cyan} transparent opacity={0.4} depthWrite={false} />
        </mesh>

        {stage === 2 && !muted && (
          null
        )}
      </StageGroup>

      {stage === 2 && !muted && (
        <>
          <line geometry={geoIn}>
            <lineBasicMaterial color={cyan} transparent opacity={0.28} depthWrite={false} />
          </line>
          <line geometry={geoBack}>
            <lineBasicMaterial color={gold} transparent opacity={0.18} depthWrite={false} />
          </line>
        </>
      )}

      <mesh ref={coin}>
        <cylinderGeometry args={[0.048, 0.048, 0.018, 16]} />
        <meshBasicMaterial color={gold} />
      </mesh>
      <mesh ref={coinGlow}>
        <sphereGeometry args={[0.085, 10, 10]} />
        <meshBasicMaterial color={gold} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={webhook}>
        <sphereGeometry args={[0.026, 8, 8]} />
        <meshBasicMaterial color={cyan} />
      </mesh>

      {stage === 2 && !muted && (
        null
      )}
    </group>
  );
}

/* =====================================================================
   USAGE GAUGE — instanced tick ring per tenant, with a Nova limit story.
===================================================================== */

function UsageGauge({ pod, index, plan, stage, gold, cyan }) {
  const clock = useTimeline();
  const ticks = useRef();
  const group = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);
  const radiusRef = useRef(0.26);
  const TICKS = 40;

  const position = useMemo(
    () => [pod.pos[0], pod.pos[1] + 0.46, pod.pos[2] + 0.3],
    [pod.pos]
  );

  useFrame((state, dt) => {
    if (!ticks.current || !group.current) return;
    const active = clock.current.stage === 3;
    const p = active ? clock.current.p : 1;
    const time = clock.current.t || state.clock.elapsedTime;
    const limit = PLANS[plan].limit;

    let usage = pod.usageBase + (index === 1 ? 0 : 0.07 * smoothstep(0.1, 0.8, p));
    let novaPhase = "ok";
    let novaPlan = plan;

    if (index === 1) {
      if (active && p < 0.7) {
        usage = 0.58 + smoothstep(0.08, 0.68, p) * 0.5;
        if (usage > 0.995) {
          novaPhase = "limit";
        }
      } else if (active && p <= 0.84) {
        usage = 1.05;
        novaPhase = "limit";
      } else {
        usage = 0.46;
        novaPhase = active ? "upgraded" : "ok";
        novaPlan = Math.min(plan + 1, 2);
      }
    }


    const targetRadius = index === 1 && novaPhase !== "limit" && active && p > 0.84 ? 0.31 : 0.27;
    radiusRef.current = damp(radiusRef.current, targetRadius, 4, dt);
    const radius = radiusRef.current;
    const filled = clamp(usage);
    const color = novaPhase === "limit" ? CORAL : cyan;

    for (let i = 0; i < TICKS; i += 1) {
      const a = -Math.PI / 2 + (i / TICKS) * Math.PI * 2;
      const on = i / TICKS < filled;
      dummy.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
      dummy.rotation.set(0, 0, a + Math.PI / 2);
      const grow = on ? 1 : 0.6;
      dummy.scale.set(grow, on ? 1 : 0.7, 1);
      dummy.updateMatrix();
      ticks.current.setMatrixAt(i, dummy.matrix);
      tmpColor.set(on ? color : "#4c4232");
      ticks.current.setColorAt(i, tmpColor);
    }
    ticks.current.instanceMatrix.needsUpdate = true;
    if (ticks.current.instanceColor) ticks.current.instanceColor.needsUpdate = true;

    const nudgeScale = index === 1 && novaPhase === "limit" ? 1 + Math.sin(time * 7) * 0.018 : 1;
    group.current.scale.setScalar(damp(group.current.scale.x, nudgeScale, 6, dt));
    group.current.position.y = position[1] + Math.sin(time * 1.1 + index) * 0.02;

    
    
  });

  return (
    <group ref={group} position={position}>
      <mesh>
        <torusGeometry args={[0.27, 0.002, 4, 64]} />
        <meshBasicMaterial color={gold} transparent opacity={0.14} />
      </mesh>
      <instancedMesh ref={ticks} args={[null, null, TICKS]} frustumCulled={false}>
        <boxGeometry args={[0.016, 0.062, 0.004]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.92} />
      </instancedMesh>

      {stage >= 3 && (
        <>
          {null}

          {null}
        </>
      )}
    </group>
  );
}

function UsageGaugeRow({ stage, plan, gold, cyan }) {
  return (
    <StageGroup active={stage >= 3} speed={5} from={0.85}>
      {POD_DEFS.map((pod, i) => (
        <UsageGauge key={pod.id} pod={pod} index={i} plan={plan} stage={stage} gold={gold} cyan={cyan} />
      ))}
    </StageGroup>
  );
}

/* =====================================================================
   REVENUE CHART — MRR grows above the core; invoices get paid.
===================================================================== */

function RevenueChart({ stage, gold, cyan }) {
  const clock = useTimeline();
  const root = useRef();
  const lineGeo = useRef();
  const bars = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const N = 12;
  const points = useMemo(() => {
    const arr = new Float32Array((N + 1) * 3);
    return arr;
  }, []);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(points, 3));
    return g;
  }, [points]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state, dt) => {
    if (!root.current) return;
    const p = clock.current.stage === 4 ? clock.current.p : 1;
    const time = clock.current.t || state.clock.elapsedTime;
    const grow = smoothstep(0.04, 0.9, p);
    const mrr = Math.round(12400 * easeOutCubic(grow));

    const g = geometry;
    const attr = g.getAttribute("position");
    for (let i = 0; i <= N; i += 1) {
      const f = i / N;
      const local = smoothstep(f * 0.55, f * 0.55 + 0.45, p);
      const base = 0.34 + 0.56 * Math.pow(f, 0.72) + Math.sin(f * 9) * 0.022;
      attr.setXYZ(i, -0.96 + f * 1.92, -0.22 + base * 0.62 * grow * local, 0.06);
    }
    attr.needsUpdate = true;
    g.computeBoundingSphere();

    if (bars.current) {
      for (let i = 0; i < N; i += 1) {
        const f = i / (N - 1);
        const local = smoothstep(f * 0.5, f * 0.5 + 0.5, p);
        const h = (0.16 + 0.38 * Math.pow(f, 0.9) + Math.sin(i * 1.7) * 0.035) * grow * local;
        dummy.position.set(-0.96 + f * 1.92, -0.22 + Math.max(0.001, h) / 2, 0.01);
        dummy.scale.set(1, Math.max(0.001, h) / 0.2, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        bars.current.setMatrixAt(i, dummy.matrix);
      }
      bars.current.instanceMatrix.needsUpdate = true;
    }

    if (root.current) root.current.position.y = 1.95 + Math.sin(time * 0.8) * 0.016;
    
  });

  return (
    <group ref={root} position={[0, 1.95, 0.3]}>
      <StageGroup active={stage === 4} speed={5} from={0.88}>
        <RoundedBox args={[2.3, 1.02, 0.03]} radius={0.07} smoothness={2} position={[0, 0, 0]}>
          <meshBasicMaterial color="#17130e" transparent opacity={0.72} depthWrite={false} />
        </RoundedBox>
        <Stroke position={[0, 0.51, 0.03]} size={[2.3, 0.008, 0.002]} color={gold} opacity={0.4} />
        <Stroke position={[0, -0.51, 0.03]} size={[2.3, 0.005, 0.002]} color={gold} opacity={0.14} />
        <Stroke position={[-1.15, 0, 0.03]} size={[0.005, 1.02, 0.002]} color={gold} opacity={0.14} />
        <Stroke position={[1.15, 0, 0.03]} size={[0.005, 1.02, 0.002]} color={gold} opacity={0.14} />

        <mesh position={[0, -0.2, 0.02]}>
          <planeGeometry args={[1.96, 0.56]} />
          <meshBasicMaterial color="#0f0c08" transparent opacity={0.32} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <Stroke key={i} position={[0, -0.32 + i * 0.16, 0.04]} size={[1.96, 0.002, 0.001]} color={gold} opacity={0.1} />
        ))}

        <instancedMesh ref={bars} args={[null, null, N]} frustumCulled={false}>
          <boxGeometry args={[0.045, 0.2, 0.004]} />
          <meshBasicMaterial color={gold} transparent opacity={0.24} />
        </instancedMesh>

        <line geometry={geometry}>
          <lineBasicMaterial color={cyan} transparent opacity={0.95} />
        </line>

        <mesh position={[0.96, -0.22 + 0.34 + 0.56 * 0.62, 0.07]}>
          <circleGeometry args={[0.022, 12]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.95} />
        </mesh>
        <mesh position={[0.96, -0.22 + 0.34 + 0.56 * 0.62, 0.07]}>
          <ringGeometry args={[0.03, 0.038, 24]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.4} />
        </mesh>

        {stage === 4 && (
          <>
            {null}
            {null}
            {null}
          </>
        )}
      </StageGroup>
    </group>
  );
}

/* =====================================================================
   INVOICE — a paid invoice slides out of the core.
===================================================================== */

function InvoiceSheet({ stage, gold, cyan }) {
  const clock = useTimeline();
  const root = useRef();

  useFrame((state, dt) => {
    if (!root.current) return;
    const active = clock.current.stage === 4;
    const p = active ? clock.current.p : 1;
    const time = clock.current.t || state.clock.elapsedTime;
    const out = easeOutCubic(smoothstep(0.08, 0.46, p));
    root.current.position.set(
      THREE.MathUtils.lerp(0.16, -1.62, out),
      THREE.MathUtils.lerp(0.35, 1.54, out) + Math.sin(time * 0.9) * 0.02,
      THREE.MathUtils.lerp(0.1, 1.32, out)
    );
    root.current.rotation.z = -0.17 * out;
    root.current.rotation.y = 0.26 * out;
    root.current.rotation.x = -0.08 * out;
    
  });

  return (
    <group ref={root} position={[0.2, 0.35, 0.1]}>
      <StageGroup active={stage === 4} speed={6} from={0.7}>
        <RoundedBox args={[0.74, 0.94, 0.02]} radius={0.035} smoothness={2}>
          <meshBasicMaterial color="#e3d6bc" transparent opacity={0.95} depthWrite={false} />
        </RoundedBox>
        <Stroke position={[0, 0.4, 0.012]} size={[0.58, 0.012, 0.002]} color="#1a1510" opacity={0.8} />
        <Stroke position={[-0.16, 0.4, 0.012]} size={[0.26, 0.012, 0.002]} color={gold} opacity={0.9} />
        {[0.29, 0.21, 0.13, 0.05].map((y, i) => (
          <React.Fragment key={y}>
            <Stroke position={[-0.2, y, 0.012]} size={[0.24, 0.01, 0.002]} color="#2a2319" opacity={0.32} />
            <Stroke position={[0.24, y, 0.012]} size={[0.12, 0.01, 0.002]} color="#2a2319" opacity={0.24} />
            {i < 3 && <Stroke position={[-0.04, y - 0.03, 0.012]} size={[0.56, 0.002, 0.002]} color="#2a2319" opacity={0.12} />}
          </React.Fragment>
        ))}
        <Stroke position={[0, -0.2, 0.012]} size={[0.58, 0.002, 0.002]} color="#2a2319" opacity={0.2} />
        <Stroke position={[-0.14, -0.3, 0.012]} size={[0.2, 0.012, 0.002]} color="#2a2319" opacity={0.55} />
        <Stroke position={[0.2, -0.3, 0.012]} size={[0.2, 0.02, 0.002]} color={gold} opacity={0.95} />
        <mesh position={[-0.22, 0.47, 0]}>
          <circleGeometry args={[0.035, 16]} />
          <meshBasicMaterial color={gold} transparent opacity={0.9} />
        </mesh>

        {stage === 4 && null}
      </StageGroup>
    </group>
  );
}

/* =====================================================================
   LOOP ARROW + AMBIENT DUST
===================================================================== */

function CycleRing({ stage, gold, cyan }) {
  const ring = useRef();
  const arrow = useRef();
  useFrame((state, dt) => {
    const time = state.clock.elapsedTime;
    if (ring.current) {
      ring.current.rotation.z = time * 0.045;
      ring.current.traverse((n) => {
        if (n.material?.userData?.cycleMat) {
          const target = stage === 4 ? 0.2 : 0.075;
          n.material.opacity = damp(n.material.opacity, target, 2.4, dt);
        }
      });
    }
    if (arrow.current) {
      arrow.current.position.x = Math.cos(time * 0.18) * 2.72;
      arrow.current.position.y = Math.sin(time * 0.18) * 2.72;
      arrow.current.rotation.z = time * 0.18 + Math.PI / 2;
    }
  });

  return (
    <group position={[0, 0.2, -2.1]} rotation={[0.28, 0, -0.16]}>
      <group ref={ring} rotation={[0, 0, 0.5]}>
        <mesh>
          <torusGeometry args={[2.72, 0.0035, 4, 160]} />
          <meshBasicMaterial color={gold} userData={{ cycleMat: true }} transparent opacity={0.075} depthWrite={false} />
        </mesh>
        <mesh>
          <torusGeometry args={[2.86, 0.0025, 4, 160]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.055} depthWrite={false} />
        </mesh>
      </group>
      <mesh ref={arrow}>
        <coneGeometry args={[0.055, 0.11, 4]} />
        <meshBasicMaterial color={gold} transparent opacity={0.36} />
      </mesh>
      {null}
    </group>
  );
}

function Dust({ gold, cyan }) {
  const mesh = useRef();
  const count = 46;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const r = 1.15 + ((i * 37) % 100) / 100 * 2.8;
        return {
          x: Math.cos(i * 2.399) * r,
          y: -1.4 + (((i * 53) % 100) / 100) * 4.1,
          z: -1.6 + (((i * 29) % 100) / 100) * 3.4,
          s: 0.006 + (((i * 17) % 100) / 100) * 0.012,
          cyan: i % 4 === 0,
        };
      }),
    []
  );

  useEffect(() => {
    if (!mesh.current) return;
    const color = new THREE.Color();
    seeds.forEach((s, i) => {
      dummy.position.set(s.x, s.y, s.z);
      dummy.scale.setScalar(s.s / 0.01);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
      color.set(s.cyan ? cyan : gold);
      mesh.current.setColorAt(i, color);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [seeds, cyan, gold, dummy]);

  useFrame((state) => {
    if (!mesh.current) return;
    mesh.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.045) * 0.16;
    mesh.current.position.y = Math.sin(state.clock.elapsedTime * 0.22) * 0.06;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, count]} frustumCulled={false}>
      <sphereGeometry args={[0.01, 6, 6]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.42} depthWrite={false} />
    </instancedMesh>
  );
}

const initialState = { stage: 0, plan: 1, playing: true, focus: null };
function sceneReducer(state, action) {
  switch (action.type) {
    case 'advance': return { ...state, stage: (state.stage + 1) % STAGES.length, focus: null };
    case 'stage': return { ...state, stage: action.stage, playing: false, focus: null };
    case 'plan': return { ...state, plan: action.plan, playing: false };
    case 'tenant': return { ...state, focus: state.focus === action.id ? null : action.id, playing: false };
    case 'clear': return { ...state, focus: null };
    case 'pause': return { ...state, playing: false };
    case 'toggle': return { ...state, playing: !state.playing, focus: null };
    case 'resume': return { ...state, playing: true, focus: null };
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

export default function SaasProductScene({ light = false }) {
  const [state, dispatch] = useReducer(sceneReducer, initialState);
  const coarse = useSyncExternalStore(subscribePreferences, getCoarseSnapshot, getServerSnapshot);
  const reduced = useSyncExternalStore(subscribePreferences, getReducedSnapshot, getServerSnapshot);
  const controlsRef = useRef();
  const clockRef = useRef({ stage: 0, p: 0, t: 0 });
  const stageStartRef = useRef(0);
  const gold = light ? '#b87d14' : '#f5c451';
  const cyan = light ? '#0077b6' : '#6cc7e8';

  useEffect(() => {
    stageStartRef.current = performance.now();
    clockRef.current.stage = state.stage;
    clockRef.current.p = 0;
  }, [state.stage]);

  useEffect(() => {
    if (!state.playing || reduced) return;
    const id = window.setInterval(() => dispatch({ type: 'advance' }), STAGE_MS);
    return () => window.clearInterval(id);
  }, [state.playing, reduced]);

  const openTenant = useCallback((id) => dispatch({ type: 'tenant', id }), []);
  const selectPlan = useCallback((plan) => dispatch({ type: 'plan', plan }), []);
  const pause = useCallback(() => dispatch({ type: 'pause' }), []);

  return (
    <div
      className="absolute inset-0"
      tabIndex={0}
      role="region"
      aria-label="Interactive SaaS product development visualization"
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          dispatch({ type: 'stage', stage: (state.stage + 1) % STAGES.length });
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          dispatch({ type: 'stage', stage: (state.stage - 1 + STAGES.length) % STAGES.length });
        } else if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          dispatch({ type: 'toggle' });
        } else if (event.key === 'Escape') {
          dispatch({ type: 'resume' });
        }
      }}
    >
      <Canvas
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: DEFAULT_CAM, fov: 38, near: 0.1, far: 100 }}
        onPointerMissed={() => dispatch({ type: 'clear' })}
        style={{ position: 'absolute', inset: 0, background: 'transparent', touchAction: coarse ? 'pan-y' : 'none' }}
      >
        <Ticker clockRef={clockRef} stage={state.stage} stageStartRef={stageStartRef} />
        <TimelineContext.Provider value={clockRef}>
          <SceneContent
            stage={state.stage} plan={state.plan} gold={gold} cyan={cyan}
            focusId={state.focus} setFocus={openTenant} onSelectPlan={selectPlan}
            onUserInteract={pause} controlsRef={controlsRef} enableRotate={!coarse}
          />
        </TimelineContext.Provider>
      </Canvas>
    </div>
  );
}
