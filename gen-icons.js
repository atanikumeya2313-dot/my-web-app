const { createCanvas } = require('./kakeibo/node_modules/canvas');
const fs = require('fs');
const path = require('path');

const apps = [
  { dir: 'interest', color: '#3b82f6', label: '複利', bg: '#eff6ff' },
  { dir: 'kakeibo',  color: '#10b981', label: '家計', bg: '#f0fdf4' },
  { dir: 'todo',     color: '#8b5cf6', label: 'TODO', bg: '#f5f3ff' },
];

for (const app of apps) {
  const pubDir = path.join(__dirname, app.dir, 'public');
  fs.mkdirSync(pubDir, { recursive: true });

  for (const size of [192, 512]) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // 背景（角丸は canvas では clip で対応）
    const r = size * 0.2;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(size - r, 0);
    ctx.quadraticCurveTo(size, 0, size, r);
    ctx.lineTo(size, size - r);
    ctx.quadraticCurveTo(size, size, size - r, size);
    ctx.lineTo(r, size);
    ctx.quadraticCurveTo(0, size, 0, size - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fillStyle = app.color;
    ctx.fill();

    // テキスト
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.3}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(app.label, size / 2, size / 2);

    const buf = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(pubDir, `icon-${size}.png`), buf);
    console.log(`✓ ${app.dir}/public/icon-${size}.png`);
  }
}
console.log('Done!');
