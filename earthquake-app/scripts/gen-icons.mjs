import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // 赤背景
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();

  // 波紋（地震波）
  const cx = size / 2;
  const cy = size / 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = size * 0.04;
  for (const r of [size * 0.18, size * 0.30]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 中心点
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.12, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toBuffer('image/png');
}

for (const size of [192, 512]) {
  const buf = generateIcon(size);
  const out = join(__dirname, `../public/icon-${size}.png`);
  writeFileSync(out, buf);
  console.log(`Generated: icon-${size}.png`);
}
