// Génère les PNG d'icône à partir de la même composition que icons/icon.svg.
// Encodeur PNG minimal (RGBA, filtre 0) pour éviter toute dépendance.
//
//   node scripts/make-icons.mjs

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'web', 'icons');

// --- Encodeur PNG ----------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filtre "None"
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // profondeur
  ihdr[9] = 6;  // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Dessin ----------------------------------------------------------------

const mix = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Couverture anti-aliasée d'un rectangle à coins arrondis. */
function roundRectCoverage(x, y, rx0, ry0, rx1, ry1, radius) {
  const cx = Math.min(Math.max(x, rx0 + radius), rx1 - radius);
  const cy = Math.min(Math.max(y, ry0 + radius), ry1 - radius);
  const dist = Math.hypot(x - cx, y - cy);
  if (x < rx0 - 1 || x > rx1 + 1 || y < ry0 - 1 || y > ry1 + 1) return 0;
  return clamp01(radius + 0.5 - dist);
}

function circleCoverage(x, y, cx, cy, r) {
  return clamp01(r + 0.5 - Math.hypot(x - cx, y - cy));
}

function blend(dst, i, [r, g, b], alpha) {
  if (alpha <= 0) return;
  dst[i] = mix(dst[i], r, alpha);
  dst[i + 1] = mix(dst[i + 1], g, alpha);
  dst[i + 2] = mix(dst[i + 2], b, alpha);
  dst[i + 3] = Math.max(dst[i + 3], Math.round(255 * alpha));
}

const WHITE = [255, 255, 255];
const GOLD = [245, 197, 24];
const TOP = [99, 102, 241];
const BOTTOM = [59, 47, 143];

/** @param {number} size @param {boolean} maskable marge de sécurité pour le masquage adaptatif */
function drawIcon(size, maskable = false) {
  const rgba = Buffer.alloc(size * size * 4);
  const s = size / 512;
  // Zone de dessin : réduite à 80 % pour les icônes masquables.
  const inset = maskable ? size * 0.1 : 0;
  const span = size - inset * 2;
  const u = (v) => inset + (v / 512) * span;
  const radius = maskable ? 0 : 112 * s;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Fond : dégradé vertical, arrondi (ou plein si masquable).
      const t = y / (size - 1);
      const bg = [mix(TOP[0], BOTTOM[0], t), mix(TOP[1], BOTTOM[1], t), mix(TOP[2], BOTTOM[2], t)];
      const bgAlpha = maskable ? 1 : roundRectCoverage(x + 0.5, y + 0.5, 0, 0, size, size, radius);
      blend(rgba, i, bg, bgAlpha);

      // Trois barres blanches (lignes de score).
      for (const [top, width] of [[150, 212], [239, 164], [328, 248]]) {
        const a = roundRectCoverage(x + 0.5, y + 0.5, u(104), u(top), u(104 + width), u(top + 34), (17 / 512) * span);
        blend(rgba, i, WHITE, a * bgAlpha);
      }

      // Jeton doré (le Payoo).
      const gold = circleCoverage(x + 0.5, y + 0.5, u(372), u(167), (46 / 512) * span);
      blend(rgba, i, GOLD, gold * bgAlpha);
    }
  }
  return encodePng(size, size, rgba);
}

mkdirSync(OUT_DIR, { recursive: true });
const files = [
  ['icon-192.png', drawIcon(192)],
  ['icon-512.png', drawIcon(512)],
  ['icon-maskable-512.png', drawIcon(512, true)],
  ['apple-touch-icon.png', drawIcon(180)],
];
for (const [name, buffer] of files) {
  writeFileSync(join(OUT_DIR, name), buffer);
  console.log(`${name} — ${(buffer.length / 1024).toFixed(1)} Ko`);
}
