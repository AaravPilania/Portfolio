const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function decodePNG(filePath) {
  const buf = fs.readFileSync(filePath);
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
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
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
      if (lum < 165) {
        grid[y * width + x] = 1;
      }
    }
  }

  return { width, height, grid };
}

const img = decodePNG(path.join(__dirname, '../public/images/me.png'));
const W = img.width;
const H = img.height;
const grid = img.grid;

function getVal(x, y) {
  if (x < 0 || x >= W || y < 0 || y >= H) return 0;
  return grid[y * W + x];
}

// Map of outgoing edges from vertex (vx, vy)
// Key: vx + ',' + vy
// Directed edge: keep 1 on the right.
// If grid[y, x] is 1:
// Top edge: (x, y) to (x+1, y) if above is 0. Directed from (x, y) to (x+1, y) (1 is below/right).
// Right edge: (x+1, y) to (x+1, y+1) if right is 0. Directed (x+1, y) to (x+1, y+1) (1 is left/right? wait!)
// Let's standardise: Clockwise for outer boundary:
// Pixel (x, y) has corners: Top-Left (x, y), Top-Right (x+1, y), Bottom-Right (x+1, y+1), Bottom-Left (x, y+1).
// Top edge (between (x, y-1)=0 and (x, y)=1): moves LEFT-to-RIGHT: (x, y) -> (x+1, y).
// Right edge (between (x+1, y)=0 and (x, y)=1): moves TOP-to-BOTTOM: (x+1, y) -> (x+1, y+1).
// Bottom edge (between (x, y+1)=0 and (x, y)=1): moves RIGHT-to-LEFT: (x+1, y+1) -> (x, y+1).
// Left edge (between (x-1, y)=0 and (x, y)=1): moves BOTTOM-to-TOP: (x, y+1) -> (x, y).

const edges = new Map();

function addEdge(x1, y1, x2, y2) {
  const k = `${x1},${y1}`;
  if (!edges.has(k)) edges.set(k, []);
  edges.get(k).push({ x: x2, y: y2 });
}

console.log('Finding boundary segments...');
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (grid[y * W + x] === 1) {
      // Check top
      if (getVal(x, y - 1) === 0) addEdge(x, y, x + 1, y);
      // Check right
      if (getVal(x + 1, y) === 0) addEdge(x + 1, y, x + 1, y + 1);
      // Check bottom
      if (getVal(x, y + 1) === 0) addEdge(x + 1, y + 1, x, y + 1);
      // Check left
      if (getVal(x - 1, y) === 0) addEdge(x, y + 1, x, y);
    }
  }
}

console.log(`Total edge start vertices: ${edges.size}`);

// Extract cycles
const loops = [];
const visitedStarts = new Set();

for (const [startK, nextList] of edges.entries()) {
  while (nextList.length > 0) {
    const loop = [];
    const [sx, sy] = startK.split(',').map(Number);
    let currX = sx, currY = sy;
    loop.push({ x: currX, y: currY });

    let safety = 0;
    while (safety++ < 1000000) {
      const k = `${currX},${currY}`;
      const list = edges.get(k);
      if (!list || list.length === 0) break;
      const next = list.pop();
      currX = next.x;
      currY = next.y;
      if (currX === sx && currY === sy) {
        // closed loop!
        break;
      }
      loop.push({ x: currX, y: currY });
    }

    if (loop.length >= 3) {
      loops.push(loop);
    }
  }
}

console.log(`Extracted ${loops.length} closed loops!`);

// Simplify loops by removing collinear points
function simplifyCollinear(pts) {
  if (pts.length < 3) return pts;
  const res = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];

    // Collinear if dx1*dy2 == dy1*dx2
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    if (dx1 * dy2 !== dy1 * dx2) {
      res.push(curr);
    }
  }
  return res;
}

// Ramer-Douglas-Peucker simplification
function rdp(points, epsilon) {
  if (points.length < 3) return points;

  function perpendicularDistance(p, p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const mag = Math.hypot(dx, dy);
    if (mag === 0) return Math.hypot(p.x - p1.x, p.y - p1.y);
    return Math.abs(dy * p.x - dx * p.y + p2.x * p1.y - p2.y * p1.x) / mag;
  }

  function rdpStep(pts, first, last) {
    let maxDist = 0;
    let index = 0;
    for (let i = first + 1; i < last; i++) {
      const dist = perpendicularDistance(pts[i], pts[first], pts[last]);
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }

    if (maxDist > epsilon) {
      const rec1 = rdpStep(pts, first, index);
      const rec2 = rdpStep(pts, index, last);
      return rec1.slice(0, -1).concat(rec2);
    } else {
      return [pts[first], pts[last]];
    }
  }

  // Split closed loop at point furthest from points[0]
  let maxD = 0, splitIdx = 1;
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i].x - points[0].x, points[i].y - points[0].y);
    if (d > maxD) {
      maxD = d;
      splitIdx = i;
    }
  }

  const half1 = points.slice(0, splitIdx + 1);
  const half2 = points.slice(splitIdx).concat([points[0]]);

  const sim1 = rdpStep(half1, 0, half1.length - 1);
  const sim2 = rdpStep(half2, 0, half2.length - 1);

  return sim1.slice(0, -1).concat(sim2.slice(0, -1));
}

let totalRawVerts = 0;
let totalCollinearVerts = 0;
let totalRdp1Verts = 0;
let totalRdp05Verts = 0;

const cleanLoops = [];

for (const loop of loops) {
  // Filter out tiny 1-2 pixel noise speckles (area < 4)
  if (loop.length < 4) continue;
  totalRawVerts += loop.length;
  const sc = simplifyCollinear(loop);
  totalCollinearVerts += sc.length;
  const sRdp = rdp(sc, 0.75); // 0.75px tolerance maintains hand-drawn precision completely
  totalRdp1Verts += sRdp.length;
  cleanLoops.push(sRdp);
}

console.log(`Raw vertices: ${totalRawVerts}`);
console.log(`After collinear removal: ${totalCollinearVerts}`);
console.log(`After RDP(0.75): ${totalRdp1Verts} in ${cleanLoops.length} loops`);
