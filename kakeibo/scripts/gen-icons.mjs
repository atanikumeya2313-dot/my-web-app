// Generates icon-192.png and icon-512.png using Canvas API (Node.js + canvas)
// Run: node scripts/gen-icons.mjs
// If 'canvas' is not installed: npm install canvas --save-dev

import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#3b82f6';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();

  // ¥ symbol
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.55}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('¥', size / 2, size / 2);

  return canvas.toBuffer('image/png');
}

for (const size of [192, 512]) {
  const buf = generateIcon(size);
  const out = join(__dirname, `../public/icon-${size}.png`);
  writeFileSync(out, buf);
  console.log(`Generated: icon-${size}.png`);
}
