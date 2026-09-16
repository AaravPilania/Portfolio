const fs = require('fs');
const path = require('path');

// Let's inspect the loops around the eyes
// In me.png (1672x941), let's find where the eyes are located
const { grid, W, H } = (function() {
  const buf = fs.readFileSync(path.join(__dirname, '../public/images/me.png'));
  const zlib = require('zlib');
  let pos = 8, width, height, bitDepth, colorType;
  const idatChunks = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.slice(pos + 4, pos + 8).toString('ascii');
    const data = buf.slice(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') idatChunks.push(data);
    else if (type === 'IEND') break;
  }
  const compressed = Buffer.concat(idatChunks);
  const decompressed = zlib.inflateSync(compressed);
  let bytesPerPixel = colorType === 2 ? 3 : 4;
  const rowSize = 1 + width * bytesPerPixel;
  const grid = new Uint8Array(width * height);
  let prevRow = Buffer.alloc(width * bytesPerPixel);
  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    const filter = decompressed[rowStart];
    const currRow = Buffer.alloc(width * bytesPerPixel);
    for (let x = 0; x < width * bytesPerPixel; x++) {
      const raw = decompressed[rowStart + 1 + x];
      const a = x >= bytesPerPixel ? currRow[x - bytesPerPixel] : 0;
      const b = prevRow[x];
      const c = x >= bytesPerPixel ? prevRow[x - bytesPerPixel] : 0;
      let val = raw;
      if (filter === 1) val = (raw + a) & 0xff;
      else if (filter === 2) val = (raw + b) & 0xff;
      else if (filter === 3) val = (raw + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        val = (raw + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
      }
      currRow[x] = val;
    }
    prevRow = currRow;
    for (let x = 0; x < width; x++) {
      const r = currRow[x * bytesPerPixel];
      const g = currRow[x * bytesPerPixel + 1];
      const b = currRow[x * bytesPerPixel + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < 165) grid[y * width + x] = 1;
    }
  }
  return { grid, W: width, H: height };
})();

// Find isolated connected components in the face area (y between 380 and 520, x between 650 and 950)
// Let's do a flood fill / connected component labeling
const visited = new Uint8Array(W * H);
const components = [];

for (let y = 350; y < 550; y++) {
  for (let x = 650; x < 950; x++) {
    if (grid[y * W + x] === 1 && !visited[y * W + x]) {
      const comp = [];
      const queue = [x, y];
      visited[y * W + x] = 1;
      let qHead = 0;
      let minX = x, maxX = x, minY = y, maxY = y;

      while (qHead < queue.length) {
        const cx = queue[qHead++];
        const cy = queue[qHead++];
        comp.push({ x: cx, y: cy });
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors = [
          cx + 1, cy,
          cx - 1, cy,
          cx, cy + 1,
          cx, cy - 1
        ];
        for (let i = 0; i < neighbors.length; i += 2) {
          const nx = neighbors[i], ny = neighbors[i + 1];
          if (nx >= 0 && nx < W && ny >= 0 && ny < H && grid[ny * W + nx] === 1 && !visited[ny * W + nx]) {
            visited[ny * W + nx] = 1;
            queue.push(nx, ny);
          }
        }
      }

      components.push({
        pixels: comp.length,
        box: { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 },
        cx: Math.round((minX + maxX) / 2),
        cy: Math.round((minY + maxY) / 2)
      });
    }
  }
}

components.sort((a, b) => b.pixels - a.pixels);
console.log('Found components in face area:', components.slice(0, 20));
