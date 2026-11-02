// -----------------------------------------------------------------------------
// EKLAKSHYA · procedural catalogue artwork
// Every page is drawn at runtime on a high-resolution canvas. No external assets.
// -----------------------------------------------------------------------------
import * as THREE from 'three';

export const PAGE_W_PX = 1024;
export const PAGE_H_PX = 1400;

// Card geometry shared by the renderer and the 3D hit-tester.
export const GRID_CARDS = {
  w: 428,
  h: 352,
  xs: [66, 560],
  ys: [154, 532, 910]
};

const INK = '#1c1813';
const SOFT = '#5c5346';
const FAINT = '#8f8574';
const RULE = 'rgba(28,24,19,0.14)';
const PAPER = '#f4efe6';
const GOLD_INK = '#a17c2a';
const CYAN_INK = '#0f7c93';

// -----------------------------------------------------------------------------
// small helpers
// -----------------------------------------------------------------------------
const sc = (ctx, size, weight = '400', family = '"Plus Jakarta Sans", sans-serif') => {
  ctx.font = `${weight} ${size}px ${family}`;
};

function tracked(ctx, text, x, y, spacing = 2, align = 'left') {
  const chars = [...String(text)];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    ctx.fillText(c, cx, y);
    cx += widths[i] + spacing;
  });
  ctx.textAlign = prev;
}

function hairline(ctx, x1, y, x2, alpha = 0.14) {
  ctx.strokeStyle = `rgba(28,24,19,${alpha})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
}

function rounded(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Reusable grain pattern (generated once, low cost)
let grainPattern = null;
function getGrain(ctx) {
  if (grainPattern) return grainPattern;
  const c = document.createElement('canvas');
  c.width = 180;
  c.height = 180;
  const g = c.getContext('2d');
  for (let i = 0; i < 2600; i++) {
    const a = Math.random() * 0.055;
    g.fillStyle = Math.random() > 0.5 ? `rgba(60,48,32,${a})` : `rgba(255,255,255,${a})`;
    g.fillRect(Math.random() * 180, Math.random() * 180, 1, 1);
  }
  grainPattern = ctx.createPattern(c, 'repeat');
  return grainPattern;
}

function paperBase(ctx, pageIndex, gold, cyan) {
  // Verso pages are mirrored for the 3D leaf. If the mirrored artwork shows
  // clipped headings, the page content is drawn with a wider left margin.

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, PAGE_W_PX, PAGE_H_PX);

  const light = ctx.createRadialGradient(500, 560, 60, 512, 700, 900);
  light.addColorStop(0, 'rgba(255,255,255,0.65)');
  light.addColorStop(0.55, 'rgba(255,255,255,0.12)');
  light.addColorStop(1, 'rgba(205,191,168,0.28)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, PAGE_W_PX, PAGE_H_PX);

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = getGrain(ctx);
  ctx.fillRect(0, 0, PAGE_W_PX, PAGE_H_PX);
  ctx.restore();

  // Spine gutter (verso = odd page → gutter right)
  const gutterRight = pageIndex % 2 === 1;
  const gx = gutterRight ? PAGE_W_PX - 96 : 0;
  const grad = ctx.createLinearGradient(gutterRight ? PAGE_W_PX : 0, 0, gutterRight ? PAGE_W_PX - 96 : 96, 0);
  grad.addColorStop(0, 'rgba(48,35,18,0.20)');
  grad.addColorStop(1, 'rgba(48,35,18,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(gx, 0, 96, PAGE_H_PX);

  // Outer paper edge highlight
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(gutterRight ? 0 : PAGE_W_PX - 3, 0, 3, PAGE_H_PX);

  // Hairline frames
  ctx.strokeStyle = RULE;
  ctx.lineWidth = 1;
  ctx.strokeRect(52.5, 52.5, PAGE_W_PX - 105, PAGE_H_PX - 105);

  // Corner registration ticks
  ctx.strokeStyle = gold;
  ctx.lineWidth = 1.4;
  const tick = (x, y, dx, dy) => {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * 18);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * 18, y);
    ctx.stroke();
  };
  tick(64, 64, 1, 1);
  tick(PAGE_W_PX - 64, 64, -1, 1);
  tick(64, PAGE_H_PX - 64, 1, -1);
  tick(PAGE_W_PX - 64, PAGE_H_PX - 64, -1, -1);
}

function folio(ctx, pageIndex, gold, cyan) {
  const isVerso = pageIndex % 2 === 1;
  const outer = isVerso ? 72 : PAGE_W_PX - 72;
  const inner = isVerso ? PAGE_W_PX - 72 : 72;

  ctx.textBaseline = 'alphabetic';
  sc(ctx, 13, '500', '"JetBrains Mono", monospace');
  ctx.fillStyle = FAINT;
  ctx.textAlign = isVerso ? 'left' : 'right';
  ctx.fillText('EKLAKSHYA · CATALOGUE 2026', outer, 104);

  ctx.textAlign = isVerso ? 'right' : 'left';
  ctx.fillStyle = SOFT;
  ctx.fillText(`PAGE ${String(pageIndex).padStart(2, '0')}`, inner, 104);

  hairline(ctx, 72, 122, PAGE_W_PX - 72, 0.18);

  ctx.fillStyle = gold;
  ctx.fillRect(isVerso ? 68 : PAGE_W_PX - 74, 99, 6, 6);
  ctx.fillStyle = cyan;
  ctx.fillRect(isVerso ? 78 : PAGE_W_PX - 84, 99, 3, 6);
}

// -----------------------------------------------------------------------------
// vector product illustrations
// -----------------------------------------------------------------------------
export function drawProductGraphic(ctx, type, x, y, w, h, gold = '#f5c451', cyan = '#6cc7e8') {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.translate(x + w / 2, y + h / 2);

  const artGold = '#b8954b';
  const artCyan = '#4b9fb3';
  const artInk = '#29241d';

  // blueprint grid
  ctx.strokeStyle = 'rgba(75,159,179,0.13)';
  ctx.lineWidth = 1;
  const g = 26;
  for (let gx = -w / 2; gx < w / 2; gx += g) {
    ctx.beginPath(); ctx.moveTo(gx, -h / 2); ctx.lineTo(gx, h / 2); ctx.stroke();
  }
  for (let gy = -h / 2; gy < h / 2; gy += g) {
    ctx.beginPath(); ctx.moveTo(-w / 2, gy); ctx.lineTo(w / 2, gy); ctx.stroke();
  }

  // oversized ghost number
  ctx.font = '700 190px "Space Grotesk", sans-serif';
  ctx.fillStyle = 'rgba(28,24,19,0.035)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('26', 0, 6);

  const s = Math.min(w / 420, h / 300);
  ctx.scale(s, s);

  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = artInk;
  ctx.fillStyle = '#ded5c5';

  if (type === 'linear-pendant') {
    ctx.fillStyle = artInk;
    ctx.fillRect(-46, -112, 92, 7);
    ctx.strokeStyle = 'rgba(41,36,29,0.45)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-34, -105); ctx.lineTo(-34, -18);
    ctx.moveTo(34, -105); ctx.lineTo(34, -18);
    ctx.stroke();
    ctx.fillStyle = artGold;
    rounded(ctx, -96, -18, 192, 20, 8);
    ctx.fill();
    ctx.strokeStyle = artInk;
    ctx.stroke();
    const glow = ctx.createLinearGradient(0, 2, 0, 30);
    glow.addColorStop(0, 'rgba(255,246,215,0.95)');
    glow.addColorStop(1, 'rgba(255,246,215,0.25)');
    ctx.fillStyle = glow;
    rounded(ctx, -90, 3, 180, 24, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(184,149,75,0.13)';
    ctx.beginPath();
    ctx.moveTo(-90, 27); ctx.lineTo(-178, 120);
    ctx.lineTo(178, 120); ctx.lineTo(90, 27);
    ctx.closePath(); ctx.fill();
  } else if (type === 'chandelier') {
    ctx.strokeStyle = 'rgba(41,36,29,0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -128); ctx.lineTo(0, -58);
    ctx.moveTo(-84, -56); ctx.lineTo(84, -56);
    ctx.stroke();
    ctx.strokeStyle = artGold;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(0, -42, 112, 32, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = artInk;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, -6, 72, 22, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(41,36,29,0.4)';
    ctx.lineWidth = 1;
    [-84, -42, 0, 42, 84].forEach((gx) => {
      ctx.beginPath(); ctx.moveTo(gx, -56); ctx.lineTo(gx, -42); ctx.stroke();
    });
    [-92, -46, 0, 46, 92].forEach((gx, i) => {
      const gy = -6 + (i % 2 === 0 ? 10 : 26);
      ctx.beginPath();
      ctx.arc(gx, gy, 12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,250,235,0.95)';
      ctx.fill();
      ctx.strokeStyle = artCyan;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(41,36,29,0.18)';
      ctx.beginPath(); ctx.moveTo(0, -58); ctx.lineTo(gx, gy - 12); ctx.stroke();
    });
  } else if (type === 'spotlight') {
    ctx.fillStyle = artInk;
    rounded(ctx, -56, -104, 112, 13, 3);
    ctx.fill();
    ctx.fillStyle = artGold;
    ctx.beginPath(); ctx.arc(0, -76, 12, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.rotate(0.32);
    ctx.fillStyle = '#3b352d';
    rounded(ctx, -26, -64, 52, 92, 9);
    ctx.fill();
    ctx.strokeStyle = artGold;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,250,232,0.95)';
    ctx.beginPath(); ctx.ellipse(0, 30, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = artCyan;
    ctx.stroke();
    ctx.fillStyle = 'rgba(184,149,75,0.16)';
    ctx.beginPath();
    ctx.moveTo(-24, 34); ctx.lineTo(-72, 116);
    ctx.lineTo(72, 116); ctx.lineTo(24, 34);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  } else if (type === 'sconce') {
    ctx.fillStyle = artInk;
    rounded(ctx, -18, -104, 36, 208, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,250,238,0.94)';
    rounded(ctx, -34, -88, 68, 176, 8);
    ctx.fill();
    ctx.strokeStyle = artInk;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(75,159,179,0.55)';
    ctx.lineWidth = 1.6;
    for (let lx = -24; lx <= 24; lx += 8) {
      ctx.beginPath(); ctx.moveTo(lx, -84); ctx.lineTo(lx, 84); ctx.stroke();
    }
    ctx.strokeStyle = artGold;
    ctx.lineWidth = 2;
    ctx.strokeRect(-34, -88, 68, 176);
  } else if (type === 'lever') {
    ctx.fillStyle = '#ded5c5';
    ctx.strokeStyle = artInk;
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(-52, 0, 48, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = artCyan;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(-52, 0, 38, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = artGold;
    ctx.beginPath(); ctx.arc(-52, 0, 20, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = artInk;
    ctx.stroke();
    rounded(ctx, -52, -12, 166, 24, 12);
    ctx.fillStyle = artGold;
    ctx.fill();
    ctx.strokeStyle = artInk;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(28,24,19,0.32)';
    ctx.lineWidth = 1.1;
    for (let k = 8; k < 96; k += 5) {
      ctx.beginPath(); ctx.moveTo(k, -11); ctx.lineTo(k + 6, 11); ctx.stroke();
    }
  } else if (type === 'handle' || type === 'pull') {
    const vertical = type === 'pull';
    ctx.save();
    if (vertical) ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#3b352d';
    rounded(ctx, -34, -76, 68, 152, 9);
    ctx.fill();
    ctx.strokeStyle = artGold;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#171411';
    rounded(ctx, -18, -58, 36, 116, 5);
    ctx.fill();
    ctx.strokeStyle = artCyan;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    if (vertical) {
      ctx.fillStyle = 'rgba(184,149,75,0.2)';
      ctx.fillRect(-2, -26, 4, 52);
    }
  } else if (type === 'knob') {
    ctx.fillStyle = artGold;
    ctx.strokeStyle = artInk;
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(0, 0, 62, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.arc(-18, -18, 34, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = artCyan;
    ctx.lineWidth = 1.2;
    for (let r = 14; r <= 54; r += 10) {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    }
  } else if (type === 'lock') {
    ctx.fillStyle = '#3b352d';
    rounded(ctx, -30, -100, 60, 200, 8);
    ctx.fill();
    ctx.strokeStyle = artGold;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = artGold;
    ctx.beginPath(); ctx.arc(0, -54, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = artInk;
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = artInk;
    rounded(ctx, -6, -6, 12, 48, 6); ctx.fill();
  } else if (type === 'acoustic') {
    ctx.fillStyle = '#26221e';
    ctx.fillRect(-150, -100, 300, 200);
    for (let sx = -146; sx < 146; sx += 26) {
      const grad = ctx.createLinearGradient(sx, 0, sx + 17, 0);
      grad.addColorStop(0, '#c8a878');
      grad.addColorStop(0.5, '#e0c397');
      grad.addColorStop(1, '#a98557');
      ctx.fillStyle = grad;
      ctx.fillRect(sx, -95, 17, 190);
      ctx.strokeStyle = 'rgba(28,24,19,0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, -95, 17, 190);
    }
  } else if (type === 'tile') {
    for (let t = 0; t < 3; t++) {
      ctx.save();
      ctx.translate(-88 + t * 88, 0);
      const grad = ctx.createLinearGradient(-40, -40, 40, 40);
      grad.addColorStop(0, '#8c9c8a');
      grad.addColorStop(0.5, '#5f7368');
      grad.addColorStop(1, '#b9a67a');
      ctx.fillStyle = grad;
      rounded(ctx, -40, -78, 80, 156, 4);
      ctx.fill();
      ctx.strokeStyle = artInk;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      for (let q = -3; q <= 3; q++) {
        ctx.beginPath();
        ctx.moveTo(-38, q * 22);
        ctx.bezierCurveTo(-10, q * 22 - 9, 10, q * 22 + 9, 38, q * 22);
        ctx.stroke();
      }
      ctx.restore();
    }
  } else if (type === 'disc') {
    ctx.fillStyle = '#f3ead8';
    ctx.strokeStyle = artInk;
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.ellipse(0, 6, 122, 122, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,252,240,0.98)';
    ctx.beginPath(); ctx.ellipse(0, 6, 104, 104, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = artGold;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(0, 6, 112, 112, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = artCyan;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, 6, 88, 88, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(184,149,75,0.14)';
    ctx.beginPath(); ctx.arc(0, 6, 80, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = artGold;
    rounded(ctx, -62, -62, 124, 124, 6);
    ctx.fill();
    ctx.strokeStyle = artInk;
    ctx.stroke();
    ctx.strokeStyle = artCyan;
    ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.stroke();
  }

  // dimension line
  ctx.strokeStyle = artCyan;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 22, h / 2 - 18);
  ctx.lineTo(w / 2 - 22, h / 2 - 18);
  ctx.moveTo(-w / 2 + 28, h / 2 - 23);
  ctx.lineTo(-w / 2 + 22, h / 2 - 18);
  ctx.lineTo(-w / 2 + 28, h / 2 - 13);
  ctx.moveTo(w / 2 - 28, h / 2 - 23);
  ctx.lineTo(w / 2 - 22, h / 2 - 18);
  ctx.lineTo(w / 2 - 28, h / 2 - 13);
  ctx.stroke();

  ctx.restore();
}

// -----------------------------------------------------------------------------
// front cover
// -----------------------------------------------------------------------------
function frontCover(ctx, products, gold, cyan) {
  const grad = ctx.createLinearGradient(0, 0, PAGE_W_PX, PAGE_H_PX);
  grad.addColorStop(0, '#191614');
  grad.addColorStop(0.45, '#12100e');
  grad.addColorStop(1, '#0b0a09');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, PAGE_W_PX, PAGE_H_PX);

  // cloth grain
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = getGrain(ctx);
  ctx.fillRect(0, 0, PAGE_W_PX, PAGE_H_PX);
  ctx.restore();

  // soft diagonal sheen
  const sheen = ctx.createLinearGradient(0, 0, PAGE_W_PX, 800);
  sheen.addColorStop(0, 'rgba(255,255,255,0.055)');
  sheen.addColorStop(0.38, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.72, 'rgba(245,196,81,0.035)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, PAGE_W_PX, PAGE_H_PX);

  // foil border
  ctx.strokeStyle = '#b78d3d';
  ctx.lineWidth = 2.2;
  ctx.strokeRect(54, 54, PAGE_W_PX - 108, PAGE_H_PX - 108);
  ctx.strokeStyle = 'rgba(245,196,81,0.30)';
  ctx.lineWidth = 1;
  ctx.strokeRect(66, 66, PAGE_W_PX - 132, PAGE_H_PX - 132);

  [ [54,54], [PAGE_W_PX - 54,54], [54,PAGE_H_PX - 54], [PAGE_W_PX - 54,PAGE_H_PX - 54] ].forEach(([x, y]) => {
    ctx.fillStyle = gold;
    ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
  });

  sc(ctx, 13, '500', '"JetBrains Mono", monospace');
  ctx.fillStyle = 'rgba(108,199,232,0.82)';
  tracked(ctx, 'EKLAKSHYA SOLUTIONS · ARCHITECTURAL ATELIER', PAGE_W_PX / 2, 146, 4.4, 'center');

  // emblem
  ctx.save();
  ctx.translate(PAGE_W_PX / 2, 358);
  ctx.strokeStyle = '#c39a4a'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(0, 0, 72, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(108,199,232,0.45)';
  ctx.beginPath(); ctx.arc(0, 0, 92, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -108); ctx.lineTo(0, 108);
  ctx.moveTo(-108, 0); ctx.lineTo(108, 0);
  ctx.stroke();
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = 'rgba(195,154,74,0.7)';
  ctx.strokeRect(-52, -52, 104, 104);
  ctx.restore();

  // foil monogram
  sc(ctx, 34, '700', '"Space Grotesk", sans-serif');
  ctx.fillStyle = '#e9c876';
  ctx.textAlign = 'center';
  ctx.fillText('EK', PAGE_W_PX / 2, 370);

  // foil shimmer pool behind the titles
  const shim = ctx.createRadialGradient(PAGE_W_PX / 2, 630, 10, PAGE_W_PX / 2, 630, 360);
  shim.addColorStop(0, 'rgba(245,196,81,0.12)');
  shim.addColorStop(1, 'rgba(245,196,81,0)');
  ctx.fillStyle = shim;
  ctx.fillRect(0, 400, PAGE_W_PX, 470);

  // title
  sc(ctx, 60, '700', '"Space Grotesk", sans-serif');
  ctx.fillStyle = 'rgba(244,239,230,0.96)';
  tracked(ctx, 'CATALOGUE', PAGE_W_PX / 2, 574, 12, 'center');

  const foil = ctx.createLinearGradient(0, 606, 0, 692);
  foil.addColorStop(0, '#fbeec4');
  foil.addColorStop(0.35, '#f5c451');
  foil.addColorStop(0.62, '#c79a3d');
  foil.addColorStop(1, '#f7d98d');
  sc(ctx, 88, '700', '"Space Grotesk", sans-serif');
  ctx.fillStyle = foil;
  tracked(ctx, '2026', PAGE_W_PX / 2, 682, 8, 'center');

  sc(ctx, 16, '500', '"JetBrains Mono", monospace');
  ctx.fillStyle = 'rgba(244,239,230,0.62)';
  tracked(ctx, 'MASTER HARDWARE & LIGHTING COLLECTION', PAGE_W_PX / 2, 742, 4.5, 'center');

  ctx.strokeStyle = 'rgba(195,154,74,0.65)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAGE_W_PX / 2 - 110, 790);
  ctx.lineTo(PAGE_W_PX / 2 + 110, 790);
  ctx.stroke();

  // edition / data metrics block
  const bx = 120;
  const by = 1000;
  const bw = PAGE_W_PX - 240;
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  rounded(ctx, bx, by, bw, 190, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  ctx.fill();
  ctx.stroke();

  const cols = [
    ['EDITION', 'VOL. IV / ISSUE 01'],
    ['DATA SOURCE', `${products.length} LIVE SKUs`],
    ['PREPRESS', 'FOGRA51 · 300 DPI'],
    ['FORMAT', '210 × 297 MM']
  ];
  cols.forEach(([k, v], i) => {
    const cx = bx + 30 + (i % 2) * (bw / 2);
    const cy = by + 64 + Math.floor(i / 2) * 72;
    sc(ctx, 10, '500', '"JetBrains Mono", monospace');
    ctx.fillStyle = 'rgba(108,199,232,0.75)';
    tracked(ctx, k, cx, cy, 2.4);
    sc(ctx, 14, '500', '"JetBrains Mono", monospace');
    ctx.fillStyle = 'rgba(244,239,230,0.90)';
    ctx.fillText(v, cx, cy + 24);
  });

  // bottom slug
  sc(ctx, 11, '400', '"JetBrains Mono", monospace');
  ctx.fillStyle = 'rgba(244,239,230,0.34)';
  tracked(ctx, 'AUTOMATED DATA-DRIVEN PRINT PIPELINE · CMYK 300 DPI', PAGE_W_PX / 2, 1248, 2.2, 'center');
  sc(ctx, 10, '400', '"JetBrains Mono", monospace');
  ctx.fillStyle = 'rgba(244,239,230,0.26)';
  tracked(ctx, 'EKLAKSHYA ARCHITECTURAL MEDIA DIVISION', PAGE_W_PX / 2, 1272, 2.2, 'center');

  drawBarcode(ctx, PAGE_W_PX - 228, PAGE_H_PX - 176, 138, 34, 'rgba(244,239,230,0.55)');
}

// -----------------------------------------------------------------------------
// contents page (verso / left)
// -----------------------------------------------------------------------------
function contentsPage(ctx, products, gold, cyan) {

  sc(ctx, 12, '500', '"JetBrains Mono", monospace');
  ctx.fillStyle = CYAN_INK;
  tracked(ctx, 'COLLECTION INDEX · 2026', 78, 208, 3);

  sc(ctx, 64, '700', '"Space Grotesk", sans-serif');
  ctx.fillStyle = INK;
  ctx.fillText('Selected', 74, 292);
  ctx.fillStyle = '#7a705f';
  ctx.fillText('Works.', 74, 358);

  hairline(ctx, 72, 398, PAGE_W_PX - 72, 0.22);

  const chapters = [
    { n: '01', t: 'Architectural Lighting', s: 'Suspensions, discs & directional light', p: '04', c: '06' },
    { n: '02', t: 'Precision Hardware', s: 'Levers, pulls, locks & cabinet detail', p: '10', c: '06' },
    { n: '03', t: 'Acoustic Surfaces', s: 'Timber slats, felt & patinated bronze', p: '16', c: '02' },
    { n: '04', t: 'Technical Submittals', s: 'Cut sheets, ERP sync & press preparation', p: '22', c: '12' }
  ];

  let y = 470;
  chapters.forEach((ch, i) => {
    sc(ctx, 11, '500', '"JetBrains Mono", monospace');
    ctx.fillStyle = GOLD_INK;
    ctx.fillText(ch.n, 76, y);

    sc(ctx, 25, '600', '"Space Grotesk", sans-serif');
    ctx.fillStyle = INK;
    ctx.fillText(ch.t, 128, y + 2);

    sc(ctx, 13, '400', '"Plus Jakarta Sans", sans-serif');
    ctx.fillStyle = SOFT;
    ctx.fillText(ch.s, 128, y + 26);

    sc(ctx, 11, '500', '"JetBrains Mono", monospace');
    ctx.fillStyle = CYAN_INK;
    ctx.textAlign = 'right';
    ctx.fillText(`${ch.c} ITEMS`, PAGE_W_PX - 176, y);
    ctx.fillStyle = SOFT;
    ctx.fillText(`P ${ch.p}`, PAGE_W_PX - 78, y);
    ctx.textAlign = 'left';

    hairline(ctx, 72, y + 52, PAGE_W_PX - 72, 0.12);
    y += 118;
  });

  // data source panel
  const px = 72;
  const py = 970;
  const pw = PAGE_W_PX - 144;
  ctx.fillStyle = '#171410';
  rounded(ctx, px, py, pw, 250, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245,196,81,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  sc(ctx, 11, '500', '"JetBrains Mono", monospace');
  ctx.fillStyle = gold;
  tracked(ctx, 'AUTOMATED DATA SOURCE', px + 28, py + 46, 2.4);

  sc(ctx, 12, '400', '"JetBrains Mono", monospace');
  ctx.fillStyle = 'rgba(244,239,230,0.62)';
  ctx.fillText('ENDPOINT  api.eklakshya.internal/v2/products', px + 28, py + 88);
  ctx.fillText(`PAYLOAD   ${products.length} SKUs · 100% vector artwork`, px + 28, py + 118);
  ctx.fillText('PROFILE   ISOcoated_v2_39l_eci · FOGRA51', px + 28, py + 148);

  sc(ctx, 11, '500', '"JetBrains Mono", monospace');
  ctx.fillStyle = '#7fcaa1';
  ctx.fillText('● SYNC ACTIVE', px + 28, py + 198);
  ctx.fillStyle = 'rgba(244,239,230,0.37)';
  ctx.textAlign = 'right';
  ctx.fillText('BUILD 1.2s', px + pw - 28, py + 198);
  ctx.textAlign = 'left';

  drawBarcode(ctx, px + 28, py + 214, 120, 20, 'rgba(245,196,81,0.55)');
}

// -----------------------------------------------------------------------------
// product grid page (recto / right)
// -----------------------------------------------------------------------------
function gridPage(ctx, items, pageIndex, gold, cyan) {
  sc(ctx, 11, '500', '"JetBrains Mono", monospace');
  ctx.fillStyle = CYAN_INK;
  tracked(ctx, pageIndex === 2 ? 'CHAPTER 01 · ARCHITECTURAL LIGHTING' : 'CHAPTER 02 · HARDWARE & SURFACES', 78, 192, 2.6);

  sc(ctx, 44, '700', '"Space Grotesk", sans-serif');
  ctx.fillStyle = INK;
  ctx.fillText(pageIndex === 2 ? 'Light, collected.' : 'Precision in detail.', 74, 250);

  sc(ctx, 12, '400', '"Plus Jakarta Sans", sans-serif');
  ctx.fillStyle = SOFT;
  ctx.textAlign = 'right';
  ctx.fillText('Selected works · 2026 trade edition', PAGE_W_PX - 78, 250);
  ctx.textAlign = 'left';

  hairline(ctx, 72, 282, PAGE_W_PX - 72, 0.2);

  items.forEach((p, i) => {
    if (!p) return;
    const x = GRID_CARDS.xs[i % 2];
    const y = GRID_CARDS.ys[Math.floor(i / 2)];
    const w = GRID_CARDS.w;
    const h = GRID_CARDS.h;

    ctx.fillStyle = '#f8f4ec';
    rounded(ctx, x, y, w, h, 4);
    ctx.fill();
    ctx.strokeStyle = RULE;
    ctx.lineWidth = 1;
    ctx.stroke();

    // artwork panel
    ctx.fillStyle = '#ece5d8';
    ctx.fillRect(x + 14, y + 14, w - 28, 158);
    drawProductGraphic(ctx, p.graphicType, x + 14, y + 14, w - 28, 158, gold, cyan);

    // index number
    sc(ctx, 10, '500', '"JetBrains Mono", monospace');
    ctx.fillStyle = 'rgba(28,24,19,0.38)';
    ctx.textAlign = 'right';
    ctx.fillText(String(i + 1).padStart(2, '0'), x + w - 22, y + 38);
    ctx.textAlign = 'left';

    // title
    sc(ctx, 21, '600', '"Space Grotesk", sans-serif');
    ctx.fillStyle = INK;
    ctx.fillText(p.name.length > 30 ? p.name.slice(0, 28) + '…' : p.name, x + 22, y + 208);

    sc(ctx, 11, '500', '"JetBrains Mono", monospace');
    ctx.fillStyle = GOLD_INK;
    tracked(ctx, (p.finish || '').toUpperCase(), x + 22, y + 232, 1.4);

    sc(ctx, 11, '400', '"Plus Jakarta Sans", sans-serif');
    ctx.fillStyle = SOFT;
    ctx.fillText(p.material, x + 22, y + 255);

    hairline(ctx, x + 22, y + 274, x + w - 22, 0.14);

    // spec / price
    sc(ctx, 10, '500', '"JetBrains Mono", monospace');
    ctx.fillStyle = FAINT;
    ctx.fillText('SKU', x + 22, y + 300);
    ctx.fillStyle = INK;
    ctx.fillText(p.sku, x + 22, y + 318);

    sc(ctx, 12, '500', '"JetBrains Mono", monospace');
    ctx.fillStyle = CYAN_INK;
    ctx.fillText(p.size, x + 22, y + 340);

    sc(ctx, 22, '700', '"Space Grotesk", sans-serif');
    ctx.fillStyle = INK;
    ctx.textAlign = 'right';
    ctx.fillText(p.price, x + w - 22, y + 318);
    sc(ctx, 9, '500', '"JetBrains Mono", monospace');
    ctx.fillStyle = '#2f7a4d';
    ctx.fillText(`● ${p.stock}`, x + w - 22, y + 340);
    ctx.textAlign = 'left';
  });

  sc(ctx, 10, '400', '"JetBrains Mono", monospace');
  ctx.fillStyle = FAINT;
  ctx.fillText('ALL DIMENSIONS IN MILLIMETRES · PRICES EX. TAX · SPECIFICATIONS SUBJECT TO ERP REVISION', 72, 1318);
  drawBarcode(ctx, PAGE_W_PX - 200, 1298, 128, 24, 'rgba(28,24,19,0.45)');
}

// -----------------------------------------------------------------------------
// hero feature page (verso / left)
// -----------------------------------------------------------------------------
function featurePage(ctx, product, products, gold, cyan) {
  sc(ctx, 11, '500', '"JetBrains Mono", monospace');
  ctx.fillStyle = GOLD_INK;
  tracked(ctx, 'FEATURE / 01 · ARCHITECTURAL LIGHTING', 78, 200, 2.4);

  sc(ctx, 50, '700', '"Space Grotesk", sans-serif');
  ctx.fillStyle = INK;
  ctx.fillText(product.name, 74, 282);

  sc(ctx, 12, '500', '"JetBrains Mono", monospace');
  ctx.fillStyle = CYAN_INK;
  ctx.fillText(`SKU ${product.sku}`, 74, 314);
  ctx.fillStyle = SOFT;
  ctx.fillText(`·  ${product.price}  ·  ${product.stock} IN STOCK`, 74 + 118, 314);

  // hero art panel
  const ax = 72;
  const ay = 350;
  const aw = PAGE_W_PX - 144;
  const ah = 470;
  ctx.fillStyle = '#ece5d8';
  ctx.fillRect(ax, ay, aw, ah);
  ctx.strokeStyle = RULE;
  ctx.strokeRect(ax, ay, aw, ah);
  drawProductGraphic(ctx, product.graphicType, ax, ay, aw, ah, gold, cyan);

  sc(ctx, 9, '500', '"JetBrains Mono", monospace');
  ctx.fillStyle = 'rgba(28,24,19,0.42)';
  ctx.fillText('FIG. 1.0 — DIMENSIONAL ELEVATION · NOT TO SCALE', ax + 18, ay + 26);

  // quote
  sc(ctx, 22, '400', '"Plus Jakarta Sans", sans-serif');
  ctx.fillStyle = INK;
  const quote = product.highlight || 'Engineered with hand-finished optics and a solid brass canopy.';
  const words = quote.split(' ');
  let line = '';
  let qy = 882;
  words.forEach((word) => {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > PAGE_W_PX - 250) {
      ctx.fillText(line, 74, qy);
      line = word;
      qy += 34;
    } else {
      line = test;
    }
  });
  if (line) ctx.fillText(line, 74, qy);

  // spec grid
  let sy = 960;
  hairline(ctx, 72, sy, PAGE_W_PX - 72, 0.24);
  const specs = (product.specs || []).slice(0, 6);
  specs.forEach(([k, v], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const sx = 74 + col * 452;
    const yy = sy + 34 + row * 62;
    sc(ctx, 9, '500', '"JetBrains Mono", monospace');
    ctx.fillStyle = FAINT;
    tracked(ctx, k.toUpperCase(), sx, yy, 1.6);
    sc(ctx, 12, '500', '"JetBrains Mono", monospace');
    ctx.fillStyle = INK;
    ctx.fillText(v, sx, yy + 22);
    if (row < 2) hairline(ctx, sx, yy + 40, sx + 410, 0.10);
  });

  hairline(ctx, 72, 1170, PAGE_W_PX - 72, 0.24);
  sc(ctx, 10, '500', '"JetBrains Mono", monospace');
  ctx.fillStyle = SOFT;
  ctx.fillText(`MATERIAL  ${product.material}`, 74, 1206);
  ctx.fillText(`FINISH  ${product.finish}`, 74, 1232);
  ctx.fillText(`DIMENSIONS  ${product.size}`, 74, 1258);
  ctx.fillStyle = GOLD_INK;
  ctx.textAlign = 'right';
  ctx.fillText('EKLAKSHYA · 2026', PAGE_W_PX - 74, 1258);
  ctx.textAlign = 'left';
}

// -----------------------------------------------------------------------------
// technical spec page (recto / right)
// -----------------------------------------------------------------------------
function specPage(ctx, product, products, gold, cyan, leftSide = false) {
  if (leftSide) {
    ctx.save();
    ctx.translate(PAGE_W_PX, 0);
    ctx.scale(-1, 1);
  }

  sc(ctx, 11, '500', '"JetBrains Mono", monospace');
  ctx.fillStyle = CYAN_INK;
  tracked(ctx, 'TECHNICAL SUBMITTAL · REV 2026.04', 96, 194, 2.6);

  sc(ctx, 38, '700', '"Space Grotesk", sans-serif');
  ctx.fillStyle = INK;
  ctx.fillText('Technical cut sheet.', 92, 246);

  // dark info strip
  ctx.fillStyle = '#1b1713';
  rounded(ctx, 72, 274, PAGE_W_PX - 144, 52, 3);
  ctx.fill();
  sc(ctx, 12, '500', '"JetBrains Mono", monospace');
  ctx.fillStyle = gold;
  ctx.fillText(product.name.toUpperCase(), 90, 306);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(244,239,230,0.8)';
  ctx.fillText(`SKU ${product.sku}  ·  ${product.price}`, PAGE_W_PX - 90, 306);
  ctx.textAlign = 'left';

  // orthographic panel
  const ax = 72;
  const ay = 344;
  const aw = PAGE_W_PX - 144;
  const ah = 330;
  ctx.fillStyle = '#ece5d8';
  ctx.fillRect(ax, ay, aw, ah);
  ctx.strokeStyle = RULE;
  ctx.strokeRect(ax, ay, aw, ah);
  drawProductGraphic(ctx, product.graphicType, ax, ay, aw, ah, gold, cyan);

  sc(ctx, 9, '500', '"JetBrains Mono", monospace');
  ctx.fillStyle = 'rgba(28,24,19,0.45)';
  ctx.fillText('ORTHOGRAPHIC ELEVATION · FIG 1.0', ax + 16, ay + 24);

  // data matrix
  const rows = [
    ['MATERIAL COMPOSITION', product.material],
    ['FINISH / TEXTURE', product.finish],
    ['OVERALL DIMENSIONS', product.size],
    ['DRIVER / ELECTRICAL', '120–277V CC driver · DALI-2 / 0-10V'],
    ['OPTICAL PERFORMANCE', 'CRI 98.2 (R9 > 95) · 2700K–3000K'],
    ['ENVIRONMENT RATING', 'IP44 indoor damp / IP65 optional'],
    ['COMPLIANCE', 'UL 1598 · CSA C22.2 · CE · RoHS'],
    ['WAREHOUSE AVAILABILITY', `${product.stock} · lead ${product.leadTime}`]
  ];
  let my = 706;
  hairline(ctx, 72, my, PAGE_W_PX - 72, 0.26);
  rows.forEach(([k, v]) => {
    sc(ctx, 9, '500', '"JetBrains Mono", monospace');
    ctx.fillStyle = FAINT;
    tracked(ctx, k, 74, my + 25, 1.2);
    sc(ctx, 11, '500', '"JetBrains Mono", monospace');
    ctx.fillStyle = INK;
    ctx.fillText(v, 330, my + 25);
    hairline(ctx, 72, my + 40, PAGE_W_PX - 72, 0.10);
    my += 41;
  });

  // footer approval block
  ctx.strokeStyle = 'rgba(28,24,19,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(72, 1080, 400, 112);
  ctx.strokeRect(492, 1080, 210, 112);
  ctx.strokeRect(722, 1080, 230, 112);
  sc(ctx, 9, '500', '"JetBrains Mono", monospace');
  ctx.fillStyle = FAINT;
  ctx.fillText('APPROVED', 86, 1102);
  ctx.fillText('DATE', 506, 1102);
  ctx.fillText('REVISION', 736, 1102);
  greek(ctx, 90, 1152, 260);
  greek(ctx, 508, 1152, 140);
  greek(ctx, 738, 1152, 120);

  ctx.fillStyle = GOLD_INK;
  sc(ctx, 10, '500', '"JetBrains Mono", monospace');
  tracked(ctx, 'APPROVED FOR CONSTRUCTION · STAMP & DATE', 74, 1240, 1.8);
  drawBarcode(ctx, PAGE_W_PX - 200, 1210, 128, 30, 'rgba(28,24,19,0.4)');

  if (leftSide) ctx.restore();
}

function greek(ctx, x, y, w) {
  ctx.strokeStyle = 'rgba(28,24,19,0.16)';
  ctx.lineWidth = 1;
  let cx = x;
  const marks = [0.6, 0.2, 0.9, 0.35, 0.7, 0.25, 0.55, 0.15, 0.8, 0.4, 0.65, 0.2, 0.5, 0.9];
  marks.forEach((m) => {
    ctx.beginPath();
    ctx.moveTo(cx, y - 8);
    ctx.lineTo(cx, y + 8 * m);
    ctx.stroke();
    cx += 9 + m * 4;
    if (cx > x + w) cx = x;
  });
}

// -----------------------------------------------------------------------------
// materials page (verso / left)
// -----------------------------------------------------------------------------
function materialsPage(ctx, items, products, gold, cyan) {
  sc(ctx, 11, '500', '"JetBrains Mono", monospace');
  ctx.fillStyle = GOLD_INK;
  tracked(ctx, 'MATERIAL LIBRARY · HAND-FINISHED SURFACES', 78, 194, 2);

  sc(ctx, 42, '700', '"Space Grotesk", sans-serif');
  ctx.fillStyle = INK;
  ctx.fillText('Material studies.', 74, 250);

  sc(ctx, 12, '400', '"Plus Jakarta Sans", sans-serif');
  ctx.fillStyle = SOFT;
  ctx.fillText('Every finish is drawn from a live ERP material record.', 74, 282);

  hairline(ctx, 72, 312, PAGE_W_PX - 72, 0.2);

  const swatches = [
    { n: 'Champagne foil', c: 'FIN-AU-01', g: ['#f6e1a8', '#e0b860', '#a17c2a'], note: 'Cover / trim' },
    { n: 'Aged bronze', c: 'FIN-BZ-04', g: ['#75675a', '#473e35', '#2b2520'], note: 'Hand patina' },
    { n: 'Natural brass', c: 'FIN-BR-02', g: ['#d7b169', '#b58a42', '#87642a'], note: 'Machined' },
    { n: 'Obsidian anodize', c: 'FIN-AL-09', g: ['#3b3a37', '#232220', '#141312'], note: 'Matte seal' },
    { n: 'Fluted glass', c: 'MAT-GL-03', g: ['#e9f0f1', '#ccdcdf', '#9fb9be'], note: 'Opal / clear' },
    { n: 'FSC white oak', c: 'MAT-WO-12', g: ['#dcc19a', '#c09f72', '#967a54'], note: 'Slat surface' }
  ];

  swatches.forEach((s, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 72 + col * 300;
    const y = 350 + row * 320;
    const w = 280;
    const h = 240;
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, s.g[0]);
    g.addColorStop(0.55, s.g[1]);
    g.addColorStop(1, s.g[2]);
    ctx.fillStyle = g;
    rounded(ctx, x, y, w, h, 4);
    ctx.fill();
    ctx.strokeStyle = RULE;
    ctx.lineWidth = 1;
    ctx.stroke();

    if (i === 5) {
      ctx.strokeStyle = 'rgba(28,24,19,0.22)';
      for (let lx = x + 16; lx < x + w - 12; lx += 18) {
        ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx, y + h); ctx.stroke();
      }
    }
    if (i === 4) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      for (let lx = x + 12; lx < x + w - 10; lx += 16) {
        ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx, y + h); ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x, y, w, 34);

    sc(ctx, 12, '600', '"Space Grotesk", sans-serif');
    ctx.fillStyle = '#fcf8f0';
    ctx.fillText(s.n, x + 14, y + 23);

    sc(ctx, 10, '500', '"JetBrains Mono", monospace');
    ctx.fillStyle = INK;
    ctx.fillText(s.c, x, y + 268);
    ctx.fillStyle = CYAN_INK;
    ctx.textAlign = 'right';
    ctx.fillText(s.note, x + w, y + 268);
    ctx.textAlign = 'left';
  });

  // note
  ctx.fillStyle = '#1b1713';
  rounded(ctx, 72, 1042, PAGE_W_PX - 144, 200, 6);
  ctx.fill();
  sc(ctx, 10, '500', '"JetBrains Mono", monospace');
  ctx.fillStyle = gold;
  tracked(ctx, 'FINISH DIRECTIVE', 96, 1080, 2.4);
  sc(ctx, 20, '400', '"Plus Jakarta Sans", sans-serif');
  ctx.fillStyle = 'rgba(244,239,230,0.88)';
  ctx.fillText('“Warm metal against cool glass —', 96, 1128);
  ctx.fillText('every surface chosen to age honestly.”', 96, 1158);
  sc(ctx, 10, '400', '"JetBrains Mono", monospace');
  ctx.fillStyle = 'rgba(244,239,230,0.45)';
  ctx.fillText(`REFERENCE LIBRARY · ${items.length} ACTIVE MATERIAL RECORDS · ${products.length} SKUs`, 96, 1202);

  ctx.fillStyle = 'rgba(244,239,230,0.55)';
  ctx.fillRect(PAGE_W_PX - 192, 1088, 72, 3);
}

// -----------------------------------------------------------------------------
// back cover
// -----------------------------------------------------------------------------
function backCover(ctx, products, gold, cyan) {
  ctx.fillStyle = '#12100e';
  ctx.fillRect(0, 0, PAGE_W_PX, PAGE_H_PX);
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = getGrain(ctx);
  ctx.fillRect(0, 0, PAGE_W_PX, PAGE_H_PX);
  ctx.restore();

  const glow = ctx.createRadialGradient(512, 640, 20, 512, 640, 620);
  glow.addColorStop(0, 'rgba(245,196,81,0.06)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, PAGE_W_PX, PAGE_H_PX);

  ctx.strokeStyle = 'rgba(183,141,61,0.55)';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(54, 54, PAGE_W_PX - 108, PAGE_H_PX - 108);

  ctx.save();
  ctx.translate(512, 340);
  ctx.strokeStyle = 'rgba(195,154,74,0.8)';
  ctx.beginPath(); ctx.arc(0, 0, 56, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(108,199,232,0.5)';
  ctx.beginPath(); ctx.arc(0, 0, 74, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-92, 0); ctx.lineTo(92, 0);
  ctx.moveTo(0, -92); ctx.lineTo(0, 92);
  ctx.stroke();
  ctx.restore();

  sc(ctx, 28, '700', '"Space Grotesk", sans-serif');
  ctx.fillStyle = '#efe9dd';
  ctx.textAlign = 'center';
  tracked(ctx, 'EKLAKSHYA', 512, 520, 8, 'center');
  sc(ctx, 12, '500', '"JetBrains Mono", monospace');
  ctx.fillStyle = 'rgba(244,239,230,0.55)';
  tracked(ctx, 'ARCHITECTURAL MEDIA DIVISION', 512, 558, 3.4, 'center');
  ctx.strokeStyle = 'rgba(245,196,81,0.5)';
  ctx.beginPath(); ctx.moveTo(412, 594); ctx.lineTo(612, 594); ctx.stroke();

  sc(ctx, 13, '400', '"Plus Jakarta Sans", sans-serif');
  ctx.fillStyle = 'rgba(244,239,230,0.72)';
  ctx.fillText('Catalogues that build themselves.', 512, 660);

  sc(ctx, 10, '500', '"JetBrains Mono", monospace');
  ctx.fillStyle = 'rgba(108,199,232,0.8)';
  tracked(ctx, 'WWW.EKLAKSHYA.COM · ERP / CSV DIRECT SYNC', 512, 700, 2.4, 'center');

  const bx = 250;
  const by = 820;
  const bw = 524;
  ctx.strokeStyle = 'rgba(245,196,81,0.28)';
  ctx.lineWidth = 1;
  rounded(ctx, bx, by, bw, 210, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  ctx.fill();
  ctx.stroke();

  const lines = [
    ['300 DPI', 'HIGH-RESOLUTION PRINT OUTPUT'],
    ['FOGRA51', 'ISO 12647-2 STANDARDIZED CMYK'],
    ['FSC', 'SUSTAINABLE CERTIFIED SUBSTRATES'],
    ['PDF/X-4', 'BLEED, CROP & REGISTRATION READY']
  ];
  lines.forEach(([k, v], i) => {
    const yy = by + 48 + i * 42;
    sc(ctx, 12, '700', '"JetBrains Mono", monospace');
    ctx.fillStyle = gold;
    ctx.textAlign = 'left';
    ctx.fillText(k, bx + 30, yy);
    sc(ctx, 10, '400', '"JetBrains Mono", monospace');
    ctx.fillStyle = 'rgba(244,239,230,0.55)';
    tracked(ctx, v, bx + 150, yy, 1.4);
    ctx.fillStyle = 'rgba(108,199,232,0.7)';
    ctx.fillRect(bx + 30, yy + 12, bw - 60, 1);
  });

  ctx.textAlign = 'center';
  drawBarcode(ctx, 396, 1090, 232, 62, 'rgba(245,196,81,0.75)');
  sc(ctx, 10, '400', '"JetBrains Mono", monospace');
  ctx.fillStyle = 'rgba(244,239,230,0.45)';
  tracked(ctx, 'ISBN 978-0-984214-55-1 · EK-CAT-2026', 512, 1180, 2, 'center');
  ctx.textAlign = 'left';
}

function drawBarcode(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  const bars = [3, 1, 2, 1, 4, 1, 3, 2, 1, 2, 4, 1, 2, 1, 3, 1, 4, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2];
  const unit = w / bars.reduce((a, b) => a + b, 0);
  let cx = x;
  bars.forEach((b, i) => {
    if (i % 2 === 0) ctx.fillRect(cx, y, b * unit, h);
    cx += b * unit;
  });
}

// -----------------------------------------------------------------------------
// main page factory
// -----------------------------------------------------------------------------
export function generatePageCanvas(pageIndex, products = [], options = {}) {
  const { gold = '#f5c451', cyan = '#6cc7e8' } = options;
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W_PX;
  canvas.height = PAGE_H_PX;
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'alphabetic';

  if (pageIndex === 0) {
    frontCover(ctx, products, gold, cyan);
    return canvas;
  }
  if (pageIndex === 7) {
    backCover(ctx, products, gold, cyan);
    return canvas;
  }

  paperBase(ctx, pageIndex, gold, cyan);
  folio(ctx, pageIndex, gold, cyan);

  if (pageIndex === 1) {
    contentsPage(ctx, products, gold, cyan);
  } else if (pageIndex === 2) {
    gridPage(ctx, products.slice(0, 6), pageIndex, gold, cyan);
  } else if (pageIndex === 3) {
    featurePage(ctx, products[1] || products[0], products, gold, cyan);
  } else if (pageIndex === 4) {
    gridPage(ctx, products.slice(6, 12), pageIndex, gold, cyan);
  } else if (pageIndex === 5) {
    specPage(ctx, products[1] || products[0], products, gold, cyan);
  } else if (pageIndex === 6) {
    materialsPage(ctx, products.slice(8, 12), products, gold, cyan);
  }

  // subtle paper edge / digital proof tag
  sc(ctx, 8, '400', '"JetBrains Mono", monospace');
  ctx.fillStyle = 'rgba(28,24,19,0.28)';
  ctx.textAlign = pageIndex % 2 === 1 ? 'left' : 'right';
  ctx.fillText('EK-PROOF · 2026 · VECTOR ARTWORK · NO BITMAPS', pageIndex % 2 === 1 ? 74 : PAGE_W_PX - 74, 1340);
  ctx.textAlign = 'left';

  return canvas;
}

// -----------------------------------------------------------------------------
// print-ready two-page spread (crop marks, bleed, CMYK bars, registration)
// -----------------------------------------------------------------------------
export function generateSpreadCanvas(products = [], options = {}) {
  const { gold = '#f5c451', cyan = '#6cc7e8' } = options;
  const SW = 2048;
  const SH = 1400;
  const canvas = document.createElement('canvas');
  canvas.width = SW;
  canvas.height = SH;
  const ctx = canvas.getContext('2d');

  // sheet stock
  ctx.fillStyle = '#efe9dd';
  ctx.fillRect(0, 0, SW, SH);
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = getGrain(ctx);
  ctx.fillRect(0, 0, SW, SH);
  ctx.restore();

  // paste a live spread (spec verso / product recto)
  const left = generatePageCanvas(5, products, options);
  const right = generatePageCanvas(2, products, options);
  const padX = 62;
  const padY = 88;
  ctx.drawImage(left, padX, padY, 948, 1224);
  ctx.drawImage(right, 1038, padY, 948, 1224);

  // centre gutter
  const gg = ctx.createLinearGradient(1002, 0, 1068, 0);
  gg.addColorStop(0, 'rgba(30,20,8,0.24)');
  gg.addColorStop(0.5, 'rgba(30,20,8,0.10)');
  gg.addColorStop(1, 'rgba(255,255,255,0.22)');
  ctx.fillStyle = gg;
  ctx.fillRect(1002, padY, 66, 1208);

  // cyan bleed box (3mm)
  ctx.strokeStyle = cyan;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.strokeRect(24, 24, SW - 48, SH - 48);
  ctx.setLineDash([]);

  // corner crop marks
  const crop = (x, y, dx, dy) => {
    ctx.strokeStyle = '#15120f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + dy * 46);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * 46, y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(108,199,232,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + dx * 12, y + dy * 58);
    ctx.lineTo(x + dx * 12, y + dy * 12);
    ctx.lineTo(x + dx * 58, y + dy * 12);
    ctx.stroke();
  };
  const trimX = 46;
  const trimY = 72;
  crop(trimX, trimY, 1, 1);
  crop(SW - trimX, trimY, -1, 1);
  crop(trimX, SH - trimY, 1, -1);
  crop(SW - trimX, SH - trimY, -1, -1);
  // trim guide corner ticks
  ctx.strokeStyle = 'rgba(21,18,15,0.55)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(57, 82, SW - 114, SH - 164);
  ctx.setLineDash([]);

  // registration targets
  const reg = (cx, cy) => {
    ctx.strokeStyle = '#15120f';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 22, cy); ctx.lineTo(cx + 22, cy);
    ctx.moveTo(cx, cy - 22); ctx.lineTo(cx, cy + 22);
    ctx.stroke();
  };
  reg(SW / 2, 46);
  reg(SW / 2, SH - 46);
  reg(44, SH / 2);
  reg(SW - 44, SH / 2);

  // CMYK calibration patches
  const patches = [
    ['#00AEEF', 'C'], ['#EC008C', 'M'], ['#FFF200', 'Y'], ['#111111', 'K'],
    ['#b7b1a6', '50%'], ['#d9cdb4', '25%'], ['#f5c451', 'M508']
  ];
  let bx = 86;
  patches.forEach(([color, label]) => {
    ctx.fillStyle = color;
    ctx.fillRect(bx, 48, 42, 22);
    ctx.strokeStyle = 'rgba(20,18,15,0.4)';
    ctx.strokeRect(bx, 48, 42, 22);
    ctx.font = '500 9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#15120f';
    ctx.fillText(label, bx, 84);
    bx += 54;
  });

  // slug line
  ctx.font = '500 10px "JetBrains Mono", monospace';
  ctx.fillStyle = '#3c352b';
  ctx.fillText('EKLAKSHYA · EK-2026-CAT-0984 · ISOCOATED_V2 (FOGRA51) · 300 DPI · 100% · TRIM 420 × 297 MM · BLEED 3 MM', 86, SH - 34);
  ctx.textAlign = 'right';
  ctx.fillText('SHEET 01 / 01 · PDF/X-4 · ALL MARKS SUPPLIED', SW - 86, SH - 34);
  ctx.textAlign = 'left';

  return canvas;
}

// -----------------------------------------------------------------------------
// tiny CSV/ERP panel texture for the DATA IN stage
// -----------------------------------------------------------------------------
export function generateCsvCanvas(gold = '#f5c451', cyan = '#6cc7e8') {
  const canvas = document.createElement('canvas');
  canvas.width = 880;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 880, 420);
  bg.addColorStop(0, 'rgba(14,26,32,0.98)');
  bg.addColorStop(1, 'rgba(9,16,20,0.98)');
  ctx.fillStyle = bg;
  rounded(ctx, 0, 0, 880, 420, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(108,199,232,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // header
  ctx.fillStyle = 'rgba(108,199,232,0.12)';
  rounded(ctx, 16, 16, 848, 46, 8);
  ctx.fill();
  sc(ctx, 13, '700', '"JetBrains Mono", monospace');
  ctx.fillStyle = cyan;
  tracked(ctx, 'ERP_STREAM.CSV', 36, 47, 2);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(244,239,230,0.55)';
  ctx.fillText('16 ROWS · LIVE', 840, 46);
  ctx.fillStyle = gold;
  ctx.fillText('●', 760, 46);
  ctx.textAlign = 'left';

  const cols = [36, 176, 376, 536, 716];
  const headers = ['SKU', 'PRODUCT', 'SIZE (MM)', 'FINISH', 'PRICE'];
  sc(ctx, 11, '700', '"JetBrains Mono", monospace');
  ctx.fillStyle = 'rgba(244,239,230,0.42)';
  headers.forEach((h, i) => ctx.fillText(h, cols[i], 96));

  for (let r = 0; r < 7; r++) {
    const y = 124 + r * 40;
    if (r % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.025)';
      ctx.fillRect(20, y - 18, 840, 34);
    }
    // tiny rectangle cells
    const rowWidths = [[58, 0.7], [126, 0.55], [100, 0.4], [96, 0.6], [56, 0.5]];
    rowWidths.forEach(([w, a], c) => {
      ctx.fillStyle = c === 0 ? `rgba(245,196,81,${a})` : c === 4 ? `rgba(108,199,232,${a})` : `rgba(200,215,220,${a * 0.55})`;
      rounded(ctx, cols[c], y - 11, w + ((r * 13 + c * 7) % 34), 12, 3);
      ctx.fill();
    });
  }

  sc(ctx, 10, '400', '"JetBrains Mono", monospace');
  ctx.fillStyle = 'rgba(108,199,232,0.55)';
  ctx.fillText('SYNCING → CANVAS LAYOUT ENGINE → PDF/X-4', 36, 396);
  ctx.fillStyle = 'rgba(245,196,81,0.75)';
  ctx.textAlign = 'right';
  ctx.fillText('READY', 844, 396);
  ctx.textAlign = 'left';

  return canvas;
}

// -----------------------------------------------------------------------------
// hit testing for product cards, in canvas space
// -----------------------------------------------------------------------------
export function pickProductAt(pageIndex, u, v, products = []) {
  if (pageIndex !== 2 && pageIndex !== 4) return null;
  const px = u * PAGE_W_PX;
  const py = (1 - v) * PAGE_H_PX;
  const offset = pageIndex === 2 ? 0 : 6;
  const { w, h, xs, ys } = GRID_CARDS;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const x = xs[col];
      const y = ys[row];
      if (px >= x && px <= x + w && py >= y && py <= y + h) {
        return products[offset + row * 2 + col] || null;
      }
    }
  }
  return null;
}

export function makeTextureFromCanvas(canvas, anisotropy = 8) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}


// -----------------------------------------------------------------------------
// highlight ring for a tapped product card
// -----------------------------------------------------------------------------
export function drawCardHighlight(ctx, slot, gold = '#f5c451', cyan = '#6cc7e8') {
  const { w, h, xs, ys } = GRID_CARDS;
  const x = xs[slot % 2];
  const y = ys[Math.floor(slot / 2)];
  ctx.save();
  ctx.strokeStyle = gold;
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
  ctx.strokeStyle = 'rgba(108,199,232,0.9)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 7, y - 7, w + 14, h + 14);

  // corner ticks
  ctx.strokeStyle = cyan;
  ctx.lineWidth = 2;
  const t = 16;
  [[x - 7, y - 7, 1, 1], [x + w + 7, y - 7, -1, 1], [x - 7, y + h + 7, 1, -1], [x + w + 7, y + h + 7, -1, -1]].forEach(([cx, cy, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy + dy * t);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + dx * t, cy);
    ctx.stroke();
  });

  // label chip
  ctx.fillStyle = '#171310';
  ctx.fillRect(x + 12, y + h - 34, 150, 22);
  ctx.fillStyle = gold;
  ctx.font = '700 10px "JetBrains Mono", monospace';
  ctx.fillText('● SELECTED', x + 22, y + h - 19);
  ctx.restore();
}
