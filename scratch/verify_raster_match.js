const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Let's test if there are ambiguous vertices in edges map
const { img, grid, W, H } = (function() {
  const buf = fs.readFileSync(path.join(__dirname, '../public/images/me.png'));
  let pos = 8;
  let width, height, bitDepth, colorType;
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
  let bytesPerPixel = colorType === 2 ? 3 : colorType === 6 ? 4 : 1;
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

function getVal(x, y) {
  if (x < 0 || x >= W || y < 0 || y >= H) return 0;
  return grid[y * W + x];
}

const edges = new Map();
function addEdge(x1, y1, x2, y2) {
  const k = `${x1},${y1}`;
  if (!edges.has(k)) edges.set(k, []);
  edges.get(k).push({ x: x2, y: y2 });
}

let multiOutCount = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (grid[y * W + x] === 1) {
      if (getVal(x, y - 1) === 0) addEdge(x, y, x + 1, y);
      if (getVal(x + 1, y) === 0) addEdge(x + 1, y, x + 1, y + 1);
      if (getVal(x, y + 1) === 0) addEdge(x + 1, y + 1, x, y + 1);
      if (getVal(x - 1, y) === 0) addEdge(x, y + 1, x, y);
    }
  }
}

for (const [k, list] of edges.entries()) {
  if (list.length > 1) multiOutCount++;
}

console.log(`Total vertices: ${edges.size}, vertices with multiple outgoing edges: ${multiOutCount}`);
