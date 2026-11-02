"use client";

/** 3D scene adapted from catalogue three.js/src/CatalogueScene.jsx.
 * Page artwork is part of the model; preview UI, modals, and audio are excluded. */
import { useRef, useState, useEffect, useMemo, useCallback, useLayoutEffect, useReducer, useSyncExternalStore } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PresentationControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  generatePageCanvas,
  generateSpreadCanvas,
  generateCsvCanvas,
  pickProductAt,
  drawCardHighlight,
  makeTextureFromCanvas,
  PAGE_W_PX,
  PAGE_H_PX,
  GRID_CARDS
} from './catalogue/canvasRenderer';
import { INITIAL_PRODUCTS } from './catalogue/catalogueData';

/* -------------------------------------------------------------------------- */
/*  geometry constants                                                        */
/* -------------------------------------------------------------------------- */
const PAGE_W = 2.2;
const PAGE_H = 3.01;
const SEG_X = 32;
const SEG_Y = 12;
const LEAVES = 4;
const MAX_SPREAD = LEAVES;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const particleSample = (seed) => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};

const STAGE_COUNT = 5;

/* -------------------------------------------------------------------------- */
/*  assets — canvas artwork becomes GPU textures                              */
/* -------------------------------------------------------------------------- */
function useCatalogueAssets(products, gold, cyan) {
  const [assets, setAssets] = useState(null);
  useEffect(() => {
    let disposed = false;
    const created = [];
    let fontTimeout;
    const keep = (texture) => { created.push(texture); return texture; };
    async function compose() {
      try {
        await Promise.race([
          document.fonts?.ready ?? Promise.resolve(),
          new Promise((resolve) => { fontTimeout = window.setTimeout(resolve, 1400); }),
        ]);
        window.clearTimeout(fontTimeout);
        if (disposed) return;
        const canvases = Array.from({ length: 8 }, (_, index) => generatePageCanvas(index, products, { gold, cyan }));
        const mirror = (source) => {
          const canvas = document.createElement('canvas');
          canvas.width = source.width;
          canvas.height = source.height;
          const context = canvas.getContext('2d');
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
          context.drawImage(source, 0, 0);
          return canvas;
        };
        const pages = canvases.map((canvas, index) => keep(makeTextureFromCanvas(index % 2 ? mirror(canvas) : canvas, 8)));
        const spec = keep(makeTextureFromCanvas(canvases[5], 8));
        const spread = keep(makeTextureFromCanvas(generateSpreadCanvas(products, { gold, cyan }), 8));
        const csv = keep(makeTextureFromCanvas(generateCsvCanvas(gold, cyan), 4));
        setAssets({ pages, spec, spread, csv });
      } catch (error) {
        if (!disposed) setAssets({ error });
      }
    }
    void compose();
    return () => {
      disposed = true;
      window.clearTimeout(fontTimeout);
      created.forEach((texture) => texture.dispose());
    };
  }, [products, gold, cyan]);
  if (assets?.error) throw assets.error;
  return assets;
}

/* -------------------------------------------------------------------------- */
/*  a tiny radial shadow, used as a fake contact shadow                       */
/* -------------------------------------------------------------------------- */
function useShadowTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(128, 64, 4, 128, 64, 120);
    g.addColorStop(0, 'rgba(0,0,0,0.72)');
    g.addColorStop(0.42, 'rgba(0,0,0,0.34)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/* -------------------------------------------------------------------------- */
/*  page block — 18 visible sheet edges per side                              */
/* -------------------------------------------------------------------------- */
function PageStack({ side, shadowless }) {
  const meshRef = useRef();
  const count = 18;
  const matrix = useMemo(() => new THREE.Matrix4(), []);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < count; i++) {
      matrix.makeTranslation(0, 0, -0.006 - i * 0.0026);
      meshRef.current.setMatrixAt(i, matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [matrix]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      position={[side === 'right' ? PAGE_W / 2 : -PAGE_W / 2, 0, 0]}
      castShadow={false}
      receiveShadow={false}
    >
      <boxGeometry args={[PAGE_W - 0.035, PAGE_H - 0.045, 0.0019]} />
      <meshStandardMaterial
        color="#e8decc"
        roughness={0.94}
        metalness={0}
        transparent
        opacity={shadowless ? 0 : 1}
      />
    </instancedMesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Layout scan overlay — stage 02                                            */
/* -------------------------------------------------------------------------- */
function LayoutScan({ gold, cyan }) {
  const group = useRef();
  const lineMats = useRef([]);
  const sweep = useRef();
  const cardGroup = useRef();

  const geometry = useMemo(() => {
    const verts = [];
    const pad = 0.16;
    const pw = PAGE_W - pad * 2;
    const ph = PAGE_H - pad * 2;
    const x0 = pad;
    const x1 = PAGE_W - pad;
    const y0 = -PAGE_H / 2 + pad;
    const y1 = PAGE_H / 2 - pad;

    for (let c = 0; c <= 12; c++) {
      const x = x0 + (pw / 12) * c;
      verts.push(x, y0, 0, x, y1, 0);
    }
    for (let r = 0; r <= 8; r++) {
      const y = y0 + (ph / 8) * r;
      verts.push(x0, y, 0, x1, y, 0);
    }

    // card outlines in page space
    GRID_CARDS.xs.forEach((cx) => {
      GRID_CARDS.ys.forEach((cy) => {
        const x = (cx / PAGE_W_PX) * PAGE_W;
        const y = PAGE_H / 2 - (cy / PAGE_H_PX) * PAGE_H;
        const w = (GRID_CARDS.w / PAGE_W_PX) * PAGE_W;
        const h = (GRID_CARDS.h / PAGE_H_PX) * PAGE_H;
        verts.push(x, y, 0, x + w, y, 0);
        verts.push(x + w, y, 0, x + w, y - h, 0);
        verts.push(x + w, y - h, 0, x, y - h, 0);
        verts.push(x, y - h, 0, x, y, 0);
      });
    });

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    return g;
  }, []);

  const cardBars = useMemo(() => {
    const items = [];
    GRID_CARDS.xs.forEach((cx, col) => {
      GRID_CARDS.ys.forEach((cy, row) => {
        items.push({
          x: (cx / PAGE_W_PX) * PAGE_W,
          y: PAGE_H / 2 - (cy / PAGE_H_PX) * PAGE_H,
          w: (GRID_CARDS.w / PAGE_W_PX) * PAGE_W,
          h: (GRID_CARDS.h / PAGE_H_PX) * PAGE_H,
          delay: (row * 2 + col) * 0.16
        });
      });
    });
    return items;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const intro = clamp(t / 0.7);
    const fade = clamp((t - 3.1) / 0.9);
    if (lineMats.current[0]) lineMats.current[0].opacity = 0.34 * intro * (1 - fade);
    if (sweep.current) {
      const cyc = (t * 0.55) % 1;
      sweep.current.position.y = PAGE_H / 2 - 0.22 - cyc * (PAGE_H - 0.44);
      sweep.current.material.opacity = 0.6 * intro * (1 - fade) * Math.sin(cyc * Math.PI);
    }
    if (cardGroup.current) {
      cardGroup.current.children.forEach((m, i) => {
        const d = cardBars[i]?.delay ?? 0;
        const p = clamp((t - 0.55 - d) / 0.35);
        if (m.material) {
          m.material.opacity = 0.16 * p * (1 - fade);
        }
        m.scale.setScalar(0.96 + 0.04 * p);
      });
    }
    if (group.current) group.current.visible = t < 4.15;
  });

  return (
    <group ref={group} position={[0, 0, 0.045]}>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial ref={(m) => (lineMats.current[0] = m)} color={cyan} transparent opacity={0} depthWrite={false} />
      </lineSegments>

      <mesh ref={sweep} position={[PAGE_W / 2, 0, 0.01]}>
        <planeGeometry args={[PAGE_W - 0.3, 0.012]} />
        <meshBasicMaterial color={cyan} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <group ref={cardGroup}>
        {cardBars.map((c, i) => (
          <mesh key={i} position={[c.x + c.w / 2, c.y - c.h / 2, 0.008]}>
            <planeGeometry args={[c.w, c.h]} />
            <meshBasicMaterial color={i % 2 === 0 ? gold : cyan} transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  CSV table + data rain — stage 01                                          */
/* -------------------------------------------------------------------------- */
function DataStream({ texture, gold, cyan }) {
  const group = useRef();
  const table = useRef();
  const rain = useRef();
  const seeds = useMemo(
    () =>
      Array.from({ length: 22 }, (_, index) => ({
        x: (particleSample(index * 5 + 0) - 0.5) * 2.1,
        z: (particleSample(index * 5 + 1) - 0.5) * 0.6,
        off: particleSample(index * 5 + 2) * 2.6,
        speed: 0.45 + particleSample(index * 5 + 3) * 0.55,
        s: 0.55 + particleSample(index * 5 + 4) * 0.8
      })),
    []
  );
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const scaleVec = useMemo(() => new THREE.Vector3(1, 1, 1), []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.visible = true;
      group.current.position.y = 1.5 + Math.sin(t * 0.9) * 0.05;
      group.current.rotation.y = -0.22 + Math.sin(t * 0.4) * 0.03;
    }
    if (table.current) {
      table.current.material.opacity = 0.96;
    }
    if (rain.current) {
      for (let i = 0; i < seeds.length; i++) {
        const s = seeds[i];
        let p = (t * s.speed + s.off) % 2.2;
        const y = 1.12 - p;
        const scale = s.s * (1 - clamp(p / 2.2) * 0.4);
        matrix.makeTranslation(s.x, y, s.z);
        scaleVec.set(scale, scale, scale);
        matrix.scale(scaleVec);
        rain.current.setMatrixAt(i, matrix);
      }
      rain.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={group} position={[-0.25, 1.5, 0.55]}>
      <group rotation={[-0.1, 0, 0]}>
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[2.32, 1.12]} />
          <meshBasicMaterial color="#08161c" transparent opacity={0.9} />
        </mesh>
        <mesh ref={table}>
          <planeGeometry args={[2.2, 1.05]} />
          <meshBasicMaterial map={texture} transparent opacity={1} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.006]}>
          <planeGeometry args={[2.3, 1.11]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.05} />
        </mesh>
      </group>

      <instancedMesh ref={rain} args={[undefined, undefined, seeds.length]}>
        <planeGeometry args={[0.22, 0.045]} />
        <meshBasicMaterial color={cyan} transparent opacity={0.55} toneMapped={false} side={THREE.DoubleSide} />
      </instancedMesh>

      <mesh position={[0, -1.04, 0.04]}>
        <planeGeometry args={[1.7, 0.01]} />
        <meshBasicMaterial color={gold} transparent opacity={0.65} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  one deformable leaf                                                       */
/* -------------------------------------------------------------------------- */
function Leaf({
  index,
  spread,
  progress,
  targets,
  products,
  textures,
  active,
  gold,
  cyan,
  interactionRef,
  onFlip,
  onPick,
  onCursor,
  onDragging
}) {
  const groupRef = useRef();
  const pageMeshRef = useRef();
  const frontMaterialRef = useRef();
  const [hover, setHover] = useState(false);
  const [highlightSlot, setHighlightSlot] = useState(-1);
  const last = useRef({ t: -1, hover: false });
  const baseCanvases = useRef(null);
  const listeners = useRef(null);
  const drag = useRef(null);

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(PAGE_W, PAGE_H, SEG_X, SEG_Y);
    g.translate(PAGE_W / 2, 0, 0);
    // generous fixed bounds keep three from recomputing (and warning) mid-curl
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), PAGE_W * 1.9);
    g.attributes.normal.setUsage(THREE.DynamicDrawUsage);
    g.attributes.position.setUsage(THREE.DynamicDrawUsage);
    return g;
  }, []);

  const base = useMemo(() => {
    const arr = geometry.attributes.position.array;
    const out = [];
    for (let i = 0; i < arr.length; i += 3) {
      out.push({ u: arr[i] / PAGE_W, v: arr[i + 1] / PAGE_H });
    }
    return out;
  }, [geometry]);

  useEffect(
    () => () => {
      geometry.dispose();
      if (listeners.current) {
        window.removeEventListener('pointermove', listeners.current.move);
        window.removeEventListener('pointerup', listeners.current.up);
        window.removeEventListener('pointercancel', listeners.current.up);
        listeners.current = null;
      }
    },
    [geometry]
  );

  const frontPage = index * 2;
  const backPage = index * 2 + 1;


  // remember the un-painted artwork so highlights can be toggled cheaply
  useEffect(() => {
    if (!textures) return undefined;
    {
      baseCanvases.current = {
        front: generatePageCanvas(frontPage, products, { gold, cyan }),
        back: generatePageCanvas(backPage, products, { gold, cyan })
      };
    }
    return undefined;
  }, [textures, frontPage, backPage, products, gold, cyan]);


  useEffect(() => {
    if (!baseCanvases.current) return;
    const base = frontPage === 2 || frontPage === 4 ? baseCanvases.current.front : null;
    const tex = frontMaterialRef.current?.map;
    if (!base || !tex) return;
    const c = document.createElement('canvas');
    c.width = base.width;
    c.height = base.height;
    c.getContext('2d').drawImage(base, 0, 0);
    if (highlightSlot >= 0) {
      drawCardHighlight(c.getContext('2d'), highlightSlot, gold, cyan);
    }
    tex.image = c;
    tex.needsUpdate = true;
  }, [highlightSlot, textures, frontPage, gold, cyan]);



  const beginDrag = (e) => {
    if (!active) return;
    e.stopPropagation();
    const native = e.nativeEvent || e;
    if (native.pointerType === 'touch') return;
    const startX = native.clientX;
    const startY = native.clientY;
    const uv = e.uv || { x: 0.5, y: 0.5 };
    // whichever paper side currently faces the viewer owns the tap
    const face = progress.current[index] > 0.5 ? 'back' : 'front';
    const pageIndex = face === 'front' ? frontPage : backPage;

    drag.current = { startX, startY, startAngle: progress.current[index], moved: 0, uv, pageIndex, face };
    listeners.current = { move: null, up: null };

    const move = (ev) => {
      if (!drag.current) return;
      const dx = ev.clientX - drag.current.startX;
      const dy = ev.clientY - drag.current.startY;
      drag.current.moved = Math.max(drag.current.moved, Math.abs(dx), Math.abs(dy));
      if (drag.current.moved < 3) return;
      ev.preventDefault();
      // dragging right closes a leaf; dragging left opens it
      const next = clamp(drag.current.startAngle - dx / 285);
      progress.current[index] = next;
    };

    const up = (ev) => {
      const d = drag.current;
      drag.current = null;
      interactionRef.current = -1;
      onDragging(false);
      onCursor('default');
      if (listeners.current) {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        listeners.current = null;
      }
      if (!d) return;
      if (ev.type === 'pointercancel') {
        targets.current[index] = index < spread ? 1 : 0;
        return;
      }

      if (d.moved < 7) {
        // a tap: either a product card or the page edge
        const clickU = d.face === 'front' ? d.uv.x : 1 - d.uv.x;
        const picked = pickProductAt(d.pageIndex, clickU, d.uv.y, products);
        if (picked) {
          const slot = d.pageIndex === 2 ? products.indexOf(picked) : products.indexOf(picked) - 6;
          setHighlightSlot(slot);
          onPick(picked, ev.clientX, ev.clientY);
        } else if (d.uv.x > 0.9) {
          onFlip(d.pageIndex % 2 === 0 ? 1 : -1);
        }
        // snap any accidental nudge back
        const snapped = progress.current[index] > 0.5 ? 1 : 0;
        targets.current[index] = snapped;
        if (progress.current[index] !== snapped) {
          // damped back in the parent loop
        }
        return;
      }

      const snapped = progress.current[index] > 0.5 ? 1 : 0;
      progress.current[index] = clamp(progress.current[index]);
      if (snapped === 1) {
        if (index === spread) {
          targets.current[index] = 1;
          onFlip(1);
        } else {
          targets.current[index] = 0;
        }
      } else if (index === spread - 1) {
        targets.current[index] = 0;
        onFlip(-1);
      } else {
        targets.current[index] = 1;
      }
    };

    listeners.current = { move, up };
    interactionRef.current = index;
    onDragging(true);
    onCursor('grabbing');
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  useFrame((state, dt) => {
    const geometry = pageMeshRef.current?.geometry;
    if (!geometry || !base.length) return;
    const raw = progress.current[index];

    // keep the sheet in the correct side of the block, smoothly through the flip
    if (groupRef.current) {
      const zRight = 0.026 - index * 0.0026;
      const zLeft = 0.012 + index * 0.0026;
      const mix = THREE.MathUtils.smoothstep(raw, 0.22, 0.78);
      groupRef.current.position.z = THREE.MathUtils.damp(
        groupRef.current.position.z,
        THREE.MathUtils.lerp(zRight, zLeft, mix),
        10,
        dt
      );
    }

    const hoverHint = hover && active ? (raw > 0.5 ? -0.032 : 0.048) : 0;
    const t = clamp(raw + hoverHint);
    if (Math.abs(t - last.current.t) < 0.00035 && hover === last.current.hover) {
      return;
    }
    last.current = { t, hover };

    const phi = t * Math.PI;
    const sinPhi = Math.sin(phi);
    const pos = geometry.attributes.position;

    for (let i = 0; i < base.length; i++) {
      const { u, v } = base[i];

      // spine pinned. The leaf sweeps a half-turn; bend terms vanish at both
      // ends so the sheet lies perfectly flat when open or turned.
      const curl = sinPhi * Math.sin(Math.PI * u) * (0.46 + 0.2 * (v + 0.5));
      const theta = phi + curl;
      const lift = sinPhi * Math.sin(Math.PI * u) * (v + 0.5) * 0.055;

      pos.setXYZ(i, u * PAGE_W * Math.cos(theta), v * PAGE_H, u * PAGE_W * Math.sin(theta) * 0.62 + lift);
    }

    pos.needsUpdate = true;
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.attributes.normal.needsUpdate = true;

  });

  const handlePointerMove = (e) => {
    if (!active || drag.current) return;
    const nearEdge = e.uv && e.uv.x > 0.9;
    setHover(nearEdge);
    onCursor(nearEdge ? 'pointer' : 'grab');
  };

  const clearHover = () => {
    setHover(false);
    onCursor('default');
  };

  const frontTex = textures?.[frontPage];
  const backTex = textures?.[backPage];

  return (
    <group ref={groupRef}>
      <mesh
        ref={pageMeshRef}
        geometry={geometry}
        frustumCulled={false}
        onPointerDown={(e) => beginDrag(e)}
        onPointerMove={handlePointerMove}
        onPointerOut={clearHover}
      >
        <meshStandardMaterial
          ref={frontMaterialRef}
          map={frontTex}
          side={THREE.FrontSide}
          roughness={0.8}
          metalness={0.02}
        />
      </mesh>

      {/* back artwork, sharing the same curled surface */}
      <mesh
        geometry={geometry}
        position={[0, 0, -0.0009]}
        frustumCulled={false}
        onPointerDown={(e) => beginDrag(e)}
        onPointerMove={handlePointerMove}
        onPointerOut={clearHover}
      >
        <meshStandardMaterial
          map={backTex}
          side={THREE.BackSide}
          roughness={0.8}
          metalness={0.02}
        />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  book assembly                                                             */
/* -------------------------------------------------------------------------- */
function Book({
  spread,
  products,
  textures,
  interactionRef,
  onFlip,
  onPick,
  onCursor,
  onDragging,
  stage,
  gold,
  cyan,
  enableRotate,
  dragging
}) {
  const wrapper = useRef();
  const targets = useRef([0, 1, 2, 3].map((i) => (i < spread ? 1 : 0)));
  const progress = useRef([0, 1, 2, 3].map((i) => (i < spread ? 1 : 0)));
  const shadowTex = useShadowTexture();

  useEffect(() => {
    targets.current = [0, 1, 2, 3].map((i) => (i < spread ? 1 : 0));
  }, [spread]);

  useEffect(() => () => shadowTex?.dispose(), [shadowTex]);

  useFrame((state, dt) => {
    for (let i = 0; i < LEAVES; i++) {
      if (interactionRef.current === i) continue;
      progress.current[i] = THREE.MathUtils.damp(progress.current[i], targets.current[i], 8, dt);
    }

    if (!wrapper.current) return;
    const closed = spread === 0;
    const solo = spread >= LEAVES;
    const tx = closed ? -0.34 : solo ? 0.92 : 0;
    const ty = 0.12;
    const tz = closed ? 0 : -0.04;
    const tScale = closed ? 0.8 : 0.9;
    wrapper.current.position.x = THREE.MathUtils.damp(wrapper.current.position.x, tx, 4, dt);
    wrapper.current.position.y = THREE.MathUtils.damp(wrapper.current.position.y, ty, 4, dt);
    wrapper.current.position.z = THREE.MathUtils.damp(wrapper.current.position.z, tz, 4, dt);

    const rx = 0;
    const ry = 0;
    wrapper.current.rotation.x = THREE.MathUtils.damp(wrapper.current.rotation.x, rx, 4, dt);
    wrapper.current.rotation.y = THREE.MathUtils.damp(wrapper.current.rotation.y, ry, 4, dt);
    wrapper.current.rotation.z = THREE.MathUtils.damp(wrapper.current.rotation.z, closed ? 0.02 : 0.008, 4, dt);
    wrapper.current.scale.setScalar(THREE.MathUtils.damp(wrapper.current.scale.x, tScale, 4, dt));
  });

  const controls = enableRotate ? (
    <PresentationControls
      enabled={!dragging}
      snap
      global={false}
      cursor={false}
      speed={1.15}
      damping={0.18}
      rotation={[0, 0, 0]}
      polar={[-0.26, 0.3]}
      azimuth={[-0.5, 0.5]}
    >
      {/* invisible drag field: orbit when the pointer is not on a page */}
      <mesh position={[0, 0, -1.4]}>
        <planeGeometry args={[16, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <group ref={wrapper}>
        <group position={[0, 0, 0]}>
          {/* soft contact shadow (billboard) */}
          <mesh position={[0, -1.52, -0.55]}>
            <planeGeometry args={[4.9, 1.15]} />
            <meshBasicMaterial map={shadowTex} transparent opacity={0.42} depthWrite={false} color="#000000" />
          </mesh>

          {/* casing boards */}
          <mesh position={[PAGE_W / 2, 0, -0.085]}>
            <boxGeometry args={[PAGE_W + 0.07, PAGE_H + 0.07, 0.032]} />
            <meshStandardMaterial color="#151211" roughness={0.58} metalness={0.12} />
          </mesh>
          <mesh position={[-PAGE_W / 2, 0, -0.085]} visible={spread > 0}>
            <boxGeometry args={[PAGE_W + 0.07, PAGE_H + 0.07, 0.032]} />
            <meshStandardMaterial color="#151211" roughness={0.58} metalness={0.12} />
          </mesh>

          {/* rounded spine */}
          <mesh position={[0, 0, -0.075]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.075, 0.075, PAGE_H + 0.07, 16, 1, false, 0, Math.PI * 2]} />
            <meshStandardMaterial color="#0e0c0b" roughness={0.5} metalness={0.18} />
          </mesh>

          {/* paper block edges */}
          <PageStack side="right" />
          <PageStack side="left" shadowless={spread === 0} />

          {/* leaves */}
          {textures &&
            [0, 1, 2, 3].map((i) => (
              <Leaf
                key={i}
                index={i}
                spread={spread}
                progress={progress}
                targets={targets}
                products={products}
                textures={textures}
                active={i === spread || i === spread - 1}
                gold={gold}
                cyan={cyan}
                interactionRef={interactionRef}
                onFlip={onFlip}
                onPick={onPick}
                onCursor={onCursor}
                onDragging={onDragging}
              />
            ))}

          {stage === 2 && spread === 1 && (
            <group position={[PAGE_W / 2, 0, 0]}>
              <LayoutScan gold={gold} cyan={cyan} />
            </group>
          )}
        </group>
      </group>
    </PresentationControls>
  ) : (
    <group ref={wrapper}>
      <group>
        <mesh position={[0, -1.52, -0.55]}>
          <planeGeometry args={[4.9, 1.15]} />
          <meshBasicMaterial map={shadowTex} transparent opacity={0.42} depthWrite={false} color="#000000" />
        </mesh>
        <mesh position={[PAGE_W / 2, 0, -0.085]}>
          <boxGeometry args={[PAGE_W + 0.07, PAGE_H + 0.07, 0.032]} />
          <meshStandardMaterial color="#151211" roughness={0.58} metalness={0.12} />
        </mesh>
        <mesh position={[-PAGE_W / 2, 0, -0.085]} visible={spread > 0}>
          <boxGeometry args={[PAGE_W + 0.07, PAGE_H + 0.07, 0.032]} />
          <meshStandardMaterial color="#151211" roughness={0.58} metalness={0.12} />
        </mesh>
        <PageStack side="right" />
        <PageStack side="left" shadowless={spread === 0} />
        {textures &&
          [0, 1, 2, 3].map((i) => (
            <Leaf
              key={i}
              index={i}
              spread={spread}
              progress={progress}
              targets={targets}
              products={products}
              textures={textures}
              active={i === spread || i === spread - 1}
              gold={gold}
              cyan={cyan}
              interactionRef={interactionRef}
              onFlip={onFlip}
              onPick={onPick}
              onCursor={onCursor}
              onDragging={onDragging}
            />
          ))}
      </group>
    </group>
  );

  return controls;
}

/* -------------------------------------------------------------------------- */
/*  print spread                                                              */
/* -------------------------------------------------------------------------- */
function PrintSpread({ texture, active, gold, cyan }) {
  const group = useRef();
  const mat = useRef();
  const t = useRef(0);
  const W = 4.12;
  const H = 2.82;

  useFrame((state, dt) => {
    t.current = THREE.MathUtils.damp(t.current, active ? 1 : 0, 5, dt);
    if (!group.current) return;
    const e = 1 - Math.pow(1 - t.current, 3);
    group.current.position.set(0, 0.02 + (1 - e) * -0.05, -0.9 + e * 0.95);
    group.current.rotation.set(-0.16 + e * 0.1, 0.06 * (1 - e), 0.01);
    group.current.visible = t.current > 0.01;
    if (mat.current) mat.current.opacity = t.current;
  });

  return (
    <group ref={group}>
      <mesh>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial ref={mat} map={texture} transparent roughness={0.9} metalness={0} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  lifted spec sheet (stage 05)                                              */
/* -------------------------------------------------------------------------- */
function SpecSheet({ texture, active, gold, cyan }) {
  const group = useRef();
  const cover = useRef();
  const scanline = useRef();
  const t = useRef(0);
  const reveal = useRef(0);
  const W = 2.42;
  const H = 3.31;

  useFrame((state, dt) => {
    t.current = THREE.MathUtils.damp(t.current, active ? 1 : 0, 4.2, dt);
    reveal.current = clamp(reveal.current + (active ? dt * 0.42 : -dt * 2.4));
    const e = t.current * t.current * (3 - 2 * t.current);
    if (group.current) {
      group.current.position.set(
        THREE.MathUtils.lerp(0.1, 0, e),
        THREE.MathUtils.lerp(-0.06, 0.52, e),
        THREE.MathUtils.lerp(-0.1, 0.9, e)
      );
      group.current.rotation.set(
        THREE.MathUtils.lerp(-0.5, 0.02, e),
        THREE.MathUtils.lerp(0.72, 0, e),
        THREE.MathUtils.lerp(0.18, 0, e)
      );
      const s = 0.9;
      group.current.scale.setScalar(s);
      group.current.visible = t.current > 0.01;
    }
    const r = clamp((reveal.current - 0.15) / 0.72);
    if (cover.current) {
      cover.current.scale.y = Math.max(0.0001, 1 - r);
      cover.current.position.y = -r * H * 0.5;
      cover.current.material.opacity = t.current;
    }
    if (scanline.current) {
      scanline.current.position.y = H / 2 - 0.02 - r * (H - 0.04);
      scanline.current.material.opacity = t.current * (r > 0 && r < 0.98 ? 0.9 : 0);
    }
  });

  return (
    <group ref={group}>
      {/* gold edge */}
      <mesh position={[0, 0, -0.012]}>
        <planeGeometry args={[W + 0.06, H + 0.06]} />
        <meshStandardMaterial color="#b58b38" roughness={0.35} metalness={0.65} />
      </mesh>

      <mesh>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial map={texture} roughness={0.82} metalness={0.01} />
      </mesh>

      {/* rows appear as the paper mask retreats */}
      <mesh ref={cover} position={[0, 0, 0.014]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#f4efe6" transparent opacity={0} roughness={0.9} metalness={0} />
      </mesh>

      <mesh ref={scanline} position={[0, 0, 0.018]}>
        <planeGeometry args={[W - 0.16, 0.018]} />
        <meshBasicMaterial color={cyan} transparent opacity={0} toneMapped={false} />
      </mesh>

      <mesh position={[0, -H / 2 - 0.02, 0.016]}>
        <planeGeometry args={[W, 0.03]} />
        <meshBasicMaterial color={gold} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  camera framing + parallax                                                 */
/* -------------------------------------------------------------------------- */
function DustMotes({ gold }) {
  const ref = useRef();
  const count = 70;
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => ({
        x: (particleSample(index * 5 + 0) - 0.5) * 5.4,
        y: particleSample(index * 5 + 1) * 3.6,
        z: (particleSample(index * 5 + 2) - 0.5) * 2.2,
        p: particleSample(index * 5 + 3) * Math.PI * 2,
        s: 0.008 + particleSample(index * 5 + 4) * 0.014
      })),
    []
  );
  const positions = useMemo(() => new Float32Array(count * 3), []);

  useFrame(() => {
    if (!ref.current) return;
    const t = performance.now() / 1000;
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const sd = seeds[i];
      arr[i * 3] = sd.x + Math.sin(t * 0.25 + sd.p) * 0.18;
      arr[i * 3 + 1] = ((sd.y + t * sd.s) % 3.6) - 1.8;
      arr[i * 3 + 2] = sd.z + Math.cos(t * 0.2 + sd.p) * 0.12;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.024}
        color={gold}
        transparent
        opacity={0.3}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function CameraRig({ stage, isPrint }) {
  useFrame((state, dt) => {
    const camera = state.camera;
    const p = state.pointer;
    const baseZ = isPrint ? 7.35 : stage === 5 ? 6.8 : stage === 1 ? 7.0 : 6.5;
    const aspect = state.size.width / Math.max(1, state.size.height);
    const targetZ = baseZ / Math.min(1, Math.max(0.5, aspect));
    const px = isPrint ? 0 : p.x * 0.16;
    const py = isPrint ? 0.06 : 0.08 + p.y * 0.08;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, px, 2.4, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, py, 2.4, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 2.4, dt);
    camera.lookAt(0, isPrint ? 0.04 : 0.0, 0);
  });

  return null;
}


const initialState = { stage: 3, spread: 0, playing: true, dragging: false };
function sceneReducer(state, action) {
  switch (action.type) {
    case 'stage': {
      const stage = action.stage;
      const spread = stage === 1 ? 0 : stage === 2 ? 1 : stage === 5 ? 2 : state.spread === 0 || state.spread >= MAX_SPREAD ? 1 : state.spread;
      return { ...state, stage, spread, playing: action.manual ? false : state.playing };
    }
    case 'flip': return { ...state, stage: 3, spread: clamp(state.spread + action.direction, 0, MAX_SPREAD), playing: false };
    case 'curl': return { ...state, spread: state.spread >= MAX_SPREAD ? 1 : state.spread + 1 };
    case 'open': return { ...state, spread: 1 };
    case 'drag': return { ...state, dragging: action.dragging, playing: false };
    case 'pause': return { ...state, playing: false };
    case 'toggle': return { ...state, playing: !state.playing };
    case 'resume': return { ...state, playing: true };
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
const ignoreCursor = () => {};

export default function CatalogueScene({ light = false }) {
  const [state, dispatch] = useReducer(sceneReducer, initialState);
  const coarse = useSyncExternalStore(subscribePreferences, getCoarseSnapshot, getServerSnapshot);
  const reduced = useSyncExternalStore(subscribePreferences, getReducedSnapshot, getServerSnapshot);
  const gold = light ? '#b87d14' : '#f5c451';
  const cyan = light ? '#0077b6' : '#6cc7e8';
  const assets = useCatalogueAssets(INITIAL_PRODUCTS, gold, cyan);
  const interactionRef = useRef(-1);
  const ready = Boolean(assets);
  const isPrint = state.stage === 4;

  useEffect(() => {
    if (!ready || !state.playing || reduced) return;
    const id = window.setTimeout(() => dispatch({ type: 'stage', stage: state.stage % STAGE_COUNT + 1 }), 5200);
    return () => window.clearTimeout(id);
  }, [ready, state.stage, state.playing, reduced]);

  useEffect(() => {
    if (!ready || !state.playing || state.stage !== 3 || reduced) return;
    const intro = window.setTimeout(() => dispatch({ type: 'open' }), 1150);
    const curls = window.setInterval(() => dispatch({ type: 'curl' }), 2300);
    return () => { window.clearTimeout(intro); window.clearInterval(curls); };
  }, [ready, state.stage, state.playing, reduced]);

  const flip = useCallback((direction) => dispatch({ type: 'flip', direction }), []);
  const pick = useCallback(() => dispatch({ type: 'pause' }), []);
  const onDragging = useCallback((dragging) => dispatch({ type: 'drag', dragging }), []);

  return (
    <div
      className="absolute inset-0"
      tabIndex={0}
      role="region"
      aria-label="Interactive catalogue visualization"
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          flip(event.key === 'ArrowRight' ? 1 : -1);
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault();
          const direction = event.key === 'ArrowDown' ? 1 : -1;
          dispatch({ type: 'stage', stage: (state.stage - 1 + direction + STAGE_COUNT) % STAGE_COUNT + 1, manual: true });
        } else if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          dispatch({ type: 'toggle' });
        } else if (event.key === 'Escape') {
          dispatch({ type: 'resume' });
        }
      }}
    >
      {assets && (
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0.08, 6.5], fov: 40, near: 0.1, far: 40 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.12 }}
          style={{ position: 'absolute', inset: 0, background: 'transparent', touchAction: coarse ? 'pan-y' : 'none' }}
        >
          <ambientLight intensity={light ? 1.7 : 1.5} />
          <hemisphereLight args={['#ffe9c4', '#120d08', 0.55]} />
          <directionalLight position={[3.5, 6, 6]} intensity={1.35} color="#fff6ea" />
          <directionalLight position={[-5, -1.5, -2]} intensity={0.42} color={cyan} />
          <pointLight position={[0, -2, 3.2]} intensity={0.35} color={gold} />
          <CameraRig stage={state.stage} isPrint={isPrint} />
          <DustMotes gold={gold} />
          {!isPrint && (
            <Book
              spread={state.spread} products={INITIAL_PRODUCTS} textures={assets.pages}
              interactionRef={interactionRef} onFlip={flip} onPick={pick} onCursor={ignoreCursor}
              onDragging={onDragging} dragging={state.dragging} stage={state.stage}
              gold={gold} cyan={cyan} enableRotate={!coarse}
            />
          )}
          {state.stage === 1 && <DataStream texture={assets.csv} gold={gold} cyan={cyan} />}
          <SpecSheet texture={assets.spec} active={state.stage === 5} gold={gold} cyan={cyan} />
          <PrintSpread texture={assets.spread} active={isPrint} gold={gold} cyan={cyan} />
        </Canvas>
      )}
    </div>
  );
}
