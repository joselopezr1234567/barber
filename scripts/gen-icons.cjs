/**
 * Genera los íconos PNG de la PWA (192 y 512 px) sin dependencias.
 * Crea un PNG sólido dorado (#d4b483) con esquinas... (color plano + logo simple).
 */
const fs = require("fs");
const zlib = require("zlib");

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function png(size, bg, fg, draw) {
  const w = size, h = size;
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    const rowStart = y * (1 + w * 4);
    raw[rowStart] = 0; // filtro none
    for (let x = 0; x < w; x++) {
      let c = bg;
      if (draw(x, y, size)) c = fg;
      const o = rowStart + 1 + x * 4;
      raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2]; raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const GOLD = [212, 180, 131]; // #d4b483
const DARK = [9, 9, 11];      // #09090b

// Logo: un "calendario" simple — rectángulo oscuro con una barra superior y 4 puntos
function inIcon(x, y, s) {
  const pad = s * 0.16;
  const x0 = pad, x1 = s - pad, y0 = pad * 1.2, y1 = s - pad * 0.8;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const r = s * 0.05;
  const inRect = x >= x0 + r * 0.4 && x <= x1 - r * 0.4 && y >= y0 && y <= y1;
  // barra superior
  const barTop = y0 + s * 0.1, barBottom = y0 + s * 0.22;
  if (y >= barTop && y <= barBottom) return true;
  // 4 puntos
  const cy = (barBottom + y1) / 2 + s * 0.02;
  const rDot = s * 0.06;
  const xs = [x0 + (x1 - x0) * 0.28, x0 + (x1 - x0) * 0.5, x0 + (x1 - x0) * 0.72];
  for (const cx of xs) {
    if (Math.hypot(x - cx, y - cy) <= rDot) return true;
  }
  return false;
}

for (const size of [192, 512]) {
  const buf = png(size, DARK, GOLD, inIcon);
  fs.writeFileSync(`public/icon-${size}.png`, buf);
  console.log(`public/icon-${size}.png (${size}x${size})`);
}
