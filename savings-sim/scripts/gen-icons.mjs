import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();

  // 上昇グラフ風のシンプルなアイコン（折れ線）
  const p = size * 0.2;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(p, size - p);
  ctx.lineTo(size * 0.45, size * 0.6);
  ctx.lineTo(size * 0.65, size * 0.45);
  ctx.lineTo(size - p, p);
  ctx.stroke();

  return canvas.toBuffer('image/png');
}

for (const size of [192, 512]) {
  const buf = generateIcon(size);
  const out = join(__dirname, `../public/icon-${size}.png`);
  writeFileSync(out, buf);
  console.log(`Generated: icon-${size}.png`);
}
