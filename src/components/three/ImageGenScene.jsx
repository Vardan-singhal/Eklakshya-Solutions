"use client";

import { SceneViewport } from "./SceneViewport";
import { ResponsiveOrbitControls as OrbitControls } from "./ResponsiveOrbitControls";

import { ScenePreparation } from "./ScenePreparation";
import { servicePixelRatio } from "./useGraphics";
import { SceneCompilation } from "./SceneCompilation";
import { SceneWarmup } from "./SceneWarmup";

/** 3D scene adapted from image three.js/src/components/ImageGenScene.jsx.
 * Procedural artwork stays within the model; preview UI and inquiry modal are excluded. */
/* ------------------------------------------------------------------------------------------------
 * ImageGenScene.jsx — "Photo to Studio"
 * Eklakshya Solutions / AI Product Visuals
 *
 * A self-contained, procedural Three.js story with six looping stages:
 *   01 Reference photo → 02 Background removal → 03 10+ environments
 *   04 AI re-lighting → 05 Batch processing → 06 4K / 8K export
 *
 * No external models, textures, images or HDRIs. Every texture in this file is painted onto a
 * <canvas> at runtime. Reflections come from drei <Environment> + <Lightformer> only.
 * MeshPhysicalMaterial is reserved for the hero product; everything else is cheap + unlit.
 * ------------------------------------------------------------------------------------------------ */

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useReducer,
  useSyncExternalStore,
} from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  RoundedBox,
} from "@react-three/drei";

/* ================================================================================================
 * 01 — Design tokens & story data
 * ================================================================================================ */

const PRODUCTS = ["bottle", "box", "bearing"];
const PRODUCT_LABELS = { bottle: "Bottle", box: "Box", bearing: "Bearing" };

/** 12 environments. Each one drives backdrop, floor pattern, lighting mood and reflection colours. */
const ENVIRONMENTS = [
  {
    name: "White Studio", tag: "01 / STUDIO", pattern: "studio",
    bg: ["#f6f2e9", "#d7cfc0"], floor: ["#f4f0e7", "#cfc7b9"],
    ink: "#6a6153", accent: "#e8c877", light: ["#fff7e7", "#ffffff"], dark: false,
  },
  {
    name: "Marble Counter", tag: "02 / STONE", pattern: "marble",
    bg: ["#f1ede4", "#cfc8ba"], floor: ["#eee9df", "#c4bcae"],
    ink: "#756b5b", accent: "#c7b697", light: ["#fffaf0", "#e8ddc9"], dark: false,
  },
  {
    name: "Wooden Table", tag: "03 / TIMBER", pattern: "wood",
    bg: ["#d9c3a2", "#a9885e"], floor: ["#a97f4e", "#6c4c2b"],
    ink: "#4d341d", accent: "#e8c877", light: ["#ffe4ba", "#fff1d6"], dark: false,
  },
  {
    name: "Dark Luxury", tag: "04 / NOIR", pattern: "luxe",
    bg: ["#2a2319", "#0d0b08"], floor: ["#2b241a", "#0b0907"],
    ink: "#d9c9a7", accent: "#f5c451", light: ["#ffd98a", "#8a6a30"], dark: true,
  },
  {
    name: "Sunset Gradient", tag: "05 / DUSK", pattern: "gradient",
    bg: ["#f3ae7b", "#8f6f9c"], floor: ["#c68f7e", "#6f5874"],
    ink: "#5b3f54", accent: "#ffd09c", light: ["#ffd6b0", "#b493c9"], dark: false,
  },
  {
    name: "Outdoor Garden", tag: "06 / GREEN", pattern: "garden",
    bg: ["#a9b894", "#556647"], floor: ["#93a27d", "#4d5c3f"],
    ink: "#2f3b28", accent: "#e7d7a3", light: ["#e9f2cf", "#a2b56f"], dark: false,
  },
  {
    name: "Kitchen", tag: "07 / HOME", pattern: "kitchen",
    bg: ["#e9e5da", "#bfc3bd"], floor: ["#dedad0", "#b4b7b1"],
    ink: "#5d5c55", accent: "#c8a86b", light: ["#ffffff", "#dfe7e4"], dark: false,
  },
  {
    name: "Neon Cyber", tag: "08 / NIGHT", pattern: "neon",
    bg: ["#161228", "#07070e"], floor: ["#1b1a2d", "#07070e"],
    ink: "#a8d8e8", accent: "#6cc7e8", light: ["#6cc7e8", "#c45cff"], dark: true,
  },
  {
    name: "Pastel Pop", tag: "09 / POP", pattern: "pastel",
    bg: ["#f4dbe2", "#b9d7e6"], floor: ["#ecd5dc", "#b4cfdc"],
    ink: "#6d5a64", accent: "#f5c451", light: ["#fff4f7", "#c8ebfa"], dark: false,
  },
  {
    name: "Concrete Loft", tag: "10 / RAW", pattern: "concrete",
    bg: ["#a9a49a", "#6d6a63"], floor: ["#918c83", "#5d5a53"],
    ink: "#383631", accent: "#d9d0bd", light: ["#f2eee4", "#a8a398"], dark: false,
  },
  {
    name: "Beach Sand", tag: "11 / COAST", pattern: "sand",
    bg: ["#e8ddc4", "#bcae8e"], floor: ["#e3d3b1", "#b09a72"],
    ink: "#6b5a3c", accent: "#f5c451", light: ["#fff5db", "#b7d9df"], dark: false,
  },
  {
    name: "Gold Silk", tag: "12 / ATELIER", pattern: "silk",
    bg: ["#b9975c", "#4a3a20"], floor: ["#9b7a44", "#3b2e19"],
    ink: "#f4e4bf", accent: "#ffe0a0", light: ["#ffe8b7", "#b48b47"], dark: true,
  },
];

/** Re-light presets. Changing these remounts the procedural Lightformer rig. */
const LIGHT_RIGS = [
  {
    name: "Soft Box", caption: "EVEN + CLEAN",
    key: ["#fff4dd", "#f5c451"], fill: "#ffe9bd", intensity: 2.4,
  },
  {
    name: "Rim Light", caption: "EDGE + DEPTH",
    key: ["#c8f3ff", "#6cc7e8"], fill: "#7fd3f0", intensity: 2.9,
  },
  {
    name: "Dramatic", caption: "HIGH CONTRAST",
    key: ["#ffd27a", "#3a2a10"], fill: "#f5c451", intensity: 3.4,
  },
];

/** Bottom-overlay copy — deliberately plain-English. */
const STAGES = [
  {
    id: "REFERENCE", title: "Reference photo", label: "Reference photo",
    desc: "One ordinary phone photo is all we need to begin.",
    inScene: "YOUR REFERENCE PHOTO", meta: "IMG_0442.JPG · 12 MP",
  },
  {
    id: "CUTOUT", title: "Background removal", label: "Background removal",
    desc: "The product is cut out cleanly, pixel by pixel.",
    inScene: "BACKGROUND REMOVAL", meta: "ALPHA / AUTO CUTOUT",
  },
  {
    id: "ENVIRONMENTS", title: "10+ environments", label: "Environments",
    desc: "Upload one photo, get studio shots in every setting.",
    inScene: "10+ ENVIRONMENTS", meta: "TURNTABLE · 12 SCENES",
  },
  {
    id: "RELIGHT", title: "AI re-lighting", label: "AI re-lighting",
    desc: "Relight for any scene — glass, metal and contact shadow.",
    inScene: "AI RE-LIGHTING", meta: "LIGHT ORB / LIVE RIG",
  },
  {
    id: "BATCH", title: "Batch at scale", label: "Batch processing",
    desc: "One upload becomes 240 finished images, in one pass.",
    inScene: "BATCH PROCESSING", meta: "6 × 4 GRID · 240 ASSETS",
  },
  {
    id: "EXPORT", title: "4K / 8K export", label: "Export",
    desc: "Download print-ready masters for every channel.",
    inScene: "4K / 8K EXPORT", meta: "PRINT 300 DPI · WEB WEBP",
  },
];

const RESOLUTIONS = [
  { key: "1080p", title: "1080p", sub: "WEB PREVIEW", size: "2.4 MB" },
  { key: "4K", title: "4K", sub: "STUDIO", size: "18.8 MB" },
  { key: "8K", title: "8K", sub: "PRINT MASTER", size: "74.2 MB" },
];

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = THREE.MathUtils.lerp;
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ================================================================================================
 * 02 — Canvas painting helpers (all art is procedural and generated a single time)
 * ================================================================================================ */

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function roundedPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function linear(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([at, col]) => g.addColorStop(at, col));
  return g;
}

function speckle(ctx, w, h, amount, colors, seed = 7, max = 2) {
  const rand = seeded(seed);
  for (let i = 0; i < amount; i++) {
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
    ctx.globalAlpha = 0.12 + rand() * 0.35;
    const s = 0.5 + rand() * max;
    ctx.fillRect(rand() * w, rand() * h, s, s);
  }
  ctx.globalAlpha = 1;
}

function toTexture(canvas, { repeat = null, srgb = true } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  return texture;
}

/* --- The tiny product illustration used in thumbnails, cards and export stills ------------------ */

function drawProduct(ctx, type, cx, baseY, H, palette = {}) {
  const {
    body = "#c9bda6", bodyDark = "#8d7d62", gold = "#f5c451", cap = "#dfbb74",
    ink = "#433a2b", cyan = "#6cc7e8", outline = "rgba(255,255,255,0.22)",
  } = palette;
  ctx.save();

  if (type === "bottle") {
    const w = H * 0.34;
    const bodyH = H * 0.66;
    const bodyTop = baseY - bodyH;
    // body
    ctx.fillStyle = linear(ctx, 0, bodyTop, 0, baseY, [
      [0, body], [0.48, bodyDark], [0.78, body], [1, bodyDark],
    ]);
    roundedPath(ctx, cx - w / 2, bodyTop, w, bodyH, w * 0.19);
    ctx.fill();
    // glass edge highlights
    ctx.strokeStyle = outline;
    ctx.lineWidth = Math.max(1, H * 0.006);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    roundedPath(ctx, cx - w * 0.36, bodyTop + bodyH * 0.1, w * 0.1, bodyH * 0.66, w * 0.05);
    ctx.fill();
    // shoulder + neck
    ctx.fillStyle = linear(ctx, 0, baseY - H, 0, baseY - H * 0.5, [[0, body], [1, bodyDark]]);
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, bodyTop + 1);
    ctx.quadraticCurveTo(cx - w * 0.22, bodyTop - H * 0.1, cx - w * 0.13, bodyTop - H * 0.14);
    ctx.lineTo(cx + w * 0.13, bodyTop - H * 0.14);
    ctx.quadraticCurveTo(cx + w * 0.22, bodyTop - H * 0.1, cx + w / 2, bodyTop + 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - w * 0.115, bodyTop - H * 0.18, w * 0.23, H * 0.08);
    // cap
    ctx.fillStyle = linear(ctx, cx - w * 0.2, 0, cx + w * 0.2, 0, [[0, gold], [0.55, cap], [1, gold]]);
    roundedPath(ctx, cx - w * 0.15, baseY - H * 0.97, w * 0.3, H * 0.17, w * 0.04);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(cx - w * 0.11, baseY - H * 0.94, w * 0.035, H * 0.11);
    // label
    ctx.fillStyle = "rgba(246,241,228,0.94)";
    ctx.fillRect(cx - w * 0.4, bodyTop + bodyH * 0.3, w * 0.8, bodyH * 0.27);
    ctx.strokeStyle = gold;
    ctx.lineWidth = Math.max(1, H * 0.004);
    ctx.strokeRect(cx - w * 0.33, bodyTop + bodyH * 0.34, w * 0.66, bodyH * 0.19);
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.font = `600 ${Math.max(6, H * 0.038)}px ui-monospace, monospace`;
    ctx.fillText("AUREL", cx, bodyTop + bodyH * 0.43);
    ctx.font = `400 ${Math.max(4, H * 0.019)}px ui-monospace, monospace`;
    ctx.fillText("EAU DE PARFUM", cx, bodyTop + bodyH * 0.49);
    // base light
    ctx.fillStyle = "rgba(245,196,81,0.28)";
    roundedPath(ctx, cx - w * 0.4, baseY - bodyH * 0.045, w * 0.8, bodyH * 0.045, 2);
    ctx.fill();
  } else if (type === "box") {
    const w = H * 0.54;
    const h = H * 0.68;
    const top = baseY - h;
    const depth = H * 0.13;
    // side face
    ctx.fillStyle = bodyDark;
    ctx.beginPath();
    ctx.moveTo(cx + w / 2, top + depth * 0.38);
    ctx.lineTo(cx + w / 2 + depth, top + depth * 0.05);
    ctx.lineTo(cx + w / 2 + depth, top + h - depth * 0.5);
    ctx.lineTo(cx + w / 2, baseY);
    ctx.closePath();
    ctx.fill();
    // top face
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, top + depth * 0.4);
    ctx.lineTo(cx - w / 2 + depth * 0.86, top);
    ctx.lineTo(cx + w / 2 + depth * 0.9, top);
    ctx.lineTo(cx + w / 2, top + depth * 0.4);
    ctx.closePath();
    ctx.fill();
    // front face
    ctx.fillStyle = linear(ctx, cx - w / 2, 0, cx + w / 2, 0, [
      [0, body], [0.5, bodyDark], [1, body],
    ]);
    roundedPath(ctx, cx - w / 2, top + depth * 0.4, w, h - depth * 0.4, H * 0.012);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = Math.max(1, H * 0.005);
    ctx.stroke();
    // gold print
    ctx.strokeStyle = gold;
    ctx.lineWidth = Math.max(1, H * 0.008);
    ctx.strokeRect(cx - w * 0.32, top + h * 0.18, w * 0.64, h * 0.48);
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.font = `600 ${Math.max(7, H * 0.055)}px ui-monospace, monospace`;
    ctx.fillText("E", cx, top + h * 0.42);
    ctx.font = `400 ${Math.max(4, H * 0.021)}px ui-monospace, monospace`;
    ctx.fillText("EKLAKSHYA", cx, top + h * 0.52);
    ctx.fillStyle = gold;
    ctx.fillRect(cx - w * 0.26, top + h * 0.72, w * 0.52, Math.max(2, H * 0.014));
  } else {
    const R = H * 0.32;
    const cy = baseY - R * 1.02;
    ctx.save();
    ctx.translate(cx, cy);
    // outer race
    ctx.strokeStyle = body;
    ctx.lineWidth = R * 0.38;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = outline;
    ctx.lineWidth = R * 0.03;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    // balls
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const bx = Math.cos(a) * R * 0.73;
      const by = Math.sin(a) * R * 0.73;
      const g = ctx.createRadialGradient(bx - R * 0.06, by - R * 0.06, 0, bx, by, R * 0.16);
      g.addColorStop(0, "#f4f7f9");
      g.addColorStop(0.45, body);
      g.addColorStop(1, bodyDark);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bx, by, R * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
    // inner hub
    const hub = ctx.createRadialGradient(-R * 0.1, -R * 0.12, 0, 0, 0, R * 0.48);
    hub.addColorStop(0, body);
    hub.addColorStop(1, bodyDark);
    ctx.fillStyle = hub;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cyan;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // floor contact shadow
  ctx.fillStyle = "rgba(18,14,10,0.32)";
  ctx.beginPath();
  ctx.ellipse(cx, baseY + 2, H * 0.3, H * 0.038, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function productPalette(type, env, brandGold) {
  const base = {
    bottle: {
      body: "#d8e4de", bodyDark: "#93aca6", gold: brandGold, cap: "#e0bd75",
      ink: "#4a5a55", outline: "rgba(255,255,255,0.36)",
    },
    box: {
      body: "#f0e9db", bodyDark: "#c2b49b", gold: brandGold, cap: "#e0bd75",
      ink: "#5b4c38", outline: "rgba(255,255,255,0.4)",
    },
    bearing: {
      body: "#c5cad0", bodyDark: "#747b83", gold: brandGold, cap: "#e0bd75",
      ink: "#3a3f44", cyan: "#6cc7e8", outline: "rgba(255,255,255,0.5)",
    },
  }[type];
  if (type === "bottle") {
    // Warm champagne glass reads richer than grey glass at thumbnail scale.
    Object.assign(base, { body: "#e0cda6", bodyDark: "#a68c60", outline: "rgba(255,248,232,0.5)" });
  }
  if (env && env.dark) return { ...base, ink: "#f0e6d3" };
  return base;
}

/* --- Reference phone photo -------------------------------------------------------------------- */

function paintReferencePhoto(canvas, gold) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const rand = seeded(41);

  // Dull apartment wall, uneven window light.
  ctx.fillStyle = linear(ctx, 0, 0, w * 0.6, h, [
    [0, "#99928a"], [0.5, "#847d73"], [1, "#6e6a62"],
  ]);
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = linear(ctx, 0, 0, w * 0.7, h * 0.5, [
    [0, "rgba(226,216,196,0.55)"], [1, "rgba(226,216,196,0)"],
  ]);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w * 0.64, 0);
  ctx.lineTo(w * 0.34, h * 0.62);
  ctx.lineTo(0, h * 0.7);
  ctx.closePath();
  ctx.fill();

  // Cluttered desk surface.
  ctx.fillStyle = linear(ctx, 0, h * 0.55, 0, h, [[0, "#89806f"], [1, "#5c5548"]]);
  ctx.fillRect(0, h * 0.56, w, h * 0.44);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(0, h * 0.56, w, 3);

  // Books, papers, a mug, a coiled cable.
  ctx.save();
  ctx.translate(w * 0.14, h * 0.55);
  ctx.rotate(-0.14);
  ctx.fillStyle = "#665f53";
  roundedPath(ctx, -w * 0.12, 0, w * 0.32, h * 0.085, 3);
  ctx.fill();
  ctx.fillStyle = "#7c7466";
  roundedPath(ctx, -w * 0.07, -h * 0.03, w * 0.3, h * 0.05, 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#c1b5a0";
  ctx.beginPath();
  ctx.arc(w * 0.82, h * 0.62, w * 0.105, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8d8272";
  ctx.beginPath();
  ctx.arc(w * 0.82, h * 0.62, w * 0.072, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d6cbb7";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(w * 0.925, h * 0.62, w * 0.05, -Math.PI * 0.5, Math.PI * 0.55);
  ctx.stroke();

  ctx.strokeStyle = "#4e493f";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w * 0.3, h * 0.86);
  ctx.bezierCurveTo(w * 0.45, h * 0.78, w * 0.2, h * 0.74, w * 0.34, h * 0.93);
  ctx.stroke();

  // Papers / notebook under the product.
  ctx.save();
  ctx.translate(w * 0.5, h * 0.77);
  ctx.rotate(0.06);
  ctx.fillStyle = "#b3a892";
  roundedPath(ctx, -w * 0.4, -h * 0.08, w * 0.8, h * 0.2, 4);
  ctx.fill();
  ctx.fillStyle = "rgba(60,52,40,0.16)";
  roundedPath(ctx, -w * 0.36, -h * 0.05, w * 0.72, h * 0.13, 3);
  ctx.fill();
  ctx.strokeStyle = "rgba(60,52,40,0.18)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-w * 0.32, -h * 0.02 + i * 12);
    ctx.lineTo(w * 0.26, -h * 0.02 + i * 12);
    ctx.stroke();
  }
  ctx.restore();

  // A small unloved plant + scattered bits.
  ctx.strokeStyle = "#4c5842";
  ctx.lineWidth = 3.5;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.885, h * 0.77);
    ctx.quadraticCurveTo(w * 0.87 + i * 10, h * 0.66 - i * 12, w * 0.9 + i * 6, h * 0.61 - i * 8);
    ctx.stroke();
  }
  ctx.fillStyle = "#8d7b62";
  roundedPath(ctx, w * 0.845, h * 0.76, w * 0.1, h * 0.07, 3);
  ctx.fill();
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = ["#c0b49e", "#6a6154", "#9c907c"][i % 3];
    ctx.globalAlpha = 0.5 + rand() * 0.3;
    ctx.fillRect(rand() * w, h * 0.6 + rand() * h * 0.36, 2 + rand() * 7, 1 + rand() * 3);
  }
  ctx.globalAlpha = 1;

  // Dull, slightly off-white product in the original phone frame (the 3D hero covers this).
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.filter = "saturate(0.55)";
  drawProduct(ctx, "bottle", w * 0.5, h * 0.855, h * 0.55, {
    body: "#c8c2b4", bodyDark: "#8b8578", gold: "#b8a374", cap: "#a99a78",
    ink: "#5a5347", outline: "rgba(255,255,255,0.18)",
  });
  ctx.restore();

  // Warm cast + vignette + grain.
  ctx.fillStyle = "rgba(84,68,44,0.14)";
  ctx.fillRect(0, 0, w, h);
  const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.75);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(18,15,11,0.5)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  speckle(ctx, w, h, 900, ["#efe8d8", "#3a342b"], 9, 1.4);

  // Phone UI hints keep it instantly legible as "a reference photo".
  ctx.fillStyle = "rgba(20,17,13,0.5)";
  roundedPath(ctx, w * 0.06, h * 0.03, w * 0.2, 22, 11);
  ctx.fill();
  ctx.fillStyle = "rgba(245,241,232,0.78)";
  ctx.textAlign = "left";
  ctx.font = "500 10px ui-monospace, monospace";
  ctx.fillText("RAW", w * 0.095, h * 0.03 + 15);
  ctx.fillStyle = "rgba(245,241,232,0.6)";
  ctx.textAlign = "center";
  ctx.font = "400 11px ui-monospace, monospace";
  ctx.fillText("IMG_0442  ·  10:42", w / 2, h * 0.965);
  ctx.strokeStyle = gold;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.globalAlpha = 1;
}

/* --- Environment floor patterns ---------------------------------------------------------------- */

function paintFloor(canvas, env, gold) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const rand = seeded(env.name.length * 53 + 11);
  ctx.fillStyle = linear(ctx, 0, 0, w, h, [[0, env.floor[0]], [1, env.floor[1]]]);
  ctx.fillRect(0, 0, w, h);

  const line = (color, width, alpha = 1) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.globalAlpha = alpha;
  };

  switch (env.pattern) {
    case "marble":
      for (let i = 0; i < 15; i++) {
        ctx.beginPath();
        const y = rand() * h;
        ctx.moveTo(-20, y);
        for (let x = 0; x < w + 40; x += 40) {
          ctx.quadraticCurveTo(x + 20, y + (rand() - 0.5) * 60, x + 40, y + (rand() - 0.5) * 26);
        }
        line(i % 3 === 0 ? "#a99e8c" : "#d4caba", 0.8 + rand() * 1.6, 0.35);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      speckle(ctx, w, h, 200, ["#ffffff", "#b9ae9d"], 4, 1.2);
      break;
    case "wood": {
      const rows = 7;
      for (let r = 0; r < rows; r++) {
        const y = (r / rows) * h;
        ctx.fillStyle = `rgba(${r % 2 ? 58 : 84},${r % 2 ? 39 : 58},${20},0.16)`;
        ctx.fillRect(0, y, w, h / rows);
        line("rgba(50,32,16,0.32)", 1.2, 1);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        for (let g = 0; g < 12; g++) {
          const gy = y + rand() * (h / rows);
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.bezierCurveTo(w * 0.3, gy + (rand() - 0.5) * 12, w * 0.7, gy + (rand() - 0.5) * 12, w, gy + (rand() - 0.5) * 6);
          line("rgba(55,34,16,0.22)", 0.8, 0.65);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "neon":
      ctx.fillStyle = "rgba(8,8,15,0.55)";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 6; i++) {
        const x = rand() * w;
        const g = ctx.createLinearGradient(x, 0, x + 30, h);
        g.addColorStop(0, i % 2 ? "rgba(108,199,232,0)" : "rgba(196,92,255,0)");
        g.addColorStop(0.55, i % 2 ? "rgba(108,199,232,0.24)" : "rgba(196,92,255,0.2)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - 10, 0, 50, h);
      }
      line("#6cc7e8", 1.4, 0.4);
      ctx.strokeRect(14, 14, w - 28, h - 28);
      ctx.globalAlpha = 1;
      break;
    case "kitchen":
      for (let x = 0; x <= w; x += w / 4) {
        line("rgba(92,94,88,0.24)", 1.6);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y <= h; y += h / 4) {
        line("rgba(92,94,88,0.24)", 1.6);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      speckle(ctx, w, h, 120, ["#ffffff", "#a3a69f"], 8, 1.2);
      break;
    case "concrete":
      speckle(ctx, w, h, 1800, ["#d7d2c8", "#57544d", "#8a857c"], 6, 2.2);
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(rand() * w, 0);
        ctx.lineTo(rand() * w, h);
        line("rgba(60,57,51,0.18)", 1, 1);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    case "sand":
      speckle(ctx, w, h, 2200, ["#f5e6c6", "#b29a72", "#d8c49c"], 12, 1.7);
      for (let i = 0; i < 16; i++) {
        ctx.beginPath();
        ctx.ellipse(rand() * w, rand() * h, 20 + rand() * 70, 3 + rand() * 8, 0.15, 0, Math.PI * 2);
        line("rgba(140,116,79,0.14)", 1.4);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    case "gradient":
      ctx.fillStyle = linear(ctx, 0, 0, 0, h, [
        [0, "rgba(255,224,197,0.5)"], [1, "rgba(100,72,96,0.38)"],
      ]);
      ctx.fillRect(0, 0, w, h);
      break;
    case "garden":
      speckle(ctx, w, h, 1400, ["#52633f", "#c2cf9e", "#708257"], 3, 3);
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.ellipse(rand() * w, rand() * h, 30 + rand() * 60, 12 + rand() * 26, rand(), 0, Math.PI * 2);
        ctx.fillStyle = "rgba(52,68,41,0.13)";
        ctx.fill();
      }
      break;
    case "pastel":
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.08 + rand() * 0.14})`;
        ctx.beginPath();
        ctx.arc(rand() * w, rand() * h, 12 + rand() * 44, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "silk":
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        const x = (i / 12) * w;
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + 70, h * 0.33, x - 80, h * 0.66, x + 40, h);
        line(i % 2 ? "rgba(255,235,186,0.15)" : "rgba(64,44,16,0.26)", 8 + rand() * 22);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    case "luxe":
      ctx.fillStyle = "rgba(8,7,5,0.28)";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 80; i++) {
        ctx.fillStyle = gold;
        ctx.globalAlpha = 0.04 + rand() * 0.1;
        ctx.fillRect(rand() * w, rand() * h, 1.6, 1.6);
      }
      ctx.globalAlpha = 1;
      break;
    default:
      speckle(ctx, w, h, 320, ["#ffffff", "#a29a8b"], 5, 1.5);
      break;
  }
  ctx.globalAlpha = 1;
  const edge = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.7);
  edge.addColorStop(0, "rgba(255,255,255,0.16)");
  edge.addColorStop(0.72, "rgba(255,255,255,0)");
  edge.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);
}

/* --- Environment backdrops --------------------------------------------------------------------- */

function paintBackdrop(canvas, env, gold) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const rand = seeded(env.name.length * 97 + 5);
  ctx.fillStyle = linear(ctx, 0, 0, w * 0.6, h, [[0, env.bg[0]], [0.62, env.bg[1]], [1, env.bg[1]]]);
  ctx.fillRect(0, 0, w, h);

  // A soft cyclorama glow behind the product.
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.56, 10, w * 0.5, h * 0.56, w * 0.56);
  glow.addColorStop(0, env.dark ? "rgba(255,224,164,0.2)" : "rgba(255,255,255,0.5)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const pattern = env.pattern;
  if (pattern === "garden" || pattern === "kitchen" || pattern === "concrete") {
    // Suggested architecture at the edges, deliberately out of focus.
    ctx.save();
    ctx.filter = "blur(5px)";
    if (pattern === "garden") {
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = i % 2 ? "rgba(40,58,30,0.4)" : "rgba(140,160,106,0.35)";
        ctx.beginPath();
        ctx.arc(rand() * w, h * (0.25 + rand() * 0.4), 18 + rand() * 50, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (pattern === "kitchen") {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(w * 0.08, h * 0.1, w * 0.26, h * 0.4);
      ctx.strokeStyle = "rgba(100,104,100,0.4)";
      ctx.lineWidth = 5;
      ctx.strokeRect(w * 0.08, h * 0.1, w * 0.26, h * 0.4);
      ctx.fillRect(w * 0.72, h * 0.06, w * 0.2, h * 0.5);
      ctx.fillStyle = "rgba(140,144,138,0.35)";
      ctx.fillRect(0, h * 0.58, w, h * 0.08);
    } else {
      ctx.fillStyle = "rgba(230,226,216,0.22)";
      ctx.fillRect(w * 0.1, h * 0.06, w * 0.24, h * 0.5);
      ctx.fillRect(w * 0.68, h * 0.04, w * 0.22, h * 0.52);
      ctx.strokeStyle = "rgba(48,46,42,0.3)";
      ctx.lineWidth = 4;
      ctx.strokeRect(w * 0.1, h * 0.06, w * 0.24, h * 0.5);
      ctx.strokeRect(w * 0.68, h * 0.04, w * 0.22, h * 0.52);
    }
    ctx.restore();
  }

  if (pattern === "neon") {
    ctx.save();
    ctx.shadowBlur = 24;
    ctx.shadowColor = "#6cc7e8";
    ctx.strokeStyle = "rgba(108,199,232,0.55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.12, h * 0.12, w * 0.32, h * 0.5);
    ctx.shadowColor = "#c45cff";
    ctx.strokeStyle = "rgba(196,92,255,0.45)";
    ctx.strokeRect(w * 0.64, h * 0.2, w * 0.22, h * 0.38);
    ctx.restore();
  }
  if (pattern === "wood") {
    ctx.fillStyle = "rgba(72,48,24,0.17)";
    for (let i = 0; i < 18; i++) {
      ctx.fillRect(0, rand() * h * 0.7, w, 1 + rand() * 3);
    }
  }
  if (pattern === "silk") {
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      const x = rand() * w;
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 90, h * 0.4, x - 90, h * 0.6, x + 30, h);
      ctx.strokeStyle = i % 2 ? "rgba(255,236,190,0.12)" : "rgba(46,30,10,0.22)";
      ctx.lineWidth = 20 + rand() * 46;
      ctx.stroke();
    }
  }
  if (pattern === "sand") {
    ctx.fillStyle = "rgba(188,216,224,0.4)";
    ctx.fillRect(0, h * 0.5, w, h * 0.06);
    ctx.fillStyle = "rgba(255,248,225,0.35)";
    ctx.fillRect(0, h * 0.46, w, h * 0.04);
  }

  // vignette + subtle gold key light from top-left
  const key = ctx.createRadialGradient(w * 0.22, h * 0.15, 0, w * 0.22, h * 0.15, w * 0.8);
  key.addColorStop(0, `rgba(255,225,166,${env.dark ? 0.22 : 0.3})`);
  key.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = key;
  ctx.fillRect(0, 0, w, h);
  const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.26, w / 2, h / 2, w * 0.74);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(9,8,6,0.46)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

/* --- Environment carousel card preview --------------------------------------------------------- */

function paintEnvCard(canvas, env, product, gold, index) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = linear(ctx, 0, 0, 0, h, [[0, env.bg[0]], [0.68, env.bg[1]], [1, env.floor[1]]]);
  ctx.fillRect(0, 0, w, h);

  // room / set
  const rand = seeded(index * 31 + 5);
  if (env.pattern === "wood" || env.pattern === "kitchen") {
    ctx.fillStyle = env.pattern === "wood" ? "rgba(60,40,20,0.3)" : "rgba(255,255,255,0.4)";
    ctx.fillRect(w * 0.08, 22, w * 0.24, h * 0.35);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(w * 0.7, 18, w * 0.18, h * 0.42);
  }
  if (env.pattern === "garden") {
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? "rgba(45,64,34,0.5)" : "rgba(166,184,128,0.5)";
      ctx.beginPath();
      ctx.arc(rand() * w, h * (0.2 + rand() * 0.3), 14 + rand() * 30, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (env.pattern === "neon") {
    ctx.strokeStyle = "rgba(108,199,232,0.7)";
    ctx.lineWidth = 1.6;
    ctx.strokeRect(w * 0.12, 26, w * 0.24, h * 0.34);
    ctx.strokeStyle = "rgba(196,92,255,0.5)";
    ctx.strokeRect(w * 0.64, 34, w * 0.18, h * 0.28);
  }

  // stage floor line and glow
  const floorY = h * 0.74;
  ctx.fillStyle = linear(ctx, 0, floorY, 0, h, [[0, env.floor[0]], [1, env.floor[1]]]);
  ctx.fillRect(0, floorY, w, h - floorY);
  const glow = ctx.createRadialGradient(w / 2, floorY + 8, 2, w / 2, floorY + 8, w * 0.34);
  glow.addColorStop(0, "rgba(255,240,208,0.5)");
  glow.addColorStop(1, "rgba(255,240,208,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(w / 2, floorY + 10, w * 0.4, h * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();

  // selected tint / background contrast scrim
  const scrim = ctx.createLinearGradient(0, h * 0.55, 0, h);
  scrim.addColorStop(0, "rgba(12,10,8,0)");
  scrim.addColorStop(1, "rgba(12,10,8,0.78)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h * 0.45, w, h * 0.55);

  drawProduct(ctx, product, w * 0.5, floorY + 2, h * 0.62, productPalette(product, env, gold));

  // label strip
  ctx.fillStyle = "rgba(17,14,10,0.82)";
  ctx.fillRect(0, h - 38, w, 38);
  ctx.strokeStyle = "rgba(245,196,81,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h - 38.5);
  ctx.lineTo(w, h - 38.5);
  ctx.stroke();
  ctx.fillStyle = gold;
  ctx.textAlign = "left";
  ctx.font = "500 13px ui-monospace, monospace";
  ctx.fillText(String(index + 1).padStart(2, "0"), 14, h - 14);
  ctx.fillStyle = "#efe9dc";
  ctx.font = "500 15px ui-monospace, monospace";
  ctx.fillText(env.name.toUpperCase(), 42, h - 13);
  ctx.fillStyle = "rgba(245,196,81,0.6)";
  ctx.textAlign = "right";
  ctx.font = "400 10px ui-monospace, monospace";
  ctx.fillText(env.tag, w - 12, h - 15);
}

/* --- Export stills ----------------------------------------------------------------------------- */

const SHOT_THEMES = {
  bottle: { env: ENVIRONMENTS[3], label: "AUREL No.04", line: "EAU DE PARFUM · 50ML" },
  box: { env: ENVIRONMENTS[0], label: "EKLAKSHYA", line: "THE OBJECT SERIES" },
  bearing: { env: ENVIRONMENTS[9], label: "KINFIELD", line: "PRECISION / 6204-RS" },
};

function paintShot(canvas, type, envIndex, gold) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const theme = SHOT_THEMES[type];
  const env = ENVIRONMENTS[envIndex == null ? ENVIRONMENTS.indexOf(theme.env) : envIndex];

  ctx.fillStyle = linear(ctx, 0, 0, w * 0.8, h, [
    [0, env.bg[0]], [0.55, env.bg[1]], [1, env.floor[1]],
  ]);
  ctx.fillRect(0, 0, w, h);

  // Architecture / set suggestion
  if (type === "box") {
    ctx.fillStyle = "rgba(255,255,255,0.34)";
    ctx.fillRect(0, h * 0.1, w, h * 0.03);
    ctx.fillStyle = "rgba(95,88,76,0.12)";
    ctx.fillRect(w * 0.06, h * 0.66, w * 0.88, 1);
  }
  if (type === "bottle") {
    const glow = ctx.createRadialGradient(w * 0.62, h * 0.32, 10, w * 0.62, h * 0.32, w * 0.55);
    glow.addColorStop(0, "rgba(255,215,140,0.44)");
    glow.addColorStop(1, "rgba(255,215,140,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,224,160,0.08)";
    ctx.fillRect(w * 0.08, 0, 2, h * 0.7);
  }
  if (type === "bearing") {
    ctx.strokeStyle = "rgba(108,199,232,0.3)";
    ctx.lineWidth = 1.4;
    ctx.strokeRect(w * 0.07, h * 0.07, w * 0.86, h * 0.6);
    const glow = ctx.createRadialGradient(w * 0.5, h * 0.38, 20, w * 0.5, h * 0.38, w * 0.52);
    glow.addColorStop(0, "rgba(120,190,215,0.3)");
    glow.addColorStop(1, "rgba(120,190,215,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h * 0.75);
  }

  // floor + shadow
  const floorY = h * 0.72;
  ctx.fillStyle = linear(ctx, 0, floorY - h * 0.06, 0, h, [
    [0, "rgba(0,0,0,0)"], [0.32, "rgba(0,0,0,0.12)"], [1, "rgba(0,0,0,0.26)"],
  ]);
  ctx.fillRect(0, floorY - h * 0.06, w, h);
  ctx.fillStyle = env.dark ? "rgba(245,196,81,0.12)" : "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.ellipse(w * 0.5, floorY + h * 0.02, w * 0.3, h * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.34)";
  ctx.beginPath();
  ctx.ellipse(w * 0.52, floorY + h * 0.015, w * 0.19, h * 0.022, 0, 0, Math.PI * 2);
  ctx.fill();

  const size = type === "box" ? h * 0.48 : type === "bottle" ? h * 0.58 : h * 0.46;
  drawProduct(ctx, type, w * 0.5, floorY, size, productPalette(type, env, gold));

  // Product reflection smear
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.translate(0, floorY * 2 + h * 0.012);
  ctx.scale(1, -0.34);
  drawProduct(ctx, type, w * 0.5, floorY, size, productPalette(type, env, gold));
  ctx.restore();

  // Typography + crop marks (photo content, the 3D frame adds the real chrome)
  ctx.fillStyle = env.dark ? "rgba(245,238,223,0.8)" : "rgba(48,43,35,0.72)";
  ctx.textAlign = "left";
  ctx.font = "500 12px ui-monospace, monospace";
  ctx.fillText(theme.label, w * 0.08, h * 0.09);
  ctx.font = "400 9px ui-monospace, monospace";
  ctx.globalAlpha = 0.7;
  ctx.fillText(theme.line, w * 0.08, h * 0.115);
  ctx.globalAlpha = 1;
  ctx.textAlign = "right";
  ctx.fillText(env.name.toUpperCase(), w * 0.92, h * 0.09);
  ctx.textAlign = "left";
  ctx.fillStyle = gold;
  ctx.fillRect(w * 0.08, h * 0.945, w * 0.1, 1.5);
  ctx.fillStyle = env.dark ? "rgba(245,238,223,0.5)" : "rgba(48,43,35,0.5)";
  ctx.font = "400 9px ui-monospace, monospace";
  ctx.fillText("STUDIO SERIES / GENERATED IN EKLAKSHYA AI", w * 0.08, h * 0.965);
  ctx.textAlign = "right";
  ctx.fillText("04 / 240", w * 0.92, h * 0.965);

  // vignette
  const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.78);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.34)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

/* --- Batch grid atlas: raw top half / polished bottom half per cell ---------------------------- */

function paintBatchAtlas(canvas, gold) {
  const ctx = canvas.getContext("2d");
  const cols = 6;
  const rows = 4;
  const cell = 256;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const env = ENVIRONMENTS[(i * 5 + 2) % ENVIRONMENTS.length];
      const product = PRODUCTS[i % 3];
      const x0 = c * cell;
      const y0 = r * cell;
      const rand = seeded(100 + i * 13);

      // RAW / reference half (top 128px of the cell)
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, y0, cell, cell / 2);
      ctx.clip();
      ctx.fillStyle = linear(ctx, x0, y0, x0 + cell, y0 + cell / 2, [
        [0, "#8c877c"], [1, "#5f5b53"],
      ]);
      ctx.fillRect(x0, y0, cell, cell / 2);
      ctx.fillStyle = "rgba(220,213,199,0.16)";
      ctx.fillRect(x0, y0, cell, cell * 0.22);
      for (let s = 0; s < 7; s++) {
        ctx.fillStyle = ["rgba(60,56,49,0.5)", "rgba(190,180,161,0.3)", "rgba(95,88,76,0.45)"][s % 3];
        roundedPath(ctx, x0 + rand() * cell, y0 + rand() * (cell / 2), 12 + rand() * 42, 5 + rand() * 22, 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(30,27,22,0.18)";
      ctx.fillRect(x0, y0 + cell * 0.33, cell, cell * 0.17);
      drawProduct(ctx, product, x0 + cell / 2, y0 + cell * 0.445, cell * 0.32, {
        body: "#bab2a3", bodyDark: "#7d766a", gold: "#a8997d", cap: "#a8997d",
        ink: "#575147", outline: "rgba(255,255,255,0.16)",
      });
      ctx.fillStyle = "rgba(13,11,8,0.44)";
      ctx.fillRect(x0, y0 + cell * 0.155, 66, 14);
      ctx.fillStyle = "rgba(240,232,216,0.6)";
      ctx.font = "400 8px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.fillText("RAW INPUT", x0 + 7, y0 + 16);
      ctx.restore();

      // POLISHED half (bottom 128px)
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, y0 + cell / 2, cell, cell / 2);
      ctx.clip();
      const py = y0 + cell / 2;
      ctx.fillStyle = linear(ctx, x0, py, x0, py + cell / 2, [
        [0, env.bg[0]], [0.68, env.bg[1]], [1, env.floor[1]],
      ]);
      ctx.fillRect(x0, py, cell, cell / 2);
      const g = ctx.createRadialGradient(
        x0 + cell / 2, py + cell * 0.24, 2, x0 + cell / 2, py + cell * 0.24, cell * 0.4
      );
      g.addColorStop(0, env.dark ? "rgba(255,221,154,0.3)" : "rgba(255,255,255,0.6)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x0, py, cell, cell / 2);
      ctx.fillStyle = linear(ctx, 0, py + cell * 0.32, 0, py + cell / 2, [
        [0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0.26)"],
      ]);
      ctx.fillRect(x0, py + cell * 0.3, cell, cell / 2);
      drawProduct(ctx, product, x0 + cell / 2, py + cell * 0.44, cell * 0.36, productPalette(product, env, gold));
      ctx.fillStyle = env.dark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.5)";
      ctx.fillRect(x0 + 1, py + 1, cell - 2, 1);
      ctx.fillStyle = env.dark ? "rgba(240,230,210,0.78)" : "rgba(45,40,32,0.72)";
      ctx.font = "500 8px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.fillText(env.name.toUpperCase(), x0 + 8, py + 14);
      ctx.textAlign = "right";
      ctx.fillStyle = gold;
      ctx.fillText("4K", x0 + cell - 8, py + 14);
      ctx.restore();
    }
  }
}

/* --- Build every texture once ------------------------------------------------------------------ */

function* buildSceneAssets(gold, made) {
    const texture = (canvas, opts) => {
      const t = toTexture(canvas, opts);
      made.push(t);
      return t;
    };

    // Reference photo
    const photoCanvas = makeCanvas(512, 640);
    paintReferencePhoto(photoCanvas, gold);
    const photoTexture = texture(photoCanvas);
    yield;

    // Checkerboard for transparency
    const checkerCanvas = makeCanvas(128, 128);
    const cctx = checkerCanvas.getContext("2d");
    const sq = 16;
    for (let y = 0; y < 128; y += sq) {
      for (let x = 0; x < 128; x += sq) {
        cctx.fillStyle = (x / sq + y / sq) % 2 === 0 ? "rgba(228,222,208,0.92)" : "rgba(178,172,158,0.92)";
        cctx.fillRect(x, y, sq, sq);
      }
    }
    const checkerTexture = texture(checkerCanvas);
    checkerTexture.wrapS = checkerTexture.wrapT = THREE.RepeatWrapping;
    checkerTexture.repeat.set(6, 7.5);

    // Product label + print textures
    const labelCanvas = makeCanvas(256, 256);
    const lctx = labelCanvas.getContext("2d");
    paintLabel(lctx, 256, 256, gold);
    const labelTexture = texture(labelCanvas);

    const boxCanvas = makeCanvas(512, 512);
    paintBoxPrint(boxCanvas, gold);
    const boxTexture = texture(boxCanvas);
    yield;

    // Environments
    const backdrops = [];
    const floors = [];
    const cards = [];
    const cardProducts = ["bottle", "box", "bearing"];
    for (const [i, env] of ENVIRONMENTS.entries()) {
      const bCanvas = makeCanvas(512, 384);
      paintBackdrop(bCanvas, env, gold);
      backdrops.push(texture(bCanvas));

      const fCanvas = makeCanvas(512, 512);
      paintFloor(fCanvas, env, gold);
      floors.push(texture(fCanvas));

      const cCanvas = makeCanvas(320, 200);
      paintEnvCard(cCanvas, env, cardProducts[i % 3], gold, i);
      cards.push(texture(cCanvas));
      yield;
    }

    // Batch atlas
    const atlasCanvas = makeCanvas(1536, 1024);
    paintBatchAtlas(atlasCanvas, gold);
    const atlasTexture = texture(atlasCanvas);
    yield;

    // Export stills, also used by the before / after wipe.
    const shots = {};
    const shotCanvases = {};
    for (const [i, p] of PRODUCTS.entries()) {
      const canvas = makeCanvas(512, 640);
      paintShot(canvas, p, i === 0 ? 3 : i === 1 ? 0 : 9, gold);
      shotCanvases[p] = canvas;
      shots[p] = texture(canvas);
      yield;
    }


    // Contact shadow
    const shadowCanvas = makeCanvas(256, 256);
    const shctx = shadowCanvas.getContext("2d");
    const sg = shctx.createRadialGradient(128, 128, 4, 128, 128, 124);
    sg.addColorStop(0, "rgba(0,0,0,0.72)");
    sg.addColorStop(0.42, "rgba(0,0,0,0.36)");
    sg.addColorStop(1, "rgba(0,0,0,0)");
    shctx.fillStyle = sg;
    shctx.fillRect(0, 0, 256, 256);
    const shadowTexture = texture(shadowCanvas);

    // Fine pixel grid for the export stage
    const gridCanvas = makeCanvas(128, 128);
    const gctx = gridCanvas.getContext("2d");
    gctx.clearRect(0, 0, 128, 128);
    gctx.strokeStyle = "rgba(160,226,244,0.75)";
    gctx.lineWidth = 1;
    for (let i = 0; i <= 128; i += 8) {
      gctx.beginPath(); gctx.moveTo(i, 0); gctx.lineTo(i, 128); gctx.stroke();
      gctx.beginPath(); gctx.moveTo(0, i); gctx.lineTo(128, i); gctx.stroke();
    }
    const pixelTexture = texture(gridCanvas, { repeat: [16, 20] });

    return {
      photoTexture, checkerTexture, labelTexture, boxTexture,
      backdrops, floors, cards, atlasTexture,
      shots, shadowTexture, pixelTexture, all: made,
    };
}

/** Paint identical artwork in small tasks so input can run between textures. */
function useSceneAssets(gold) {
  const [prepared, setPrepared] = useState(null);
  const owned = useRef(new Set());
  useEffect(() => {
    const made = [];
    const steps = buildSceneAssets(gold, made);
    let disposed = false;
    let published = false;
    let timer;
    const step = () => {
      if (disposed) return;
      try {
        const next = steps.next();
        if (next.done) {
          published = true;
          made.forEach((texture) => owned.current.add(texture));
          setPrepared({ gold, assets: next.value });
        }
        else timer = window.setTimeout(step, 0);
      } catch (error) {
        setPrepared({ gold, error });
      }
    };
    timer = window.setTimeout(step, 0);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      steps.return();
      if (!published) made.forEach((t) => t.dispose());
    };
  }, [gold]);

  useEffect(() => {
    const textures = owned.current;
    return () => prepared?.assets?.all.forEach((texture) => {
      if (textures.delete(texture)) texture.dispose();
    });
  }, [prepared]);
  useEffect(() => {
    const textures = owned.current;
    return () => { textures.forEach((texture) => texture.dispose()); textures.clear(); };
  }, []);

  if (prepared?.error && prepared.gold === gold) throw prepared.error;
  // Retain the current canvas and textures while a theme's artwork is prepared.
  return prepared?.assets ?? null;
}

function paintLabel(ctx, w, h, gold) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#f4efe3";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = gold;
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, w - 28, h - 28);
  ctx.strokeStyle = "rgba(120,104,78,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(22, 22, w - 44, h - 44);
  ctx.fillStyle = "#51483a";
  ctx.textAlign = "center";
  ctx.font = "600 30px ui-monospace, monospace";
  ctx.fillText("AUREL", w / 2, h * 0.4);
  ctx.font = "400 13px ui-monospace, monospace";
  ctx.fillText("EAU DE PARFUM", w / 2, h * 0.5);
  ctx.strokeStyle = gold;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(w * 0.36, h * 0.58);
  ctx.lineTo(w * 0.64, h * 0.58);
  ctx.stroke();
  ctx.font = "400 12px ui-monospace, monospace";
  ctx.fillStyle = "#6b5f4e";
  ctx.fillText("50 ML  ·  1.7 FL OZ", w / 2, h * 0.68);
  ctx.font = "400 9px ui-monospace, monospace";
  ctx.fillStyle = "rgba(80,70,56,0.65)";
  ctx.fillText("PARIS · EKLAKSHYA ATELIER", w / 2, h * 0.82);
}

function paintBoxPrint(canvas, gold) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = linear(ctx, 0, 0, w, h, [[0, "#f4eee2"], [0.55, "#e6ddcc"], [1, "#cfc4af"]]);
  ctx.fillRect(0, 0, w, h);
  speckle(ctx, w, h, 900, ["#ffffff", "#a89c86"], 15, 1.1);
  ctx.strokeStyle = gold;
  ctx.lineWidth = 3;
  ctx.strokeRect(w * 0.08, h * 0.1, w * 0.84, h * 0.8);
  ctx.strokeStyle = "rgba(245,196,81,0.55)";
  ctx.lineWidth = 1;
  ctx.strokeRect(w * 0.115, h * 0.145, w * 0.77, h * 0.71);
  ctx.fillStyle = "#4b4233";
  ctx.textAlign = "center";
  ctx.font = "700 86px ui-monospace, monospace";
  ctx.fillText("E", w / 2, h * 0.44);
  ctx.font = "500 22px ui-monospace, monospace";
  ctx.fillText("EKLAKSHYA", w / 2, h * 0.55);
  ctx.font = "400 12px ui-monospace, monospace";
  ctx.fillStyle = "#7a6c55";
  ctx.fillText("THE OBJECT SERIES", w / 2, h * 0.6);
  ctx.strokeStyle = gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.3, h * 0.68);
  ctx.lineTo(w * 0.7, h * 0.68);
  ctx.stroke();
  ctx.font = "400 11px ui-monospace, monospace";
  ctx.fillText("NO. 04  ·  MADE TO BE NOTICED", w / 2, h * 0.75);
  // diamond motif
  ctx.save();
  ctx.translate(w / 2, h * 0.86);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = gold;
  ctx.fillRect(-8, -8, 16, 16);
  ctx.restore();
}

/* ================================================================================================
 * 03 — Shared 3D building blocks
 * ================================================================================================ */

/** Thin, dashed guide ring (used for the slide framing and the turntable). */
function DashRing({
  radius = 2.6, segments = 128, color = "#f5c451", opacity = 0.25,
  dashSize = 0.025, gapSize = 0.09, position = [0, 0, 0], rotation = [0, 0, 0],
}) {
  const ref = useRef();
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
    }
    return pts;
  }, [radius, segments]);

  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.geometry.setFromPoints(points);
      ref.current.computeLineDistances?.();
    }
  }, [points]);

  return (
    <line ref={ref} position={position} rotation={rotation}>
      <bufferGeometry />
      <lineDashedMaterial
        color={color}
        transparent
        opacity={opacity}
        dashSize={dashSize}
        gapSize={gapSize}
        depthWrite={false}
      />
    </line>
  );
}

/** Very quiet dotted outer ring + crosshairs. Only enough to rhyme with the other slides. */
/** A handful of gold diamonds — small, sparse, and nothing like a blob. */
function GoldDiamonds({ gold, count = 9 }) {
  const ref = useRef();
  const data = useMemo(() => {
    const rand = seeded(2026);
    return Array.from({ length: count }, (_, i) => ({
      x: (rand() - 0.5) * 5.8,
      y: rand() * 3.4 + 0.2,
      z: -1.8 + rand() * 2.2,
      s: 0.03 + rand() * 0.055,
      speed: 0.12 + rand() * 0.22,
      phase: rand() * Math.PI * 2,
      spin: i % 2 ? 1 : -1,
    }));
  }, [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    data.forEach((d, i) => {
      dummy.position.set(
        d.x + Math.sin(t * d.speed + d.phase) * 0.12,
        d.y + Math.sin(t * d.speed * 1.3 + d.phase) * 0.16,
        d.z
      );
      dummy.rotation.set(t * 0.18 * d.spin, t * 0.3 + d.phase, 0.2);
      dummy.scale.setScalar(d.s);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[null, null, count]} frustumCulled={false}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color={gold} transparent opacity={0.9} toneMapped={false} />
    </instancedMesh>
  );
}

/** Procedural image-based lighting. No HDRI, no network, only drei Lightformers. */
function StudioEnvironment({ env, rig }) {
  const dark = env.dark;
  const key = rig.key;
  return (
    <Environment
      key={`${env.name}-${rig.name}`}
      resolution={128}
      frames={1}
      background={false}
      environmentIntensity={dark ? 0.72 : 1}
    >
      <Lightformer
        form="rect"
        intensity={dark ? 2.2 : 4.2}
        color={key[0]}
        position={[0, 4.5, -4]}
        scale={[9, 3.5, 1]}
      />
      <Lightformer
        form="rect"
        intensity={rig.intensity * 0.75}
        color={key[1]}
        position={[4, 2.2, 2.5]}
        scale={[2.2, 5.5, 1]}
        rotation={[0, -Math.PI / 3, 0]}
      />
      <Lightformer
        form="rect"
        intensity={rig.intensity * 0.6}
        color={rig.fill}
        position={[-4.2, 1.5, 1.5]}
        scale={[2.4, 5, 1]}
        rotation={[0, Math.PI / 3.2, 0]}
      />
      <Lightformer
        form="circle"
        intensity={dark ? 3 : 2}
        color={env.accent}
        position={[0, 3.2, 1.5]}
        scale={[2, 2, 1]}
      />
      <Lightformer
        form="ring"
        intensity={dark ? 1.2 : 1.6}
        color={env.light[0]}
        position={[-2.5, 1.2, 3.2]}
        scale={2.4}
      />
      {/* dedicated gold strip keeps the brand light present in every scene */}
      <Lightformer
        form="rect"
        intensity={1.25}
        color="#f5c451"
        position={[2.6, 3.6, 1.2]}
        scale={[1.3, 0.24, 1]}
        rotation={[0, -Math.PI / 5, 0.16]}
      />
      <Lightformer
        form="rect"
        intensity={0.95}
        color="#6cc7e8"
        position={[-3, 2.9, 2.1]}
        scale={[0.18, 2.6, 1]}
        rotation={[0, Math.PI / 4, 0]}
      />
      <Lightformer
        form="rect"
        intensity={dark ? 0.6 : 1.4}
        color={env.bg[0]}
        position={[0, -2.4, 2]}
        scale={[8, 2, 1]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
    </Environment>
  );
}

/* ================================================================================================
 * 04 — Hero product (the only place we spend on MeshPhysicalMaterial)
 * ================================================================================================ */

const HERO_TARGETS = [
  { p: [0.04, 0.16, 0.22], s: 1.0, ry: 0.24 },
  { p: [0.0, 0.22, 0.92], s: 1.06, ry: 0.1 },
  { p: [0.0, 0.0, 0.0], s: 1.0, ry: -0.2 },
  { p: [0.0, 0.0, 0.0], s: 1.0, ry: -0.2 },
  { p: [0.0, 0.0, 0.0], s: 0.001, ry: 0.0 },
  { p: [0.0, 0.0, 0.0], s: 0.001, ry: 0.0 },
];

function HeroProduct({ type, stage, assets, gold, cyan, textureURL, dragRef }) {
  const group = useRef();
  const inner = useRef();
  const shadowRef = useRef();
  const target = useMemo(() => new THREE.Vector3(), []);
  const temp = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.06);
    if (!group.current) return;
    const config = HERO_TARGETS[Math.min(stage, HERO_TARGETS.length - 1)];
    target.set(...config.p);
    group.current.position.lerp(target, 1 - Math.exp(-dt * 4.4));
    const nextScale = lerp(group.current.scale.x || 0.001, config.s, 1 - Math.exp(-dt * 4));
    group.current.scale.setScalar(Math.max(0.001, nextScale));
    group.current.visible = stage < 4;

    if (inner.current) {
      const t = state.clock.elapsedTime;
      inner.current.position.y = Math.sin(t * 1.2) * 0.028 + Math.sin(t * 0.55) * 0.016;
      inner.current.rotation.y = lerp(inner.current.rotation.y, config.ry + Math.sin(t * 0.32) * 0.16, 1 - Math.exp(-dt * 2));
      inner.current.rotation.z = Math.sin(t * 0.6) * 0.014;
    }
    if (shadowRef.current) {
      shadowRef.current.material.opacity = lerp(
        shadowRef.current.material.opacity,
        stage <= 1 ? 0.42 : 0.55,
        1 - Math.exp(-dt * 3)
      );
      const s = stage <= 1 ? 1.45 : 1.7;
      shadowRef.current.scale.x = lerp(shadowRef.current.scale.x, s, 1 - Math.exp(-dt * 3));
      shadowRef.current.scale.y = lerp(shadowRef.current.scale.y, s * 0.7, 1 - Math.exp(-dt * 3));
    }
  });

  return (
    <group ref={group}>
      <group ref={inner} rotation={[0, type === "bearing" ? 0.4 : 0.2, 0]}>
        {type === "bottle" && <Bottle assets={assets} gold={gold} />}
        {type === "box" && <Packaging assets={assets} gold={gold} />}
        {type === "bearing" && <Bearing gold={gold} cyan={cyan} />}
      </group>
      <mesh ref={shadowRef} position={[0, 0.003, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={assets.shadowTexture}
          transparent
          opacity={0.45}
          depthWrite={false}
          color="#0a0805"
        />
      </mesh>
    </group>
  );
}

function Bottle({ assets, gold }) {
  const profile = useMemo(
    () =>
      [
        [0.0, 0.0], [0.34, 0.01], [0.46, 0.07], [0.5, 0.18], [0.51, 0.7],
        [0.51, 1.14], [0.48, 1.24], [0.34, 1.32], [0.26, 1.36], [0.235, 1.44],
        [0.235, 1.5], [0.0, 1.505],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
    []
  );

  return (
    <group>
      {/* cosmetic glass body */}
      <mesh castShadow={false} receiveShadow={false}>
        <latheGeometry args={[profile, 64]} />
        <meshPhysicalMaterial
          color="#f2e6cf"
          metalness={0.03}
          roughness={0.06}
          transmission={0.4}
          thickness={0.7}
          ior={1.46}
          transparent
          opacity={0.62}
          clearcoat={1}
          clearcoatRoughness={0.03}
          envMapIntensity={2.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* liquid core */}
      <mesh position={[0, 0.02, 0]} scale={[0.86, 0.96, 0.86]}>
        <latheGeometry args={[profile, 48]} />
        <meshPhysicalMaterial
          color="#e6c37c"
          roughness={0.22}
          metalness={0.08}
          transparent
          opacity={0.32}
          transmission={0.1}
          envMapIntensity={1.2}
        />
      </mesh>
      {/* gold collar + cap */}
      <mesh position={[0, 1.47, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.07, 48]} />
        <meshPhysicalMaterial color={gold} metalness={1} roughness={0.22} envMapIntensity={1.8} />
      </mesh>
      <mesh position={[0, 1.64, 0]}>
        <cylinderGeometry args={[0.245, 0.255, 0.3, 56]} />
        <meshPhysicalMaterial color="#e7c176" metalness={1} roughness={0.17} envMapIntensity={2.1} />
      </mesh>
      <mesh position={[0, 1.79, 0]}>
        <cylinderGeometry args={[0.21, 0.245, 0.045, 56]} />
        <meshPhysicalMaterial color={gold} metalness={1} roughness={0.26} envMapIntensity={1.9} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <torusGeometry args={[0.235, 0.011, 8, 40]} />
        <meshPhysicalMaterial color={gold} metalness={1} roughness={0.3} />
      </mesh>
      {/* printed label */}
      <mesh position={[0, 0.66, 0.505]} rotation={[0, 0, 0]}>
        <planeGeometry args={[0.6, 0.56]} />
        <meshPhysicalMaterial
          map={assets.labelTexture}
          roughness={0.42}
          metalness={0.08}
          clearcoat={0.4}
          clearcoatRoughness={0.3}
        />
      </mesh>
      {/* two tiny brand glints on the glass */}
      <mesh position={[-0.46, 1.03, 0.18]} rotation={[0, 0.4, 0.14]}>
        <planeGeometry args={[0.035, 0.5]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.28} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Packaging({ assets, gold }) {
  return (
    <group position={[0, 0.73, 0]}>
      <RoundedBox args={[1.06, 1.4, 0.56]} radius={0.045} smoothness={4}>
        <meshPhysicalMaterial
          map={assets.boxTexture}
          color="#fbf7ef"
          roughness={0.34}
          metalness={0.12}
          clearcoat={0.36}
          clearcoatRoughness={0.2}
          envMapIntensity={1.15}
        />
      </RoundedBox>
      {/* gold ribbon wrapping the package */}
      <mesh position={[0.02, 0.16, 0]}>
        <boxGeometry args={[1.08, 0.075, 0.58]} />
        <meshPhysicalMaterial color={gold} metalness={1} roughness={0.24} envMapIntensity={1.8} />
      </mesh>
      <mesh position={[0.02, -0.42, 0]}>
        <boxGeometry args={[1.08, 0.018, 0.58]} />
        <meshPhysicalMaterial color={gold} metalness={1} roughness={0.3} envMapIntensity={1.6} />
      </mesh>
      {/* small raised seal */}
      <mesh position={[0.02, 0.45, 0.285]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.085, 0.085, 0.012]} />
        <meshPhysicalMaterial color={gold} metalness={1} roughness={0.2} envMapIntensity={2} />
      </mesh>
    </group>
  );
}

function Bearing({ gold, cyan }) {
  const balls = useMemo(() => Array.from({ length: 9 }, (_, i) => (i / 9) * Math.PI * 2), []);
  return (
    <group position={[0, 0.92, 0]} rotation={[0.45, 0.1, 0.28]}>
      {/* outer race */}
      <mesh>
        <torusGeometry args={[0.62, 0.16, 24, 96]} />
        <meshPhysicalMaterial color="#b9bec5" metalness={1} roughness={0.3} envMapIntensity={1.85} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.76, 0.024, 8, 96]} />
        <meshPhysicalMaterial color={gold} metalness={1} roughness={0.24} envMapIntensity={1.7} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.47, 0.038, 10, 96]} />
        <meshPhysicalMaterial color="#6e747b" metalness={1} roughness={0.45} envMapIntensity={1.1} />
      </mesh>
      {/* inner hub */}
      <mesh>
        <cylinderGeometry args={[0.35, 0.35, 0.18, 64]} />
        <meshPhysicalMaterial color="#9aa0a8" metalness={1} roughness={0.38} envMapIntensity={1.4} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.17, 0.17, 0.22, 48]} />
        <meshPhysicalMaterial color="#4e545b" metalness={0.9} roughness={0.5} envMapIntensity={0.9} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.18, 0.018, 8, 48]} />
        <meshPhysicalMaterial color={gold} metalness={1} roughness={0.24} envMapIntensity={1.9} />
      </mesh>
      {/* rolling elements */}
      {balls.map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55]}>
          <sphereGeometry args={[0.088, 20, 20]} />
          <meshPhysicalMaterial color="#e7ebee" metalness={1} roughness={0.16} envMapIntensity={2.1} />
        </mesh>
      ))}
      {/* cyan inspection mark */}
      <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.205, 48, 1, 0.3, 1.4]} />
        <meshBasicMaterial color={cyan} transparent opacity={0.9} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Persistently visible turntable under the product in stages 3–4. */
function Turntable({ gold, cyan, visible }) {
  const ref = useRef();
  const ticksRef = useRef();
  const ticks = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const long = i % 6 === 0;
      const r1 = 1.12;
      const r2 = r1 + (long ? 0.1 : 0.045);
      pts.push(new THREE.Vector3(Math.cos(a) * r1, 0, Math.sin(a) * r1));
      pts.push(new THREE.Vector3(Math.cos(a) * r2, 0, Math.sin(a) * r2));
    }
    return pts;
  }, []);

  useLayoutEffect(() => {
    if (!ticksRef.current) return;
    ticksRef.current.geometry.setFromPoints(ticks);
    ticksRef.current.computeLineDistances();
  }, [ticks]);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += Math.min(delta, 0.05) * 0.08;
  });

  return (
    <group position={[0, 0.002, 0]} visible={visible}>
      <group ref={ref}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.09, 1.145, 96]} />
          <meshBasicMaterial color={gold} transparent opacity={0.5} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        <line ref={ticksRef}>
          <bufferGeometry />
          <lineBasicMaterial color={gold} transparent opacity={0.4} toneMapped={false} />
        </line>
        <DashRing radius={1.32} opacity={0.26} color={cyan} dashSize={0.03} gapSize={0.07} segments={160} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} />
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[0, 1.45, 96]} />
        <meshBasicMaterial
          color={gold}
          transparent
          opacity={0.045}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* ================================================================================================
 * 05 — Stage 1 & 2: reference photo, scanner, cutout, lift
 * ================================================================================================ */

function silhouettePoints(type, origin) {
  const [ox, oy] = origin;
  const pts = [];
  if (type === "bearing") {
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(ox + Math.cos(a) * 0.66, oy + 0.78 + Math.sin(a) * 0.66, 0.1));
    }
    return pts;
  }
  const shape = type === "box"
    ? [[-0.53, 0], [-0.53, 1.36], [0.53, 1.36], [0.53, 0], [-0.53, 0]]
    : [
        [-0.45, 0.0], [-0.47, 0.72], [-0.44, 1.18], [-0.32, 1.3], [-0.21, 1.37],
        [-0.18, 1.47], [-0.18, 1.56], [-0.17, 1.72], [0.17, 1.72], [0.18, 1.56],
        [0.18, 1.47], [0.21, 1.37], [0.32, 1.3], [0.44, 1.18], [0.47, 0.72], [0.45, 0],
        [-0.45, 0],
      ];
  shape.forEach(([x, y]) => pts.push(new THREE.Vector3(ox + x, oy + y, 0.1)));
  return pts;
}

function ReferenceSequence({ stage, startedAtRef, product, assets, gold, cyan }) {
  const group = useRef();
  const photoMat = useRef();
  const frameMat = useRef();
  const checkerMat = useRef();
  const scanGroup = useRef();
  const scanMat = useRef();
  const outlineRef = useRef();
  const bitsRef = useRef();
  const bits = useMemo(() => {
    const rand = seeded(88);
    return Array.from({ length: 22 }, () => ({
      x: (rand() - 0.5) * 2.2,
      y: (rand() - 0.5) * 2.6,
      speed: 0.3 + rand() * 0.7,
      delay: rand() * 0.6,
      size: 0.015 + rand() * 0.035,
    }));
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const outline = useMemo(
    () => silhouettePoints(product === "box" ? "box" : product, [-0.02, -0.96]),
    [product]
  );

  useLayoutEffect(() => {
    if (outlineRef.current) {
      outlineRef.current.geometry.setFromPoints(outline);
      outlineRef.current.computeLineDistances();
    }
  }, [outline]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.06);
    const t = (performance.now() - startedAtRef.current) / 1000;
    if (!group.current) return;

    // gentle entrance + drift
    const reveal = easeOut(clamp(t / 0.65));
    group.current.position.y = 1.52 + Math.sin(state.clock.elapsedTime * 0.7) * 0.015;
    group.current.scale.setScalar(lerp(0.82, 0.9, reveal));
    group.current.rotation.y = -0.13 + Math.sin(state.clock.elapsedTime * 0.35) * 0.02;
    group.current.rotation.x = -0.035;

    const scan = clamp((t - 0.65) / 1.75);
    const lift = clamp((t - 2.15) / 1.5);
    const dissolve = clamp((t - 2.0) / 1.4);

    if (scanGroup.current) {
      scanGroup.current.visible = scan > 0 && scan < 0.999;
      scanGroup.current.position.y = lerp(1.34, -1.34, e1(scan));
    }
    if (scanMat.current) {
      scanMat.current.opacity = scan > 0 && scan < 0.98 ? 0.9 * Math.sin(Math.PI * clamp(scan * 2)) : 0;
    }
    if (checkerMat.current) checkerMat.current.opacity = easeOut(dissolve) * 0.88;
    if (photoMat.current) photoMat.current.opacity = 1 - easeOut(clamp((t - 2.9) / 1.2));
    if (frameMat.current) frameMat.current.opacity = (1 - easeOut(clamp((t - 2.9) / 1.2))) * 0.9;
    if (outlineRef.current) {
      const mat = outlineRef.current.material;
      mat.opacity = easeOut(clamp((t - 1.8) / 0.7)) * (1 - clamp((t - 4.3) / 0.5));
      mat.dashOffset -= dt * 0.22;
      const draw = clamp((t - 1.8) / 1.0);
      outlineRef.current.geometry.setDrawRange(0, Math.max(2, Math.floor(outline.length * draw)));
    }

    if (bitsRef.current) {
      bits.forEach((b, i) => {
        const local = clamp((dissolve - b.delay) / 0.8);
        dummy.position.set(
          b.x + Math.sin(state.clock.elapsedTime * b.speed * 3 + i) * 0.1,
          b.y + 0.7 + local * 0.7,
          0.2 + local * 0.5
        );
        dummy.scale.setScalar(b.size * local);
        dummy.rotation.z = state.clock.elapsedTime * b.speed;
        dummy.updateMatrix();
        bitsRef.current.setMatrixAt(i, dummy.matrix);
      });
      bitsRef.current.instanceMatrix.needsUpdate = true;
    }

    // card leaves once the product is free
    group.current.visible = stage <= 1 && t < 4.6;
  });

  return (
    <group ref={group} position={[0.08, 1.52, 0]}>
      <mesh position={[0, 0, -0.035]}>
        <planeGeometry args={[2.36, 2.94]} />
        <meshBasicMaterial ref={frameMat} color={gold} transparent opacity={0.9} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.03]}>
        <planeGeometry args={[2.28, 2.88]} />
        <meshBasicMaterial map={assets.photoTexture} ref={photoMat} transparent toneMapped={false} />
      </mesh>
      {/* transparency checker revealed behind the dissolving pixels */}
      <mesh position={[0, 0, -0.025]}>
        <planeGeometry args={[2.28, 2.88]} />
        <meshBasicMaterial
          ref={checkerMat}
          map={assets.checkerTexture}
          transparent
          opacity={0}
          toneMapped={false}
        />
      </mesh>
      {/* gold corner brackets */}
      {[
        [-1.24, 1.52, 1, -1], [1.24, 1.52, -1, -1],
        [-1.24, -1.52, 1, 1], [1.24, -1.52, -1, 1],
      ].map(([x, y, sx, sy], i) => (
        <group key={i} position={[x, y, 0.02]}>
          <mesh position={[(sx * 0.1) / 2, 0, 0]}>
            <planeGeometry args={[0.1, 0.012]} />
            <meshBasicMaterial color={gold} toneMapped={false} />
          </mesh>
          <mesh position={[0, (sy * 0.1) / 2, 0]}>
            <planeGeometry args={[0.012, 0.1]} />
            <meshBasicMaterial color={gold} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* cyan scanner line */}
      <group ref={scanGroup} position={[0, 1.3, 0.03]}>
        <mesh>
          <planeGeometry args={[2.3, 0.028]} />
          <meshBasicMaterial ref={scanMat} color="#a9ecff" transparent opacity={0} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[2.4, 0.13]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.12} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <planeGeometry args={[2.3, 0.006]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.35} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.15, 0]}>
          <planeGeometry args={[2.3, 0.006]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.2} toneMapped={false} />
        </mesh>
      </group>
      {/* dashed gold cutout */}
      <line ref={outlineRef} position={[0, 0, 0.055]}>
        <bufferGeometry />
        <lineDashedMaterial
          color={gold}
          dashSize={0.07}
          gapSize={0.05}
          transparent
          opacity={0}
          toneMapped={false}
        />
      </line>
      {/* dissolving background pixels */}
      <instancedMesh ref={bitsRef} args={[null, null, bits.length]} position={[0, 0, 0.03]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#cfc7b7" transparent opacity={0.55} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

const e1 = easeInOut;

/* ================================================================================================
 * 06 — Stage 3: environment backdrop, floor, 12-card carousel
 * ================================================================================================ */

function StageBackdrop({ envIndex, assets, visible }) {
  const previousEnv = useRef(envIndex);
  const fromMat = useRef();
  const fromFloorMat = useRef();
  const fade = useRef(1);
  const toMat = useRef();
  const toFloorMat = useRef();

  useLayoutEffect(() => {
    if (fromMat.current) fromMat.current.map = assets.backdrops[previousEnv.current];
    if (fromFloorMat.current) fromFloorMat.current.map = assets.floors[previousEnv.current];
    previousEnv.current = envIndex;
    fade.current = 0;
  }, [envIndex, assets]);

  useFrame((_, delta) => {
    if (fade.current < 1) {
      fade.current = clamp(fade.current + Math.min(delta, 0.05) / 0.85);
      if (toMat.current) toMat.current.opacity = easeInOut(fade.current);
      if (toFloorMat.current) toFloorMat.current.opacity = easeInOut(fade.current);
    }
  });

  return (
    <group visible={visible}>
      {/* colour-matched stage light behind the product */}
      <mesh position={[0, 1.35, -2.9]}>
        <planeGeometry args={[9, 5.6]} />
        <meshBasicMaterial ref={fromMat} map={assets.backdrops[envIndex]} toneMapped={false} transparent opacity={1} />
      </mesh>
      <mesh position={[0, 1.35, -2.88]}>
        <planeGeometry args={[9, 5.6]} />
        <meshBasicMaterial
          ref={toMat}
          map={assets.backdrops[envIndex]}
          toneMapped={false}
          transparent
          opacity={0}
        />
      </mesh>
      {/* surface */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.4, 7.4]} />
        <meshBasicMaterial ref={fromFloorMat} map={assets.floors[envIndex]} toneMapped={false} transparent opacity={1} />
      </mesh>
      <mesh position={[0, 0.0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.4, 7.4]} />
        <meshBasicMaterial
          ref={toFloorMat}
          map={assets.floors[envIndex]}
          toneMapped={false}
          transparent
          opacity={0}
        />
      </mesh>
      {/* horizon haze to blend floor into the wall */}
      <mesh position={[0, 0.34, -2.4]}>
        <planeGeometry args={[9, 1.4]} />
        <meshBasicMaterial color="#0b0806" transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  );
}

function EnvironmentCarousel({
  active, envIndex, assets, gold, cyan, onSelect, onHover, onHoverEnd,
}) {
  const { size, camera } = useThree();
  const narrow = size.width / size.height < 0.92;
  const radius = narrow ? 1.78 : 2.42;
  const refs = useRef([]);
  const frameRefs = useRef([]);
  const markerRefs = useRef([]);
  const group = useRef();
  const [hovered, setHovered] = useState(-1);
  const orbit = useRef(0);
  const reveal = useRef(0);
  const tilt = 0.33;

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.06);
    reveal.current = clamp(reveal.current + dt / 0.7);
    if (active && hovered < 0) orbit.current += dt * 0.04;
    if (group.current) {
      group.current.visible = reveal.current > 0.02;
      group.current.scale.setScalar(lerp(0.82, 1, easeOut(reveal.current)));
    }
    refs.current.forEach((card, i) => {
      if (!card) return;
      const a = (i / ENVIRONMENTS.length) * Math.PI * 2 + orbit.current;
      const x = Math.sin(a) * radius;
      const z = Math.cos(a) * radius * Math.cos(tilt);
      const y = 0.98 - Math.cos(a) * radius * Math.sin(tilt) + Math.sin(state.clock.elapsedTime * 0.8 + i) * 0.016;
      card.position.set(x, y, z);
      // Billboard yaw toward camera so every environment stays legible.
      card.rotation.set(0, Math.atan2(camera.position.x - x, camera.position.z - z), 0);
      const front = clamp((Math.cos(a) + 1) / 2);
      const targetScale = (i === envIndex ? 1.16 : 0.9) * (1 - front * 0.14);
      card.scale.x = lerp(card.scale.x, targetScale, 1 - Math.exp(-dt * 6));
      card.scale.y = lerp(card.scale.y, targetScale, 1 - Math.exp(-dt * 6));
      card.scale.z = 1;
      const faceMat = card.children[0]?.material;
      if (faceMat) {
        faceMat.opacity = lerp(faceMat.opacity, i === envIndex ? 1 : 0.62 + (1 - front) * 0.3, 1 - Math.exp(-dt * 4));
      }
      const frame = frameRefs.current[i];
      if (frame) {
        frame.children.forEach((bar) => {
          if (bar.material) {
            bar.material.opacity = lerp(bar.material.opacity, i === envIndex ? 0.95 : 0.14, 1 - Math.exp(-dt * 5));
          }
        });
      }
      const dot = markerRefs.current[i];
      if (dot) {
        dot.visible = i === envIndex;
        dot.position.y = 0.37 + Math.sin(state.clock.elapsedTime * 2 + i) * 0.03;
        dot.rotation.z = state.clock.elapsedTime * 0.6;
      }
    });
  });

  return (
    <group ref={group}>
      {ENVIRONMENTS.map((env, i) => (
        <group
          key={env.name}
          ref={(el) => (refs.current[i] = el)}
          onClick={(e) => {
            if (!active || e.delta > 5) return;
            e.stopPropagation();
            onSelect(i);
          }}
          onPointerOver={(e) => {
            if (!active) return;
            e.stopPropagation();
            setHovered(i);
            onHover?.({
              name: env.name,
              tag: env.tag,
              product: PRODUCT_LABELS[PRODUCTS[i % 3]],
            });
          }}
          onPointerOut={() => {
            if (!active) return;
            setHovered(-1);
            onHoverEnd?.();
          }}
        >
          {/* card face */}
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[0.84, 0.525]} />
            <meshBasicMaterial map={assets.cards[i]} transparent opacity={0.9} toneMapped={false} />
          </mesh>
          {/* thin gold frame — four bars, never a filled plate */}
          <group ref={(el) => (frameRefs.current[i] = el)}>
            {[[0, 0.268, 0.87, 0.008], [0, -0.268, 0.87, 0.008], [-0.434, 0, 0.008, 0.545], [0.434, 0, 0.008, 0.545]].map(
              ([x, y, w, h], k) => (
                <mesh key={k} position={[x, y, -0.006]}>
                  <planeGeometry args={[w, h]} />
                  <meshBasicMaterial color={gold} transparent opacity={0.16} toneMapped={false} />
                </mesh>
              )
            )}
          </group>
          {/* floating gold diamond marker */}
          <mesh ref={(el) => (markerRefs.current[i] = el)} position={[0, 0.37, 0.02]}>
            <octahedronGeometry args={[0.038, 0]} />
            <meshBasicMaterial color={gold} toneMapped={false} />
          </mesh>
          {/* corner ticks */}
          {[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sy], k) => (
            <mesh key={k} position={[sx * 0.45, sy * 0.29, 0.004]}>
              <planeGeometry args={[0.045, 0.004]} />
              <meshBasicMaterial color={gold} transparent opacity={0.6} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* ================================================================================================
 * 07 — Stage 4: AI re-lighting (orb + procedural softbox)
 * ================================================================================================ */

function useGlowTexture() {
  const texture = useMemo(() => {
    const canvas = makeCanvas(128, 128);
    const ctx = canvas.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.18, "rgba(255,255,255,0.85)");
    g.addColorStop(0.48, "rgba(255,255,255,0.24)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return toTexture(canvas, { srgb: false });
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function LightRig({ active, env, rigIndex, gold, cyan, onInteract }) {
  const { gl } = useThree();
  const controls = useThree((s) => s.controls);
  const controlsRef = useRef();
  const groundMarker = useRef();
  const fillLight = useRef();
  useEffect(() => { controlsRef.current = controls; }, [controls]);
  const orb = useRef();
  const softbox = useRef();
  const floorDot = useRef();
  const dragging = useRef(false);
  const dragCleanup = useRef(null);
  const azimuth = useRef(0.85);
  const elevation = useRef(0.5);
  const glow = useGlowTexture();
  const rig = LIGHT_RIGS[rigIndex];
  const radius = 1.55;

  // Make absolutely sure we never leave a window listener or grabbing cursor behind.
  useEffect(() => () => dragCleanup.current?.(), []);

  const endDrag = useCallback(() => {
    dragging.current = false;
    dragCleanup.current?.();
    dragCleanup.current = null;
  }, []);

  const startDrag = useCallback(
    (event) => {
      if (!active || dragCleanup.current) return;
      event.stopPropagation();
      const native = event.nativeEvent || event;
      const touch = native.pointerType === "touch";
      if (!touch && native?.preventDefault) native.preventDefault();
      const controls = controlsRef.current;
      const previousEnabled = controls?.enabled;
      let engaged = false;
      const engage = () => {
        engaged = true;
        onInteract?.();
        dragging.current = true;
        if (controls) controls.enabled = false;
      };
      if (!touch) engage();
      const rect = gl.domElement.getBoundingClientRect();
      const move = (ev) => {
        if (ev.pointerId !== native.pointerId) return;
        if (touch && gl.domElement.dataset.multiTouch === 'true') { endDrag(); return; }
        if (touch && !engaged) {
          const dx = Math.abs(ev.clientX - native.clientX);
          const dy = Math.abs(ev.clientY - native.clientY);
          if (dy > 6 && dy > dx) { endDrag(); return; }
          if (dx <= 6 || dx <= dy) return;
          engage();
        }
        if (!dragging.current) return;
        const nx = clamp((ev.clientX - rect.left) / Math.max(1, rect.width), 0.02, 0.98);
        const ny = clamp((ev.clientY - rect.top) / Math.max(1, rect.height), 0.04, 0.9);
        azimuth.current = nx * Math.PI * 2;
        elevation.current = clamp((1 - ny) * 1.05 + 0.09, 0.1, 1.16);
      };
      const up = (ev) => { if (ev.pointerId === native.pointerId) endDrag(); };
      window.addEventListener("pointermove", move, { passive: true });
      window.addEventListener("pointerup", up, { passive: true });
      window.addEventListener("pointercancel", up, { passive: true });
      dragCleanup.current = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        if (controls && engaged) controls.enabled = previousEnabled;
      };
    },
    [active, endDrag, gl, onInteract]
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    if (!dragging.current && active) azimuth.current += dt * 0.36;
    const az = azimuth.current;
    const el = elevation.current;
    const x = Math.sin(az) * Math.cos(el) * radius;
    const y = 0.92 + Math.sin(el) * radius;
    const z = Math.cos(az) * Math.cos(el) * radius;
    if (orb.current) orb.current.position.set(x, y, z);
    groundMarker.current?.position.set(x, 0.004, z);
    fillLight.current?.position.set(Math.sin(az) * 4, 4, Math.cos(az) * 4);
    if (softbox.current) softbox.current.lookAt(0, 0.92, 0);
    if (floorDot.current) {
      floorDot.current.position.set(x, 0.012, z);
      const glowMat = floorDot.current.children[0]?.material;
      if (glowMat) glowMat.opacity = 0.4 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  const keyColor = rig.key[0];

  return (
    <group visible={active}>
      {/* softbox wireframe + glowing orb (draggable) */}
      <group ref={orb}>
        <sprite scale={[1.65, 1.65, 1]}>
          <spriteMaterial
            map={glow}
            color={rigIndex === 1 ? cyan : gold}
            transparent
            opacity={0.42}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
        <sprite scale={[0.72, 0.72, 1]}>
          <spriteMaterial
            map={glow}
            color={keyColor}
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
        <mesh onPointerDown={startDrag}>
          <sphereGeometry args={[0.085, 20, 20]} />
          <meshBasicMaterial color={keyColor} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0]} scale={1.5}>
          <sphereGeometry args={[0.085, 16, 16]} />
          <meshBasicMaterial color={keyColor} wireframe transparent opacity={0.3} toneMapped={false} />
        </mesh>
        <group ref={softbox} position={[0, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.62, 0.62, 0.1]} />
            <meshBasicMaterial color={keyColor} wireframe transparent opacity={0.36} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, -0.07]}>
            <planeGeometry args={[0.55, 0.55]} />
            <meshBasicMaterial
              color={keyColor}
              transparent
              opacity={0.09}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 0, 0.09]}>
            <planeGeometry args={[0.3, 0.004]} />
            <meshBasicMaterial color={keyColor} transparent opacity={0.8} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, 0.09]}>
            <planeGeometry args={[0.004, 0.3]} />
            <meshBasicMaterial color={keyColor} transparent opacity={0.8} toneMapped={false} />
          </mesh>
        </group>
        <pointLight
          color={rig.key[1]}
          intensity={rigIndex === 2 ? 46 : rigIndex === 1 ? 30 : 24}
          distance={8}
          decay={2}
        />
        <pointLight color="#fff6e6" intensity={4} distance={3} decay={2} />
      </group>

      {/* floor marker under the moving light */}
      <group ref={floorDot} position={[0, 0.012, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.09, 32]} />
          <meshBasicMaterial
            map={glow}
            color={keyColor}
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.14, 0.148, 40]} />
          <meshBasicMaterial color={keyColor} transparent opacity={0.45} toneMapped={false} />
        </mesh>
      </group>

      {/* orbit guide */}
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.01, radius + 0.006, 96]} />
        <meshBasicMaterial color={cyan} transparent opacity={0.12} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <DashRing
        radius={radius}
        color={keyColor}
        opacity={0.24}
        dashSize={0.025}
        gapSize={0.16}
        segments={120}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
      />
      <mesh
        ref={groundMarker}
        position={[0, 0.004, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.01, 0.02, 16]} />
        <meshBasicMaterial color={gold} transparent opacity={0.5} toneMapped={false} />
      </mesh>

      {/* subtle primary key/fill lights are what you actually see update on the product */}
      <directionalLight
        ref={fillLight}
        position={[0, 4, 4]}
        intensity={env.dark ? 1.1 : 1.7}
        color={rig.fill}
      />
    </group>
  );
}

/* ================================================================================================
 * 08 — Stage 5: batch grid (one InstancedMesh, one atlas, injected UVs)
 * ================================================================================================ */

const BATCH_COLS = 6;
const BATCH_ROWS = 4;
const BATCH_COUNT = BATCH_COLS * BATCH_ROWS;

function BatchGrid({ assets, gold, cyan, startedAtRef, onHover, onHoverEnd }) {
  const { size } = useThree();
  const narrow = size.width / Math.max(1, size.height) < 0.95;
  const meshRef = useRef();
  const groupRef = useRef();
  const materialRef = useRef();
  const scanRef = useRef();
  const reveal = useRef(0);
  const hovered = useRef(-1);
  const [hoveredId, setHoveredId] = useState(-1);
  const uniforms = useRef({
    uProgress: { value: 0 },
    uHover: { value: -1 },
  });
  const cells = useMemo(
    () => Float32Array.from(
      Array.from({ length: BATCH_COUNT }, (_, i) => {
        const c = i % BATCH_COLS;
        const r = Math.floor(i / BATCH_COLS);
        return [c / BATCH_COLS, (BATCH_ROWS - 1 - r) / BATCH_ROWS];
      }).flat()
    ),
    []
  );

  const writeMatrix = useCallback((i, lifted) => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    const c = i % BATCH_COLS;
    const r = Math.floor(i / BATCH_COLS);
    dummy.position.set(
      (c - (BATCH_COLS - 1) / 2) * 0.66,
      ((BATCH_ROWS - 1) / 2 - r) * 0.535,
      lifted ? 0.13 : 0
    );
    dummy.scale.setScalar(lifted ? 1.07 : 1);
    dummy.updateMatrix();
    meshRef.current.setMatrixAt(i, dummy.matrix);
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.geometry.setAttribute("aCell", new THREE.InstancedBufferAttribute(cells, 2));
    for (let i = 0; i < BATCH_COUNT; i++) writeMatrix(i, false);
    mesh.instanceMatrix.needsUpdate = true;
  }, [cells, writeMatrix]);

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    material.map = assets.atlasTexture;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uProgress = uniforms.current.uProgress;
      shader.uniforms.uHover = uniforms.current.uHover;
      shader.vertexShader = `attribute vec2 aCell;\nvarying vec2 vCell;\n${shader.vertexShader}`.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\n  vCell = aCell;"
      );
      shader.fragmentShader = `uniform float uProgress;\nvarying vec2 vCell;\n${shader.fragmentShader}`.replace(
        "#include <map_fragment>",
        `
        vec2 cellOrigin = vCell;
        vec2 cellSize = vec2(1.0 / 6.0, 1.0 / 4.0);
        vec2 rawUv = cellOrigin + vec2(vMapUv.x * cellSize.x, cellSize.y * 0.5 + vMapUv.y * cellSize.y * 0.5);
        vec2 polUv = cellOrigin + vec2(vMapUv.x * cellSize.x, vMapUv.y * cellSize.y * 0.5);
        vec3 rawCol = texture2D(map, rawUv).rgb;
        vec3 polCol = texture2D(map, polUv).rgb;
        float wave = uProgress * 1.95 - (vCell.x * 1.5 + (1.0 - vCell.y) * 0.55);
        float done = smoothstep(-0.12, 0.28, wave);
        vec4 sampledDiffuseColor = vec4(mix(rawCol, polCol, done), 1.0);
        diffuseColor *= sampledDiffuseColor;
        float scanning = smoothstep(0.22, 0.0, abs(wave - 0.06)) * step(0.015, uProgress) * (1.0 - step(0.985, uProgress));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.78, 0.91), scanning * 0.45);
        diffuseColor.rgb += vec3(0.96, 0.77, 0.32) * step(0.985, wave) * 0.035;
        `
      );
    };
    material.customProgramCacheKey = () => "eklakshya-batch-atlas";
    material.needsUpdate = true;
  }, [assets]);

  useEffect(() => {
    for (let i = 0; i < BATCH_COUNT; i++) writeMatrix(i, i === hoveredId);
  }, [hoveredId, writeMatrix]);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.06);
    reveal.current = clamp(reveal.current + dt / 0.7);
    const elapsed = (performance.now() - startedAtRef) / 1000;
    const progress = clamp((elapsed - 0.3) / 3.15);
    uniforms.current.uProgress.value = progress;
    if (groupRef.current) {
      groupRef.current.position.z = lerp(-1.6, 0, easeOut(reveal.current));
      groupRef.current.position.y = lerp(1.72, 1.44, easeOut(reveal.current));
      groupRef.current.scale.setScalar((narrow ? 0.72 : 1) * lerp(0.88, 1, easeOut(reveal.current)));
      groupRef.current.rotation.y = lerp(-0.35, -0.1, easeOut(reveal.current));
      groupRef.current.rotation.x = -0.2;
    }
    if (scanRef.current) {
      scanRef.current.position.x = lerp(-2.05, 2.05, easeInOut(progress));
      scanRef.current.position.y = Math.sin(clock.elapsedTime * 1.1) * 0.1;
      scanRef.current.visible = progress > 0 && progress < 0.995;
      scanRef.current.material.opacity = 0.34;
    }
  });

  const infoFor = (index) => {
    if (index < 0) return null;
    const env = ENVIRONMENTS[(index * 5 + 2) % ENVIRONMENTS.length];
    const product = PRODUCTS[index % 3];
    return { name: env.name, tag: env.tag, product: PRODUCT_LABELS[product] };
  };

  return (
    <group ref={groupRef} position={[0, 1.32, 0]}>
      <mesh position={[0, 0, -0.06]}>
        <planeGeometry args={[4.28, 2.55]} />
        <meshBasicMaterial color="#0d0b08" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, BATCH_COUNT]}
        frustumCulled={false}
        onPointerMove={(e) => {
          e.stopPropagation();
          const id = e.instanceId;
          if (typeof id !== "number") return;
          if (hovered.current !== id) {
            hovered.current = id;
            uniforms.current.uHover.value = id;
            setHoveredId(id);
            onHover?.(infoFor(id), id);
          }
        }}
        onPointerOut={() => {
          hovered.current = -1;
          uniforms.current.uHover.value = -1;
          setHoveredId(-1);
          onHoverEnd?.();
        }}
      >
        <planeGeometry args={[0.58, 0.44]} />
        <meshBasicMaterial ref={materialRef} toneMapped={false} transparent />
      </instancedMesh>

      {/* frame lines */}
      {[[0, 1.08, 4.02], [0, -1.08, 4.02], [-2.02, 0, 2.18], [2.02, 0, 2.18]].map(
        ([x, y, w], i) => (
          <mesh key={i} position={[x, y, -0.02]}>
            <planeGeometry args={i < 2 ? [w, 0.005] : [0.005, w]} />
            <meshBasicMaterial color={gold} transparent opacity={0.38} toneMapped={false} />
          </mesh>
        )
      )}
      <mesh position={[0, 1.25, -0.03]}>
        <planeGeometry args={[4.04, 0.006]} />
        <meshBasicMaterial color={cyan} transparent opacity={0.22} toneMapped={false} />
      </mesh>

      {/* processing wave */}
      <mesh ref={scanRef} position={[0, 0, 0.04]} scale={[1, 4.4, 1]}>
        <planeGeometry args={[0.035, 1]} />
        <meshBasicMaterial
          color={cyan}
          transparent
          opacity={0.38}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* ================================================================================================
 * 09 — Stage 6: 4K / 8K export frame
 * ================================================================================================ */

function DashedRect({ w, h, color, opacity = 0.5 }) {
  const ref = useRef();
  const points = useMemo(
    () => [
      new THREE.Vector3(-w / 2, -h / 2, 0),
      new THREE.Vector3(w / 2, -h / 2, 0),
      new THREE.Vector3(w / 2, h / 2, 0),
      new THREE.Vector3(-w / 2, h / 2, 0),
      new THREE.Vector3(-w / 2, -h / 2, 0),
    ],
    [w, h]
  );
  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.geometry.setFromPoints(points);
      ref.current.computeLineDistances();
    }
  }, [points]);
  return (
    <line ref={ref}>
      <bufferGeometry />
      <lineDashedMaterial
        color={color}
        transparent
        opacity={opacity}
        dashSize={0.05}
        gapSize={0.055}
        depthWrite={false}
        toneMapped={false}
      />
    </line>
  );
}

function ExportStage({ assets, product, resolution, gold, cyan }) {
  const { size } = useThree();
  const narrow = size.width / Math.max(1, size.height) < 0.95;
  const groupRef = useRef();
  const reveal = useRef(0);
  const gridMat = useRef();
  const sweep = useRef();
  const glow = useGlowTexture();

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.06);
    reveal.current = clamp(reveal.current + dt / 0.7);
    if (groupRef.current) {
      groupRef.current.position.z = lerp(-1.9, 0, easeOut(reveal.current));
      groupRef.current.position.y = 1.42;
      const s = (narrow ? 0.76 : 0.94) * lerp(0.9, 1, easeOut(reveal.current)) * (1 + resolution * 0.018);
      groupRef.current.scale.setScalar(s);
      groupRef.current.rotation.y = lerp(-0.34, -0.08, easeOut(reveal.current));
      groupRef.current.rotation.x = 0.02;
    }
    if (gridMat.current) {
      const target = [0.28, 0.11, 0.035][resolution];
      gridMat.current.opacity = lerp(gridMat.current.opacity, target, 1 - Math.exp(-dt * 5));
    }
    if (sweep.current) {
      const cycle = (clock.elapsedTime * 0.42) % 1;
      sweep.current.position.x = lerp(-0.98, 1.02, easeInOut(cycle));
      sweep.current.material.opacity = Math.sin(cycle * Math.PI) * 0.55;
      sweep.current.visible = reveal.current > 0.5;
    }
  });

  const W = 2.06;
  const H = 2.58;

  return (
    <group ref={groupRef}>
      <group>
        <mesh position={[0.06, -0.06, -0.08]}>
          <planeGeometry args={[W + 0.28, H + 0.28]} />
          <meshBasicMaterial color="#050403" transparent opacity={0.65} />
        </mesh>
        <RoundedBox args={[W + 0.13, H + 0.13, 0.07]} radius={0.035} smoothness={3}>
          <meshBasicMaterial color={gold} toneMapped={false} />
        </RoundedBox>
        <mesh position={[0, 0, 0.042]}>
          <planeGeometry args={[W + 0.02, H + 0.02]} />
          <meshBasicMaterial color="#0b0907" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.052]}>
          <planeGeometry args={[W, H]} />
          <meshBasicMaterial map={assets.shots[product]} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.058]}>
          <planeGeometry args={[W, H]} />
          <meshBasicMaterial
            ref={gridMat}
            map={assets.pixelTexture}
            transparent
            opacity={0.28}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={sweep} position={[0, 0, 0.062]} scale={[1, H / 2.3, 1]}>
          <planeGeometry args={[0.18, 1]} />
          <meshBasicMaterial
            map={glow}
            color={cyan}
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        {[[0, H / 2, W, 0.002], [0, -H / 2, W, 0.002], [-W / 2, 0, 0.002, H], [W / 2, 0, 0.002, H]].map(
          ([x, y, w, h], i) => (
            <mesh key={i} position={[x, y, 0.065]}>
              <planeGeometry args={[w, h]} />
              <meshBasicMaterial color="#f7e2b0" transparent opacity={0.55} toneMapped={false} />
            </mesh>
          )
        )}
        {[
          [-W / 2 - 0.11, H / 2 + 0.11, 1, 1], [W / 2 + 0.11, H / 2 + 0.11, -1, 1],
          [-W / 2 - 0.11, -H / 2 - 0.11, 1, -1], [W / 2 + 0.11, -H / 2 - 0.11, -1, -1],
        ].map(([x, y, sx, sy], i) => (
          <group key={i} position={[x, y, 0.05]}>
            <mesh position={[(sx * 0.12) / 2, 0, 0]}>
              <planeGeometry args={[0.12, 0.004]} />
              <meshBasicMaterial color={gold} transparent opacity={0.8} toneMapped={false} />
            </mesh>
            <mesh position={[0, (sy * 0.12) / 2, 0]}>
              <planeGeometry args={[0.004, 0.12]} />
              <meshBasicMaterial color={gold} transparent opacity={0.8} toneMapped={false} />
            </mesh>
          </group>
        ))}
        <group position={[0, 0, -0.05]}>
          <DashedRect w={W + 0.46} h={H + 0.46} color={gold} opacity={0.35} />
        </group>
        <mesh position={[W / 2 + 0.02, -H / 2 - 0.06, 0.06]} rotation={[0, 0, Math.PI / 4]}>
          <planeGeometry args={[0.06, 0.06]} />
          <meshBasicMaterial color={cyan} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/* ================================================================================================
 * 10 — Camera rig: orbit with soft return-to-default, no zoom / pan
 * ================================================================================================ */

function CameraRig({ enableRotate, stage, onInteract }) {
  const controlsRef = useRef();
  const { camera, size } = useThree();
  const target = useMemo(() => new THREE.Vector3(0, 1.0, 0), []);
  const interacting = useRef(false);
  const lastInteraction = useRef(0);
  const spherical = useMemo(() => new THREE.Spherical(), []);
  const offset = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const onStart = () => {
      interacting.current = true;
      lastInteraction.current = performance.now();
      onInteract?.();
    };
    const onEnd = () => {
      interacting.current = false;
      lastInteraction.current = performance.now();
    };
    controls.addEventListener("start", onStart);
    controls.addEventListener("end", onEnd);
    return () => {
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
    };
  }, [onInteract]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.target.lerp(target, 1 - Math.exp(-delta * 5));
    const idle = !interacting.current && performance.now() - lastInteraction.current > 1500;
    if (!idle) return;
    const aspect = size.width / Math.max(1, size.height);
    const baseDist = aspect < 0.8 ? 10.2 : aspect < 1.05 ? 9.2 : 8.05;
    offset.copy(camera.position).sub(target);
    spherical.setFromVector3(offset);
    spherical.set(
      lerp(spherical.radius, baseDist, 1 - Math.exp(-delta * 1.8)),
      clamp(lerp(spherical.phi, 1.31, 1 - Math.exp(-delta * 1.8)), 0.9, 1.6),
      lerp(spherical.theta, 0.2, 1 - Math.exp(-delta * 1.8))
    );
    offset.setFromSpherical(spherical);
    camera.position.copy(target).add(offset);
    camera.lookAt(target);
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={enableRotate && stage < 4}
      enableRotate={enableRotate && stage < 4}
      enableZoom={false}
      enablePan={false}
      enableDamping
      dampingFactor={0.075}
      rotateSpeed={0.5}
      minPolarAngle={0.9}
      maxPolarAngle={1.62}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.NONE }}
    />
  );
}

/* ================================================================================================
 * 11 — The scene itself
 * ================================================================================================ */

function StudioScene({
  stage, envIndex, rigIndex, product, resolution, assets, gold, cyan, enableRotate,
  startedAtRef, onEnvHover, onEnvHoverEnd, onEnvSelect, onThumbHover, onThumbHoverEnd,
  onInteract,
}) {
  const parallax = useRef();
  const env = ENVIRONMENTS[envIndex];
  const rig = LIGHT_RIGS[rigIndex];

  useFrame(({ pointer }, delta) => {
    if (!parallax.current) return;
    const damp = 1 - Math.exp(-Math.min(delta, 0.05) * 2.2);
    parallax.current.rotation.y = lerp(parallax.current.rotation.y, pointer.x * 0.038, damp);
    parallax.current.rotation.x = lerp(parallax.current.rotation.x, -pointer.y * 0.022, damp);
  });

  return (
    <>
      <ambientLight intensity={stage <= 1 ? 0.2 : 0.3} />
      <directionalLight
        position={[3.5, 5, 4]}
        intensity={stage <= 1 ? 0.75 : 1.2}
        color={stage <= 1 ? "#cabfa8" : "#fff3dc"}
      />
      <directionalLight position={[-4, 2, 2]} intensity={0.42} color={cyan} />
      <StudioEnvironment env={env} rig={rig} />

      <group ref={parallax}>
        <StageBackdrop envIndex={envIndex} assets={assets} visible={stage === 2 || stage === 3} />
        <Turntable gold={gold} cyan={cyan} visible={stage === 2 || stage === 3} />
        <GoldDiamonds gold={gold} count={8} />
        <HeroProduct key={product} type={product} stage={stage} assets={assets} gold={gold} cyan={cyan} />
        {stage <= 1 && (
          <ReferenceSequence
            stage={stage}
            startedAtRef={startedAtRef}
            product={product}
            assets={assets}
            gold={gold}
            cyan={cyan}
          />
        )}
        {stage === 2 && (
          <EnvironmentCarousel
            active={stage === 2}
            envIndex={envIndex}
            assets={assets}
            gold={gold}
            cyan={cyan}
            onSelect={onEnvSelect}
            onHover={onEnvHover}
            onHoverEnd={onEnvHoverEnd}
          />
        )}
        {stage === 3 && (
          <LightRig
            active={stage === 3}
            env={env}
            rigIndex={rigIndex}
            gold={gold}
            cyan={cyan}
            onInteract={onInteract}
          />
        )}
        {stage === 4 && (
          <BatchGrid
            assets={assets}
            gold={gold}
            cyan={cyan}
            startedAtRef={startedAtRef}
            onHover={onThumbHover}
            onHoverEnd={onThumbHoverEnd}
          />
        )}
        {stage === 5 && (
          <ExportStage
            assets={assets}
            product={product}
            resolution={resolution}
            gold={gold}
            cyan={cyan}
          />
        )}
      </group>

      <CameraRig enableRotate={enableRotate} stage={stage} onInteract={onInteract} />
    </>
  );
}


const STAGE_MS = 4600;
const initialState = { stage: 0, envIndex: 3, rigIndex: 0, product: 'bottle', resolution: 1, playing: true };
function sceneReducer(state, action) {
  switch (action.type) {
    case 'advance': return { ...state, stage: (state.stage + 1) % STAGES.length };
    case 'stage': return { ...state, stage: action.stage, playing: false };
    case 'environment': return { ...state, envIndex: action.index, playing: false };
    case 'cycleEnvironment': return { ...state, envIndex: (state.envIndex + 1) % ENVIRONMENTS.length };
    case 'cycleRig': return { ...state, rigIndex: (state.rigIndex + 1) % LIGHT_RIGS.length };
    case 'cycleResolution': return { ...state, resolution: (state.resolution + 1) % RESOLUTIONS.length };
    case 'product': return { ...state, product: PRODUCTS[(PRODUCTS.indexOf(state.product) + 1) % PRODUCTS.length] };
    case 'pause': return { ...state, playing: false };
    case 'toggle': return { ...state, playing: !state.playing };
    case 'resume': return { ...state, playing: true };
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
const ignoreHover = () => {};

export default function ImageGenScene({ light = false, renderActive = true }) {
  const [state, dispatch] = useReducer(sceneReducer, initialState);
  const coarse = useSyncExternalStore(subscribePreferences, getCoarseSnapshot, getServerSnapshot);
  const reduced = useSyncExternalStore(subscribePreferences, getReducedSnapshot, getServerSnapshot);
  const startedAtRef = useRef(0);
  const gold = light ? '#b87d14' : '#f5c451';
  const cyan = light ? '#0077b6' : '#6cc7e8';
  const assets = useSceneAssets(gold);
  const hadAssets = useRef(false);

  useLayoutEffect(() => { startedAtRef.current = performance.now(); }, [state.stage]);
  useLayoutEffect(() => {
    if (assets && !hadAssets.current) {
      hadAssets.current = true;
      startedAtRef.current = performance.now();
    }
  }, [assets]);
  useEffect(() => {
    if (!assets || !renderActive) return;
    if (!state.playing || reduced) return;
    const id = window.setTimeout(() => dispatch({ type: 'advance' }), STAGE_MS);
    return () => window.clearTimeout(id);
  }, [state.stage, state.playing, reduced, renderActive, assets]);

  useEffect(() => {
    if (!assets || !renderActive) return;
    if (!state.playing || reduced || ![2, 3, 5].includes(state.stage)) return;
    const type = state.stage === 2 ? 'cycleEnvironment' : state.stage === 3 ? 'cycleRig' : 'cycleResolution';
    const id = window.setInterval(() => dispatch({ type }), 1400);
    return () => window.clearInterval(id);
  }, [state.stage, state.playing, reduced, renderActive, assets]);

  const selectEnvironment = useCallback((index) => dispatch({ type: 'environment', index }), []);
  const pause = useCallback(() => dispatch({ type: 'pause' }), []);

  if (!assets) return null;

  return (
    <div
      className="absolute inset-0"
      tabIndex={0}
      role="region"
      aria-label="Interactive image generation visualization"
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
        } else if (event.key.toLowerCase() === 'p') {
          dispatch({ type: 'product' });
        } else if (event.key === 'Escape') {
          dispatch({ type: 'resume' });
        }
      }}
    >
      <ScenePreparation name="image">
        {(onPrepared) => (
          <Canvas
            frameloop={renderActive ? "always" : "demand"}
            dpr={servicePixelRatio(renderActive)}
            gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
            camera={{ position: [0.35, 1.86, 9.2], fov: 34, near: 0.1, far: 60 }}
            flat
            style={{ position: 'absolute', inset: 0, background: 'transparent', touchAction: coarse ? 'pan-y' : 'none' }}
            resize={{ scroll: false, debounce: { scroll: 50, resize: 80 } }}
          >
            <SceneViewport fov={34} />
            <React.Suspense fallback={null}>
              <StudioScene
                stage={state.stage} envIndex={state.envIndex} rigIndex={state.rigIndex}
                product={state.product} resolution={state.resolution} assets={assets}
                gold={gold} cyan={cyan} enableRotate startedAtRef={startedAtRef}
                onEnvHover={ignoreHover} onEnvHoverEnd={ignoreHover} onEnvSelect={selectEnvironment}
                onThumbHover={ignoreHover} onThumbHoverEnd={ignoreHover} onInteract={pause}
              />
            </React.Suspense>
            <SceneCompilation />
            <SceneWarmup onRendered={onPrepared} />
          </Canvas>
        )}
      </ScenePreparation>
    </div>
  );
}
