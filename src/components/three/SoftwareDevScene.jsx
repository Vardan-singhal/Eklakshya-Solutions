"use client";

import { ScenePreparation } from "./ScenePreparation";
import { servicePixelRatio } from "./useGraphics";
import { SceneCompilation } from "./SceneCompilation";
import { SceneWarmup } from "./SceneWarmup";

/** Model-only scene adapted from software three.js/src/SoftwareDevScene.jsx.
 * The existing service card supplies the layout, decoration, and fallback. */
import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useReducer, useSyncExternalStore } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const STAGE_COUNT = 4;

const MODULES = [
  { id: 'inventory', label: 'Inventory', fact: 'Stock rises and falls live', position: [-1.78, 1.02, 0.08] },
  { id: 'crm', label: 'CRM', fact: 'A pulse carries each update', position: [1.78, 1.02, 0.08] },
  { id: 'quotation', label: 'Quotation', fact: 'The stamp confirms the sheet', position: [-1.78, -1.06, 0.08] },
  { id: 'dashboard', label: 'Dashboard', fact: 'Bars and trend, one source', position: [1.78, -1.06, 0.08] },
];

const PERMISSIONS = {
  Admin: ['inventory', 'crm', 'quotation', 'dashboard'],
  Manager: ['inventory', 'crm', 'dashboard'],
  Staff: ['inventory', 'crm'],
};

const ROLES = Object.keys(PERMISSIONS);

const CORAL = '#ff6b6b';
const COLS = 20;
const ROWS = 15;
const CELL_COUNT = COLS * ROWS;
const damp = THREE.MathUtils.damp;
const SHEET_TILT = new THREE.Euler(0.2, -0.32, -0.07);

function hash(index, salt) {
  const value = Math.sin((index + 1) * (salt * 12.9898 + 78.233)) * 43758.5453;
  return value - Math.floor(value);
}

function ringPoints(radius, y = 0, count = 48) {
  return Array.from({ length: count + 1 }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
  });
}

const Line = forwardRef(function ThinLine({ points, color, opacity = 1, ...props }, ref) {
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points.map((point) => new THREE.Vector3(...point))), [points]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <line ref={ref} geometry={geometry} {...props}>
      <lineBasicMaterial color={color} transparent opacity={0} toneMapped={false} userData={{ designOpacity: opacity, edge: true, baseColor: color }} />
    </line>
  );
});

const Segments = forwardRef(function ThinSegments({ segments, color, opacity = 1, ...props }, ref) {
  const geometry = useMemo(() => {
    const values = [];
    segments.forEach(([start, end]) => values.push(...start, ...end));
    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.Float32BufferAttribute(values, 3));
    return result;
  }, [segments]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <lineSegments ref={ref} geometry={geometry} {...props}>
      <lineBasicMaterial color={color} transparent opacity={0} toneMapped={false} userData={{ designOpacity: opacity, edge: true, baseColor: color }} />
    </lineSegments>
  );
});

function WireBox({ size, color, position = [0, 0, 0], opacity = 0.8, fill = '#1b1814', fillOpacity = 0.55 }) {
  const [width, height, depth] = size;
  const edges = useMemo(() => {
    const box = new THREE.BoxGeometry(width, height, depth);
    const result = new THREE.EdgesGeometry(box);
    box.dispose();
    return result;
  }, [width, height, depth]);
  useEffect(() => () => edges.dispose(), [edges]);
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={size} />
        <meshBasicMaterial color={fill} transparent opacity={0} depthWrite={false} toneMapped={false} userData={{ designOpacity: fillOpacity, baseColor: fill }} />
      </mesh>
      <lineSegments geometry={edges} scale={1.004}>
        <lineBasicMaterial color={color} transparent opacity={0} toneMapped={false} userData={{ designOpacity: opacity, edge: true, baseColor: color }} />
      </lineSegments>
    </group>
  );
}

function Ring({ radius = 1, tube = 0.008, color, opacity = 1, position = [0, 0, 0], rotation = [Math.PI / 2, 0, 0] }) {
  return (
    <mesh position={position} rotation={rotation}>
      <torusGeometry args={[radius, tube, 8, 56]} />
      <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} toneMapped={false} userData={{ designOpacity: opacity, edge: true, baseColor: color }} />
    </mesh>
  );
}

function SpreadsheetFrame({ stage, gold }) {
  const group = useRef();
  const materials = useRef([]);
  const grid = useMemo(() => {
    const lines = [
      [[-2.08, -0.98, 0], [2.08, -0.98, 0]],
      [[2.08, -0.98, 0], [2.08, 1.08, 0]],
      [[2.08, 1.08, 0], [-2.08, 1.08, 0]],
      [[-2.08, 1.08, 0], [-2.08, -0.98, 0]],
      [[-2.08, 0.9, 0], [2.08, 0.9, 0]],
    ];
    for (let c = 0; c < 8; c += 1) lines.push([[-1.85 + c * 0.53, -0.86, 0], [-1.85 + c * 0.53, 0.82, 0]]);
    for (let r = 0; r < 6; r += 1) lines.push([[-1.9, -0.72 + r * 0.28, 0], [1.9, -0.72 + r * 0.28, 0]]);
    return lines;
  }, []);
  useEffect(() => {
    materials.current = [];
    group.current?.traverse((object) => { if (object.material) materials.current.push(object.material); });
  }, []);
  useFrame((_, delta) => {
    const target = stage === 0 ? 0.42 : 0;
    materials.current.forEach((material) => { material.opacity = damp(material.opacity, target, 3.2, delta); });
    if (group.current) group.current.visible = stage === 0 || materials.current.some((material) => material.opacity > 0.01);
  });
  return (
    <group ref={group} rotation={SHEET_TILT} position={[0, 0.08, -0.05]}>
      <Segments segments={grid} color={gold} opacity={0.42} />
      {[[-1.86, 0.99, 0.02], [-1.74, 0.99, 0.02], [-1.62, 0.99, 0.02]].map((position, index) => (
        <mesh key={position[0]} position={position}>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshBasicMaterial color={index === 2 ? CORAL : gold} transparent opacity={0} toneMapped={false} userData={{ designOpacity: 0.8 }} />
        </mesh>
      ))}
    </group>
  );
}

function CellCloud({ stage, role, cyan }) {
  const mesh = useRef();
  const ink = useRef();
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const grey = useMemo(() => new THREE.Color('#8f8b83'), []);
  const valid = useMemo(() => new THREE.Color(cyan), [cyan]);
  const error = useMemo(() => new THREE.Color(CORAL), []);
  const cells = useMemo(() => {
    const featured = { 18: 'refError', 151: 'duplicate', 266: 'naError' };
    return Array.from({ length: CELL_COUNT }, (_, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const loose = hash(i, 3) > 0.9;
      const local = new THREE.Vector3(
        (col - 9.5) * 0.188 + (hash(i, 1) - 0.5) * (loose ? 0.62 : 0.045),
        (7 - row) * 0.108 + (hash(i, 2) - 0.5) * (loose ? 0.4 : 0.03),
        loose ? (hash(i, 4) - 0.5) * 0.85 : 0.08,
      ).applyEuler(SHEET_TILT);
      return {
        x: local.x, y: local.y + 0.08, z: local.z,
        seed: hash(i, 5),
        angle: hash(i, 6) * Math.PI * 2,
        bad: Boolean(featured[i]) || hash(i, 7) < 0.028,
        label: featured[i] || null,
        brightness: 0.78 + hash(i, 8) * 0.36,
      };
    });
  }, []);
  const current = useMemo(() => {
    const values = new Float32Array(CELL_COUNT * 7);
    cells.forEach((cell, i) => {
      values.set([cell.x, cell.y, cell.z, 1, grey.r, grey.g, grey.b], i * 7);
    });
    return values;
  }, [cells, grey]);

  useLayoutEffect(() => {
    cells.forEach((cell, i) => {
      scratch.position.set(cell.x, cell.y, cell.z);
      scratch.scale.set(1, 1, 1);
      scratch.updateMatrix();
      mesh.current.setMatrixAt(i, scratch.matrix);
      ink.current.setMatrixAt(i, scratch.matrix);
      color.copy(grey);
      mesh.current.setColorAt(i, color);
      ink.current.setColorAt(i, color);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    ink.current.instanceMatrix.needsUpdate = true;
  }, [cells, scratch, color, grey]);

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    const alpha = 1 - Math.exp(-3.4 * Math.min(delta, 0.05));
    const scan = (time * 0.22) % 1;
    cells.forEach((cell, i) => {
      let x; let y; let z; let scale; let rotation = -0.08;
      color.copy(grey).multiplyScalar(cell.brightness);
      if (stage === 0) {
        x = cell.x + Math.sin(time * 0.65 + cell.seed * 9) * 0.035;
        y = cell.y + Math.cos(time * 0.55 + cell.angle) * 0.03;
        z = cell.z + Math.sin(time * 0.8 + cell.angle) * 0.05;
        scale = 0.92 + cell.seed * 0.16;
        if (cell.bad) color.lerp(error, 0.72 + 0.28 * Math.sin(time * 5 + cell.angle));
      } else if (stage === 1) {
        const progress = (time * 0.2 + cell.seed) % 1;
        const radius = 1.28 - progress * 1.02;
        const angle = cell.angle + time * 0.7;
        x = Math.cos(angle) * radius;
        y = 1.42 - progress * 2.86;
        z = Math.sin(angle) * radius * 0.62;
        scale = Math.sin(Math.PI * progress) * 0.92;
        rotation = angle * 0.2;
        if (cell.bad && progress > 0.58) {
          const rejection = (progress - 0.58) / 0.42;
          x += (cell.seed > 0.5 ? 1 : -1) * (1.15 + rejection * 1.55);
          y += Math.sin(rejection * Math.PI) * 0.72;
          color.copy(error);
        } else if (y < 1.42 - scan * 2.5) color.copy(valid);
      } else {
        const destination = MODULES[i % 4];
        const progress = (time * 0.2 + cell.seed) % 1;
        const eased = progress * progress * (3 - 2 * progress);
        const accessible = stage !== 3 || PERMISSIONS[role].includes(destination.id);
        x = destination.position[0] * 0.78 * eased;
        y = destination.position[1] * 0.78 * eased + Math.sin(progress * Math.PI) * 0.28;
        z = 0.2 + Math.sin(progress * Math.PI) * 0.25;
        scale = i % 18 === 0 && accessible ? Math.sin(progress * Math.PI) * 0.45 : 0.001;
        color.copy(valid);
      }
      const at = i * 7;
      current[at] += (x - current[at]) * alpha;
      current[at + 1] += (y - current[at + 1]) * alpha;
      current[at + 2] += (z - current[at + 2]) * alpha;
      current[at + 3] += (scale - current[at + 3]) * alpha;
      current[at + 4] += (color.r - current[at + 4]) * alpha;
      current[at + 5] += (color.g - current[at + 5]) * alpha;
      current[at + 6] += (color.b - current[at + 6]) * alpha;
      scratch.position.set(current[at], current[at + 1], current[at + 2]);
      scratch.rotation.set(0.08, cell.seed * 0.4, rotation);
      scratch.scale.setScalar(Math.max(0.001, current[at + 3]));
      scratch.updateMatrix();
      mesh.current.setMatrixAt(i, scratch.matrix);
      ink.current.setMatrixAt(i, scratch.matrix);
      color.setRGB(current[at + 4], current[at + 5], current[at + 6]);
      mesh.current.setColorAt(i, color);
      ink.current.setColorAt(i, color);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    ink.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    if (ink.current.instanceColor) ink.current.instanceColor.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={mesh} args={[null, null, CELL_COUNT]} frustumCulled={false}>
        <boxGeometry args={[0.152, 0.078, 0.016]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={ink} args={[null, null, CELL_COUNT]} frustumCulled={false}>
        <boxGeometry args={[0.084, 0.01, 0.018]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  );
}

function Funnel({ stage, gold, cyan }) {
  const group = useRef();
  const scanner = useRef();
  const materials = useRef([]);
  const spokes = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    return [[Math.cos(angle) * 1.34, 1.46, Math.sin(angle) * 1.34], [Math.cos(angle) * 0.18, -1.42, Math.sin(angle) * 0.18]];
  }), []);
  useEffect(() => {
    materials.current = [];
    group.current?.traverse((object) => { if (object.material && object !== scanner.current) materials.current.push(object.material); });
  }, []);
  useFrame(({ clock }, delta) => {
    const target = stage === 1 ? 0.96 : 0;
    materials.current.forEach((material) => { material.opacity = damp(material.opacity, (material.userData.designOpacity ?? 1) * target, 3.4, delta); });
    if (!scanner.current) return;
    const progress = (clock.elapsedTime * 0.22) % 1;
    const fade = THREE.MathUtils.smoothstep(progress, 0.03, 0.14) * (1 - THREE.MathUtils.smoothstep(progress, 0.8, 0.96));
    scanner.current.position.y = 1.46 - progress * 2.88;
    const radius = 1.34 - progress * 1.16;
    scanner.current.scale.set(radius, 0.7, radius);
    scanner.current.material.opacity = damp(scanner.current.material.opacity, stage === 1 ? fade : 0, 7, delta);
    scanner.current.visible = stage === 1 || scanner.current.material.opacity > 0.01;
  });
  return (
    <group ref={group}>
      {[1.34, 1.02, 0.7, 0.4, 0.18].map((radius, index) => <Ring key={radius} radius={radius} tube={index === 0 ? 0.012 : 0.006} color={gold} opacity={index === 0 ? 1 : 0.75} position={[0, 1.46 - index * 0.72, 0]} />)}
      <Segments segments={spokes} color={gold} opacity={0.7} />
      <mesh ref={scanner} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.02, 8, 64]} />
        <meshBasicMaterial color={cyan} transparent opacity={0} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

function SystemCore({ stage, gold, cyan }) {
  const group = useRef();
  const edges = useMemo(() => {
    const geometry = new THREE.DodecahedronGeometry(0.62, 0);
    const result = new THREE.EdgesGeometry(geometry);
    geometry.dispose();
    return result;
  }, []);
  const materials = useRef([]);
  useEffect(() => () => edges.dispose(), [edges]);
  useEffect(() => {
    materials.current = [];
    group.current?.traverse((object) => { if (object.material) materials.current.push(object.material); });
  }, []);
  useFrame(({ clock }, delta) => {
    group.current.rotation.y += delta * 0.28;
    group.current.rotation.x = Math.sin(clock.elapsedTime * 0.3) * 0.12 + 0.18;
    const scale = stage >= 2 ? 1 : stage === 1 ? 0.62 : 0.28;
    group.current.scale.setScalar(damp(group.current.scale.x, scale, 2.8, delta));
    const strength = stage >= 2 ? 1 : stage === 1 ? 0.45 : 0.12;
    materials.current.forEach((material) => { material.opacity = damp(material.opacity, (material.userData.designOpacity ?? 0.8) * strength, 3, delta); });
  });
  return (
    <group ref={group} position={[0, 0.02, -0.05]}>
      <mesh><dodecahedronGeometry args={[0.62, 0]} /><meshBasicMaterial color={gold} transparent opacity={0} depthWrite={false} toneMapped={false} userData={{ designOpacity: 0.08 }} /></mesh>
      <lineSegments geometry={edges}><lineBasicMaterial color={gold} transparent opacity={0} toneMapped={false} userData={{ designOpacity: 0.95 }} /></lineSegments>
      <mesh rotation={[0.4, 0.2, 0.1]}><dodecahedronGeometry args={[0.34, 0]} /><meshBasicMaterial color={cyan} wireframe transparent opacity={0} toneMapped={false} userData={{ designOpacity: 0.55 }} /></mesh>
      <mesh><sphereGeometry args={[0.08, 16, 16]} /><meshBasicMaterial color={cyan} transparent opacity={0} toneMapped={false} userData={{ designOpacity: 1 }} /></mesh>
      <mesh><sphereGeometry args={[0.2, 16, 16]} /><meshBasicMaterial color={cyan} transparent opacity={0} depthWrite={false} toneMapped={false} userData={{ designOpacity: 0.13 }} /></mesh>
      <Ring radius={0.86} tube={0.005} color={gold} opacity={0.45} />
      <Ring radius={0.98} tube={0.004} color={cyan} opacity={0.28} rotation={[1.1, 0.4, 0.2]} />
    </group>
  );
}

function DataLink({ module, index, stage, locked, cyan }) {
  const line = useRef();
  const packet = useRef();
  const curve = useMemo(() => new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0.02, 0.1),
    new THREE.Vector3(module.position[0] * 0.48, module.position[1] * 0.42, 0.32),
    new THREE.Vector3(module.position[0] * 0.72, module.position[1] * 0.68, 0.24),
  ), [module]);
  const points = useMemo(() => curve.getPoints(28).map((point) => point.toArray()), [curve]);
  const vector = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }, delta) => {
    if (line.current) line.current.material.opacity = damp(line.current.material.opacity, stage >= 2 ? (locked ? 0.1 : 0.72) : 0.03, 3, delta);
    if (!packet.current) return;
    const progress = (clock.elapsedTime * 0.17 + index * 0.23) % 1;
    const envelope = THREE.MathUtils.smoothstep(progress, 0.02, 0.12) * (1 - THREE.MathUtils.smoothstep(progress, 0.84, 0.98));
    curve.getPoint(progress, vector);
    packet.current.position.copy(vector);
    const target = stage >= 2 && !locked ? envelope : 0;
    packet.current.scale.setScalar(damp(packet.current.scale.x, target > 0.05 ? 1 : 0.2, 8, delta));
    packet.current.material.opacity = damp(packet.current.material.opacity, target, 8, delta);
  });
  return (
    <group>
      <Line ref={line} points={points} color={cyan} opacity={0.72} />
      <mesh ref={packet}><sphereGeometry args={[0.048, 10, 10]} /><meshBasicMaterial color={cyan} transparent opacity={0} toneMapped={false} /></mesh>
    </group>
  );
}

function Plate({ gold, cyan }) {
  return (
    <group>
      <WireBox size={[1.34, 1.42, 0.04]} position={[0, 0, -0.2]} color={gold} opacity={0.78} fill="#191611" fillOpacity={0.78} />
      <mesh position={[-0.5, 0.56, 0.03]}><boxGeometry args={[0.055, 0.055, 0.012]} /><meshBasicMaterial color={cyan} transparent opacity={0} toneMapped={false} userData={{ designOpacity: 0.95, baseColor: cyan }} /></mesh>
      <Line points={[[-0.38, 0.56, 0.03], [0.5, 0.56, 0.03]]} color={gold} opacity={0.42} />
      <Ring radius={0.58} tube={0.005} color={gold} opacity={0.28} position={[0, -0.86, -0.12]} />
    </group>
  );
}

function InventoryModule({ gold, cyan, intense }) {
  const crates = useRef([]);
  const meter = useRef();
  useFrame(({ clock }, delta) => {
    const level = 0.42 + ((Math.sin(clock.elapsedTime * (intense ? 2.1 : 0.85)) + 1) / 2) * 0.58;
    crates.current.forEach((crate, index) => {
      if (!crate) return;
      const shown = index < 3 || level > 0.78;
      crate.position.y = damp(crate.position.y, -0.44 + index * (0.19 + level * 0.07), 3.6, delta);
      crate.scale.setScalar(damp(crate.scale.x, shown ? 1 : 0.001, 5, delta));
    });
    if (meter.current) {
      meter.current.scale.y = damp(meter.current.scale.y, 0.16 + level * 0.62, 4, delta);
      meter.current.position.y = -0.48 + meter.current.scale.y / 2;
    }
  });
  return (
    <group>
      <Plate gold={gold} cyan={cyan} />
      {[0, 1, 2, 3].map((i) => (
        <group key={i} ref={(element) => { crates.current[i] = element; }} position={[0, -0.48 + i * 0.24, 0.14]}>
          <WireBox size={[0.72, 0.2, 0.44]} color={gold} opacity={0.95} fill="#5a4930" fillOpacity={0.92} />
          <Segments segments={[[[-0.22, -0.06, 0.23], [0.22, 0.06, 0.23]], [[-0.22, 0.06, 0.23], [0.22, -0.06, 0.23]]]} color={gold} opacity={0.62} />
        </group>
      ))}
      <group position={[0.5, 0, 0.16]}>
        <Line points={[[0, -0.48, 0], [0, 0.32, 0]]} color={gold} opacity={0.4} />
        <mesh ref={meter} position={[0.08, -0.2, 0]}><boxGeometry args={[0.045, 1, 0.016]} /><meshBasicMaterial color={cyan} transparent opacity={0} toneMapped={false} userData={{ designOpacity: 0.9, baseColor: cyan }} /></mesh>
      </group>
    </group>
  );
}

function CrmModule({ gold, cyan, intense }) {
  const pulse = useRef();
  const nodes = useMemo(() => [[-0.42, 0.18, 0.12], [-0.08, 0.4, 0.16], [0.36, 0.2, 0.12], [-0.3, -0.22, 0.14], [0.1, -0.08, 0.18], [0.38, -0.28, 0.12]], []);
  const links = useMemo(() => [[0, 1], [1, 2], [0, 3], [3, 4], [4, 5], [4, 1], [5, 2], [3, 1]].map(([a, b]) => [nodes[a], nodes[b]]), [nodes]);
  const curve = useMemo(() => new THREE.CatmullRomCurve3([0, 1, 2, 5, 4, 3, 0].map((index) => new THREE.Vector3(...nodes[index]))), [nodes]);
  const vector = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    if (pulse.current) curve.getPoint((clock.elapsedTime * (intense ? 0.34 : 0.15)) % 1, pulse.current.position.copy(vector));
  });
  return (
    <group>
      <Plate gold={gold} cyan={cyan} />
      <Segments segments={links} color={gold} opacity={0.72} />
      {nodes.map((node, index) => (
        <group key={node.join()} position={node}>
          <mesh><sphereGeometry args={[0.075, 12, 12]} /><meshBasicMaterial color={index === 1 ? gold : cyan} transparent opacity={0} toneMapped={false} userData={{ designOpacity: 1, baseColor: index === 1 ? gold : cyan }} /></mesh>
          <mesh><sphereGeometry args={[0.13, 12, 12]} /><meshBasicMaterial color={cyan} transparent opacity={0} depthWrite={false} toneMapped={false} userData={{ designOpacity: 0.12, baseColor: cyan }} /></mesh>
        </group>
      ))}
      <mesh ref={pulse}><sphereGeometry args={[0.042, 8, 8]} /><meshBasicMaterial color="#f7fbff" transparent opacity={0} toneMapped={false} userData={{ designOpacity: 1, baseColor: '#f7fbff' }} /></mesh>
    </group>
  );
}

function QuotationModule({ gold, cyan, intense }) {
  const stamp = useRef();
  const imprint = useRef();
  const rules = useMemo(() => [[-0.28, 0.22, 0.12], [-0.28, 0.1, 0.12], [-0.28, -0.02, 0.12]].map((start, index) => [start, [index === 1 ? 0.02 : 0.24, start[1], 0.12]]), []);
  useFrame(({ clock }, delta) => {
    const cycle = (clock.elapsedTime * (intense ? 0.72 : 0.42)) % 1;
    const falling = cycle < 0.62;
    const progress = falling ? 1 - (1 - cycle / 0.62) ** 3 : 1;
    if (stamp.current) {
      stamp.current.position.y = 0.58 - progress * 0.72;
      const impact = !falling && cycle < 0.78 ? Math.sin(((cycle - 0.62) / 0.16) * Math.PI) : 0;
      stamp.current.scale.set(1 + impact * 0.18, 1 - impact * 0.22, 1);
    }
    if (imprint.current) imprint.current.material.opacity = damp(imprint.current.material.opacity, falling ? 0.08 : 0.85, 5, delta);
  });
  return (
    <group>
      <Plate gold={gold} cyan={cyan} />
      {[3, 2, 1, 0].map((i) => <WireBox key={i} size={[0.78, 0.92, 0.018]} position={[-0.08 + i * 0.045, -0.08 + i * 0.035, -0.08 + i * 0.05]} color={gold} opacity={0.82} fill="#241f18" fillOpacity={0.72} />)}
      <Segments segments={rules} color={cyan} opacity={0.7} />
      <mesh ref={imprint} position={[0.12, -0.18, 0.13]} rotation={[0, 0, -0.2]}><ringGeometry args={[0.09, 0.115, 24]} /><meshBasicMaterial color={gold} transparent opacity={0} toneMapped={false} side={THREE.DoubleSide} /></mesh>
      <group ref={stamp} position={[0.12, 0.4, 0.24]}>
        <mesh><torusGeometry args={[0.105, 0.01, 8, 28]} /><meshBasicMaterial color={gold} transparent opacity={0} toneMapped={false} userData={{ designOpacity: 1, edge: true, baseColor: gold }} /></mesh>
        <Line points={[[-0.045, -0.01, 0.02], [-0.012, -0.042, 0.02], [0.05, 0.04, 0.02]]} color={gold} opacity={1} />
      </group>
    </group>
  );
}

function DashboardModule({ gold, cyan, intense }) {
  const bars = useRef([]);
  const dot = useRef();
  const curve = useMemo(() => new THREE.CatmullRomCurve3([[-0.46, -0.02, 0.12], [-0.28, 0.16, 0.12], [-0.08, 0.05, 0.12], [0.1, 0.28, 0.12], [0.28, 0.18, 0.12], [0.46, 0.36, 0.12]].map((point) => new THREE.Vector3(...point))), []);
  const points = useMemo(() => curve.getPoints(40).map((point) => point.toArray()), [curve]);
  const guides = useMemo(() => [-0.24, -0.05, 0.14].map((y) => [[-0.5, y, 0.1], [0.5, y, 0.1]]), []);
  const vector = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }, delta) => {
    bars.current.forEach((bar, index) => {
      if (!bar) return;
      const height = 0.12 + ((Math.sin(clock.elapsedTime * (intense ? 2.2 : 0.95) + index * 0.9) + 1) / 2) * (0.18 + index * 0.045);
      bar.scale.y = damp(bar.scale.y, height, 4.5, delta);
      bar.position.y = -0.36 + bar.scale.y / 2;
    });
    if (dot.current) curve.getPoint((Math.sin(clock.elapsedTime * (intense ? 1.6 : 0.75)) + 1) / 2, dot.current.position.copy(vector));
  });
  return (
    <group>
      <Plate gold={gold} cyan={cyan} />
      <WireBox size={[1.12, 0.86, 0.02]} position={[0, -0.04, 0.06]} color={cyan} opacity={0.45} fill="#10242b" fillOpacity={0.42} />
      <Segments segments={guides} color={gold} opacity={0.2} />
      {Array.from({ length: 6 }, (_, index) => (
        <mesh key={index} ref={(element) => { bars.current[index] = element; }} position={[-0.4 + index * 0.16, -0.28, 0.12]} scale={[1, 0.18, 1]}>
          <boxGeometry args={[0.075, 1, 0.02]} />
          <meshBasicMaterial color={index === 4 ? gold : cyan} transparent opacity={0} toneMapped={false} userData={{ designOpacity: 0.82, baseColor: index === 4 ? gold : cyan }} />
        </mesh>
      ))}
      <Line points={points} color={cyan} opacity={0.95} />
      <mesh ref={dot}><sphereGeometry args={[0.038, 8, 8]} /><meshBasicMaterial color="#f4fbff" transparent opacity={0} toneMapped={false} userData={{ designOpacity: 1, baseColor: '#f4fbff' }} /></mesh>
    </group>
  );
}

function Padlock({ locked, stage, gold }) {
  const group = useRef();
  const shackle = useRef();
  const materials = useRef([]);
  useEffect(() => {
    materials.current = [];
    group.current?.traverse((object) => { if (object.material) materials.current.push(object.material); });
  }, []);
  useFrame((_, delta) => {
    const active = stage === 3 && locked;
    materials.current.forEach((material) => { material.opacity = damp(material.opacity, active ? (material.userData.designOpacity ?? 1) : 0, active ? 4 : 2.4, delta); });
    if (shackle.current) shackle.current.rotation.z = damp(shackle.current.rotation.z, active ? 0 : -1.05, 3.6, delta);
    if (group.current) group.current.visible = active || materials.current.some((material) => material.opacity > 0.02);
  });
  return (
    <group ref={group} position={[0.22, 0.34, 0.42]} visible={false}>
      <mesh position={[0, -0.02, -0.04]}><circleGeometry args={[0.25, 24]} /><meshBasicMaterial color="#100e0b" transparent opacity={0} depthWrite={false} userData={{ designOpacity: 0.72 }} /></mesh>
      <Line points={[[-0.13, -0.15, 0], [0.13, -0.15, 0], [0.13, 0.05, 0], [-0.13, 0.05, 0], [-0.13, -0.15, 0]]} color={gold} opacity={1} />
      <group ref={shackle} position={[-0.1, 0.05, 0]}>
        <Line points={[[0, 0, 0], [0, 0.1, 0], [0.04, 0.17, 0], [0.1, 0.2, 0], [0.16, 0.17, 0], [0.2, 0.1, 0], [0.2, 0, 0]]} color={gold} opacity={1} />
      </group>
      <mesh position={[0, -0.05, 0.01]}><sphereGeometry args={[0.025, 8, 8]} /><meshBasicMaterial color={gold} transparent opacity={0} toneMapped={false} userData={{ designOpacity: 1, baseColor: gold }} /></mesh>
    </group>
  );
}

function Module({ module, stage, role, hovered, focused, dimmed, gold, cyan, onHover, onSelect, children }) {
  const group = useRef();
  const content = useRef();
  const materials = useRef([]);
  const hoverColor = useMemo(() => new THREE.Color(cyan), [cyan]);
  const locked = stage === 3 && !PERMISSIONS[role].includes(module.id);
  useEffect(() => {
    const found = [];
    content.current?.traverse((object) => {
      const list = object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
      list.forEach((material) => {
        if (material.userData.designOpacity == null) return;
        found.push({ material, opacity: material.userData.designOpacity, color: new THREE.Color(material.userData.baseColor || material.color), edge: Boolean(material.userData.edge) });
      });
    });
    materials.current = found;
    return () => { materials.current = []; };
  }, []);
  useEffect(() => {
    materials.current.forEach((item) => {
      if (item.material.userData.baseColor === gold || item.material.userData.baseColor === '#f5c451') item.color.set(gold);
      if (item.material.userData.baseColor === cyan || item.material.userData.baseColor === '#6cc7e8') item.color.set(cyan);
    });
  }, [gold, cyan]);
  useFrame(({ clock }, delta) => {
    const lift = hovered || focused ? 0.16 : 0;
    group.current.position.y = damp(group.current.position.y, module.position[1] + lift + Math.sin(clock.elapsedTime * 0.8 + module.position[0]) * 0.035, 4, delta);
    const presence = stage >= 2 ? (locked ? 0.9 : 1) : stage === 1 ? 0.72 : 0.62;
    group.current.scale.setScalar(damp(group.current.scale.x, presence * (hovered || focused ? 1.1 : 1), 4, delta));
    const visibility = stage >= 2 ? (locked ? 0.2 : dimmed ? 0.42 : 1) : stage === 1 ? 0.1 : 0.045;
    materials.current.forEach(({ material, opacity, color, edge }) => {
      material.opacity = damp(material.opacity, opacity * visibility, 3.1, delta);
      if (edge && material.color) material.color.lerp(hovered || focused ? hoverColor : color, 1 - Math.exp(-5 * delta));
    });
  });
  return (
    <group ref={group} position={module.position} onPointerOver={(event) => { event.stopPropagation(); onHover(module.id); }} onPointerOut={() => onHover(null)} onClick={(event) => { event.stopPropagation(); if (event.delta > 5) return; onSelect(module.id); }}>
      <group ref={content}>{children}</group>
      <mesh><boxGeometry args={[1.5, 1.62, 0.9]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
      <Padlock locked={locked} stage={stage} gold={gold} />
    </group>
  );
}

function CameraRig({ focus, enableRotate, stage }) {
  const controls = useRef();
  const interacting = useRef(false);
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }, delta) => {
    const aspect = size.width / Math.max(size.height, 1);
    // Fit all four modules inside the existing square card.
    const viewWidth = stage >= 2 ? 6.1 : 5.3;
    const distance = viewWidth / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * Math.min(aspect, 1.4));
    const selected = MODULES.find((item) => item.id === focus);
    target.set(selected ? selected.position[0] * 0.82 : 0, selected ? selected.position[1] * 0.72 : 0.02, 0);
    if (interacting.current) return;
    camera.position.set(
      damp(camera.position.x, target.x + (selected ? selected.position[0] * 0.08 : 0), 2.1, delta),
      damp(camera.position.y, target.y + 0.28, 2.1, delta),
      damp(camera.position.z, distance * (selected ? 0.62 : 1), 2.1, delta),
    );
    if (controls.current) {
      controls.current.target.lerp(target, 1 - Math.exp(-3 * delta));
      controls.current.update();
    } else camera.lookAt(target);
  });
  return enableRotate ? (
    <OrbitControls ref={controls} enableZoom={false} enablePan={false} enableDamping dampingFactor={0.08} rotateSpeed={0.55} minPolarAngle={Math.PI * 0.3} maxPolarAngle={Math.PI * 0.66} onStart={() => { interacting.current = true; }} onEnd={() => { interacting.current = false; }} />
  ) : null;
}

function SceneContents({ stage, role, focus, hovered, gold, cyan, enableRotate, onHover, onSelect }) {
  const world = useRef();
  useFrame(({ pointer }, delta) => {
    if (!world.current) return;
    world.current.rotation.y = damp(world.current.rotation.y, pointer.x * 0.045, 2, delta);
    world.current.rotation.x = damp(world.current.rotation.x, -pointer.y * 0.03, 2, delta);
  });
  const modules = {
    inventory: <InventoryModule gold={gold} cyan={cyan} intense={focus === 'inventory'} />,
    crm: <CrmModule gold={gold} cyan={cyan} intense={focus === 'crm'} />,
    quotation: <QuotationModule gold={gold} cyan={cyan} intense={focus === 'quotation'} />,
    dashboard: <DashboardModule gold={gold} cyan={cyan} intense={focus === 'dashboard'} />,
  };
  return (
    <>
      <CameraRig focus={focus} enableRotate={enableRotate} stage={stage} />
      <group ref={world}>
        <SpreadsheetFrame stage={stage} gold={gold} />
        <Funnel stage={stage} gold={gold} cyan={cyan} />
        <CellCloud stage={stage} role={role} cyan={cyan} />
        {MODULES.map((module, index) => <DataLink key={module.id} module={module} index={index} stage={stage} cyan={cyan} locked={stage === 3 && !PERMISSIONS[role].includes(module.id)} />)}
        <SystemCore stage={stage} gold={gold} cyan={cyan} />
        {MODULES.map((module) => (
          <Module key={module.id} module={module} stage={stage} role={role} hovered={hovered === module.id} focused={focus === module.id} dimmed={Boolean(focus && focus !== module.id)} gold={gold} cyan={cyan} onHover={onHover} onSelect={onSelect}>
            {modules[module.id]}
          </Module>
        ))}
      </group>
    </>
  );
}


const initialState = { stage: 0, role: 'Admin', playing: true, hovered: null, focus: null };
function sceneReducer(state, action) {
  switch (action.type) {
    case 'advance': return { ...state, stage: (state.stage + 1) % STAGE_COUNT, role: 'Admin', focus: null, hovered: null };
    case 'role': return { ...state, role: ROLES[(ROLES.indexOf(state.role) + 1) % ROLES.length] };
    case 'hover': return { ...state, hovered: action.id };
    case 'select': return { ...state, playing: false, stage: Math.max(2, state.stage), focus: state.focus === action.id ? null : action.id };
    case 'stage': return { ...state, stage: action.stage, playing: false, focus: null, hovered: null };
    case 'pause': return { ...state, playing: !state.playing };
    case 'clear': return { ...state, focus: null, hovered: null };
    case 'resume': return { ...state, focus: null, hovered: null, playing: true };
    default: return state;
  }
}

function subscribePreferences(callback) {
  const queries = [window.matchMedia('(pointer: coarse)'), window.matchMedia('(prefers-reduced-motion: reduce)')];
  queries.forEach((query) => query.addEventListener('change', callback));
  return () => queries.forEach((query) => query.removeEventListener('change', callback));
}
const getCoarseSnapshot = () => window.matchMedia('(pointer: coarse)').matches;
const getReducedSnapshot = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const getServerSnapshot = () => true;

export default function SoftwareDevScene({ light = false, renderActive = true }) {
  const [state, dispatch] = useReducer(sceneReducer, initialState);
  const coarse = useSyncExternalStore(subscribePreferences, getCoarseSnapshot, getServerSnapshot);
  const reduced = useSyncExternalStore(subscribePreferences, getReducedSnapshot, getServerSnapshot);
  const gold = light ? '#b87d14' : '#f5c451';
  const cyan = light ? '#0077b6' : '#6cc7e8';
  const onHover = useCallback((id) => dispatch({ type: 'hover', id }), []);
  const onSelect = useCallback((id) => dispatch({ type: 'select', id }), []);

  useEffect(() => {
    if (!renderActive) return;
    if (!state.playing || reduced) return;
    const id = window.setInterval(() => dispatch({ type: 'advance' }), 4200);
    return () => window.clearInterval(id);
  }, [state.playing, reduced, renderActive]);

  useEffect(() => {
    if (!renderActive) return;
    if (state.stage !== 3 || !state.playing || reduced) return;
    // Show the supplied role-lock animation without importing preview controls.
    const id = window.setInterval(() => dispatch({ type: 'role' }), 1400);
    return () => window.clearInterval(id);
  }, [state.stage, state.playing, reduced, renderActive]);

  return (
    <div
      className="absolute inset-0"
      tabIndex={0}
      role="region"
      aria-label="Interactive software development visualization"
      onPointerLeave={() => onHover(null)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          dispatch({ type: 'stage', stage: (state.stage + 1) % STAGE_COUNT });
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          dispatch({ type: 'stage', stage: (state.stage - 1 + STAGE_COUNT) % STAGE_COUNT });
        } else if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          dispatch({ type: 'pause' });
        } else if (event.key === 'Escape') {
          dispatch({ type: 'resume' });
        }
      }}
    >
      <ScenePreparation name="software">
        {(onPrepared) => (
          <Canvas
            frameloop={renderActive ? "always" : "demand"}
            camera={{ position: [0, 0.3, 9.5], fov: 32, near: 0.1, far: 50 }}
            dpr={servicePixelRatio(renderActive)}
            gl={{ alpha: true, antialias: true, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
            style={{ position: 'absolute', inset: 0, background: 'transparent', touchAction: coarse ? 'pan-y' : 'none' }}
            onPointerMissed={() => dispatch({ type: 'clear' })}
          >
            <SceneContents
              stage={state.stage} role={state.role} focus={state.focus} hovered={state.hovered}
              gold={gold} cyan={cyan} enableRotate={!coarse}
              onHover={onHover} onSelect={onSelect}
            />
            <SceneCompilation />
            <SceneWarmup onRendered={onPrepared} />
          </Canvas>
        )}
      </ScenePreparation>
    </div>
  );
}
