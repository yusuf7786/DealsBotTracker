// Generates simple flat PWA icons (no external deps) so the app is
// installable without requiring a design tool. Draws a rounded tag shape.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function writePng(filePath, size, pixelFn) {
  const width = size, height = size;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0; // no filter
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      const idx = rowStart + 1 + x * 4;
      raw[idx] = r; raw[idx + 1] = g; raw[idx + 2] = b; raw[idx + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const idat = zlib.deflateSync(raw);
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(filePath, png);
}

const ACCENT = [99, 102, 241]; // indigo-500
const WHITE = [255, 255, 255];

function tagIcon(x, y, w, h) {
  const cx = w / 2, cy = h / 2;
  const margin = w * 0.08;
  const r = w * 0.22; // corner radius for rounded square background

  // rounded-rect background test
  const inRounded = (() => {
    const left = margin, top = margin, right = w - margin, bottom = h - margin;
    const clampedX = Math.min(Math.max(x, left + r), right - r);
    const clampedY = Math.min(Math.max(y, top + r), bottom - r);
    const dx = x - clampedX, dy = y - clampedY;
    if (x < left || x > right || y < top || y > bottom) return false;
    if ((x < left + r || x > right - r) && (y < top + r || y > bottom - r)) {
      return dx * dx + dy * dy <= r * r;
    }
    return true;
  })();

  if (!inRounded) return [0, 0, 0, 0];

  // Price-tag glyph: a circle (the tag hole) offset up-left, and a simple
  // checkmark made of two thick strokes to suggest "verified deal", both
  // white on top of the accent-coloured rounded background.
  const holeCx = cx - w * 0.02, holeCy = cy - h * 0.14, holeR = w * 0.07;
  const distHole = Math.hypot(x - holeCx, y - holeCy);
  if (distHole <= holeR) return [...WHITE, 255];

  const p1 = { x: cx - w * 0.16, y: cy + h * 0.02 };
  const p2 = { x: cx - w * 0.03, y: cy + h * 0.16 };
  const p3 = { x: cx + w * 0.2, y: cy - h * 0.12 };
  const thickness = w * 0.045;

  function distToSegment(px, py, ax, ay, bx, by) {
    const abx = bx - ax, aby = by - ay;
    const apx = px - ax, apy = py - ay;
    const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / (abx * abx + aby * aby)));
    const cx2 = ax + t * abx, cy2 = ay + t * aby;
    return Math.hypot(px - cx2, py - cy2);
  }

  if (
    distToSegment(x, y, p1.x, p1.y, p2.x, p2.y) <= thickness ||
    distToSegment(x, y, p2.x, p2.y, p3.x, p3.y) <= thickness
  ) {
    return [...WHITE, 255];
  }

  return [...ACCENT, 255];
}

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });
for (const size of [192, 512]) {
  writePng(path.join(outDir, `icon-${size}.png`), size, tagIcon);
}
writePng(path.join(__dirname, '..', 'public', 'apple-touch-icon.png'), 180, tagIcon);
writePng(path.join(__dirname, '..', 'public', 'favicon.png'), 32, tagIcon);
console.log('Icons generated.');
