// Genera los íconos de S-Doorbell a partir de assets/logo.png.
//
// La marca (S + 3 ondas) y el guion de "S-doorbell" SE SOLAPAN en X: la onda
// exterior llega a x=742 y el guion empieza en x=704. Por eso no alcanza con
// recortar un rectángulo — hay que aislar los componentes conectados y quedarse
// con las 4 piezas grandes (S + ondas), descartando el guion y el asta de la "d".
//
// Uso:  node tools/gen-icons.js
const path = require('path');
const fs = require('fs');
const Jimp = require('jimp-compact');

const MOBILE = path.join(__dirname, '..');
const ASSETS = path.join(MOBILE, 'assets');        // íconos nativos (Expo)
const PUBLIC_ICONS = path.join(MOBILE, 'public', 'icons'); // íconos del PWA

const WHITE = 0xffffffff;
const KEEP = 4; // S + 3 ondas

async function extractMark() {
  const logo = await Jimp.read(path.join(ASSETS, 'logo.png'));
  const W = logo.bitmap.width, H = logo.bitmap.height;
  const rx = Math.floor(W * 0.30), ry = Math.floor(H * 0.68);

  const isInk = (x, y) => {
    const { r, g, b, a } = Jimp.intToRGBA(logo.getPixelColor(x, y));
    return a > 40 && !(r > 245 && g > 245 && b > 245);
  };

  const label = new Int32Array(rx * ry).fill(-1);
  const comps = [];
  for (let y = 0; y < ry; y++) {
    for (let x = 0; x < rx; x++) {
      if (label[y * rx + x] !== -1 || !isInk(x, y)) continue;
      const id = comps.length;
      let minX = x, maxX = x, minY = y, maxY = y, area = 0;
      const stack = [[x, y]];
      label[y * rx + x] = id;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        area++;
        if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= rx || ny >= ry) continue;
          if (label[ny * rx + nx] !== -1 || !isInk(nx, ny)) continue;
          label[ny * rx + nx] = id;
          stack.push([nx, ny]);
        }
      }
      comps.push({ id, minX, minY, maxX, maxY, area });
    }
  }

  const keep = [...comps].sort((a, b) => b.area - a.area).slice(0, KEEP);
  const keepIds = new Set(keep.map((c) => c.id));
  const bx0 = Math.min(...keep.map((c) => c.minX)), bx1 = Math.max(...keep.map((c) => c.maxX));
  const by0 = Math.min(...keep.map((c) => c.minY)), by1 = Math.max(...keep.map((c) => c.maxY));
  console.log('marca:', (bx1-bx0+1) + 'x' + (by1-by0+1), '— piezas', keep.map((c) => c.area).join(', '));

  // Lienzo transparente con SOLO los píxeles de las piezas elegidas.
  const mark = new Jimp(bx1 - bx0 + 1, by1 - by0 + 1, 0x00000000);
  for (let y = by0; y <= by1; y++) {
    for (let x = bx0; x <= bx1; x++) {
      if (keepIds.has(label[y * rx + x])) mark.setPixelColor(logo.getPixelColor(x, y), x - bx0, y - by0);
    }
  }
  return { mark, logo };
}

(async () => {
  const { mark, logo } = await extractMark();

  const square = (src, size, ratio, bg) => {
    const canvas = new Jimp(size, size, bg);
    const m = src.clone();
    const scale = (size * ratio) / Math.max(m.bitmap.width, m.bitmap.height);
    m.resize(Math.round(m.bitmap.width * scale), Math.round(m.bitmap.height * scale));
    canvas.composite(m, Math.round((size - m.bitmap.width) / 2), Math.round((size - m.bitmap.height) / 2));
    return canvas;
  };
  const write = async (img, dir, name) => {
    await fs.promises.mkdir(dir, { recursive: true });
    await img.writeAsync(path.join(dir, name));
    console.log('✓', path.relative(MOBILE, path.join(dir, name)), img.bitmap.width + 'x' + img.bitmap.height);
  };

  // App icon (iOS/Android legacy): fondo opaco — iOS rechaza alfa.
  await write(square(mark, 1024, 0.72, WHITE), ASSETS, 'icon.png');
  // Adaptive icon (Android): entra en la safe zone (~66% central).
  await write(square(mark, 1024, 0.55, 0x00000000), ASSETS, 'adaptive-icon.png');
  await write(square(mark, 48, 0.86, WHITE), ASSETS, 'favicon.png');
  // PWA: el maskable lleva más aire porque Android le recorta los bordes.
  await write(square(mark, 192, 0.78, WHITE), PUBLIC_ICONS, 'pwa-192.png');
  await write(square(mark, 512, 0.78, WHITE), PUBLIC_ICONS, 'pwa-512.png');
  await write(square(mark, 512, 0.55, WHITE), PUBLIC_ICONS, 'pwa-512-maskable.png');
  await write(square(mark, 180, 0.78, WHITE), PUBLIC_ICONS, 'apple-touch-icon.png');

  // Notification icon (Android): silueta blanca sobre transparente.
  const sil = square(mark, 96, 0.8, 0x00000000);
  sil.scan(0, 0, sil.bitmap.width, sil.bitmap.height, function (x, y, idx) {
    if (this.bitmap.data[idx + 3] > 40) {
      this.bitmap.data[idx] = 255; this.bitmap.data[idx + 1] = 255; this.bitmap.data[idx + 2] = 255;
    }
  });
  await write(sil, ASSETS, 'notification-icon.png');

  // Splash: wordmark completo centrado sobre blanco.
  const splash = new Jimp(1284, 2778, WHITE);
  const word = logo.clone();
  const ws = (1284 * 0.7) / word.bitmap.width;
  word.resize(Math.round(word.bitmap.width * ws), Math.round(word.bitmap.height * ws));
  splash.composite(word, Math.round((1284 - word.bitmap.width) / 2), Math.round((2778 - word.bitmap.height) / 2));
  await write(splash, ASSETS, 'splash.png');
})().catch((e) => { console.error('FALLO:', e.message); process.exit(1); });
