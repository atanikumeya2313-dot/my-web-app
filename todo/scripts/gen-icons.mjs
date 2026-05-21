import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#3b82f6';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();

  // チェックマーク
  const p = size * 0.22;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = size * 0.1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(p, size / 2);
  ctx.lineTo(size * 0.42, size * 0.68);
  ctx.lineTo(size - p, size * 0.3);
  ctx.stroke();

  return canvas.toBuffer('image/png');
}

for (const size of [192, 512]) {
  const buf = generateIcon(size);
  const out = join(__dirname, `../public/icon-${size}.png`);
  writeFileSync(out, buf);
  console.log(`Generated: icon-${size}.png`);
}
