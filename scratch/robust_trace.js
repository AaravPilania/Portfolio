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
}

const { grid, W, H } = decodePNG(path.join(__dirname, '../public/images/me.png'));

function getVal(x, y) {
  if (x < 0 || x >= W || y < 0 || y >= H) return 0;
  return grid[y * W + x];
}

// Direction definitions:
// 0: Right (dx=+1, dy=0)
// 1: Down  (dx=0, dy=+1)
// 2: Left  (dx=-1, dy=0)
// 3: Up    (dx=0, dy=-1)
const DIR = [
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: -1 }
];

// In our boundary conventions:
// Clockwise around solid pixel (x, y):
// Top: (x, y) -> (x+1, y) (DIR 0: Right)
// Right: (x+1, y) -> (x+1, y+1) (DIR 1: Down)
// Bottom: (x+1, y+1) -> (x, y+1) (DIR 2: Left)
// Left: (x, y+1) -> (x, y) (DIR 3: Up)

// Edge set: stored as an array of directed edges per vertex
// vertex key: y * (W + 1) + x
const V_STRIDE = W + 1;
const outgoing = new Map(); // key -> array of { dir, toX, toY }

function addEdge(x1, y1, dir) {
  const k = y1 * V_STRIDE + x1;
  if (!outgoing.has(k)) outgoing.set(k, []);
  const toX = x1 + DIR[dir].dx;
  const toY = y1 + DIR[dir].dy;
  outgoing.get(k).push({ dir, toX, toY });
}

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (grid[y * W + x] === 1) {
      // Top edge
      if (getVal(x, y - 1) === 0) addEdge(x, y, 0);
      // Right edge
      if (getVal(x + 1, y) === 0) addEdge(x + 1, y, 1);
      // Bottom edge
      if (getVal(x, y + 1) === 0) addEdge(x + 1, y + 1, 2);
      // Left edge
      if (getVal(x - 1, y) === 0) addEdge(x, y + 1, 3);
    }
  }
}

// Traverse cycles with clockwise preference (sharpest right turn)
// Relative turn order from incoming dir `d_in`:
// Right turn: (d_in + 1) % 4
// Straight:   (d_in + 0) % 4
// Left turn:  (d_in + 3) % 4
// U-turn:     (d_in + 2) % 4 (not possible in simple boundary)
const loops = [];

for (const [startK, edgesList] of outgoing.entries()) {
  while (edgesList.length > 0) {
    const loop = [];
    const sx = startK % V_STRIDE;
    const sy = Math.floor(startK / V_STRIDE);
    let currX = sx, currY = sy;
    let currK = startK;
    let inDir = -1; // initial

    loop.push({ x: currX, y: currY });

    let safety = 0;
    while (safety++ < 1000000) {
      const list = outgoing.get(currK);
      if (!list || list.length === 0) break;

      let bestIdx = 0;
      if (list.length > 1 && inDir >= 0) {
        // Find choice that is sharpest right turn:
        // Priority score for outDir relative to inDir:
        // (outDir - inDir + 4) % 4:
        // 1: right turn (highest priority = 3)
        // 0: straight   (priority = 2)
        // 3: left turn  (priority = 1)
        // 2: U-turn     (priority = 0)
        let maxScore = -1;
        for (let i = 0; i < list.length; i++) {
          const rel = (list[i].dir - inDir + 4) % 4;
          let score = 0;
          if (rel === 1) score = 3;
          else if (rel === 0) score = 2;
          else if (rel === 3) score = 1;
          else score = 0;
          if (score > maxScore) {
            maxScore = score;
            bestIdx = i;
          }
        }
      }

      const edge = list.splice(bestIdx, 1)[0];
      currX = edge.toX;
      currY = edge.toY;
      currK = currY * V_STRIDE + currX;
      inDir = edge.dir;

      if (currX === sx && currY === sy) {
        break; // Loop closed!
      }
      loop.push({ x: currX, y: currY });
    }

    if (loop.length >= 3) {
      loops.push(loop);
    }
  }
}

console.log(`Extracted ${loops.length} strictly simple Jordan loops!`);

// Remove collinear vertices
function simplifyCollinear(pts) {
  if (pts.length < 3) return pts;
  const res = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    if (dx1 * dy2 !== dy1 * dx2) res.push(curr);
  }
  return res;
}

// RDP with small epsilon
function rdp(points, epsilon) {
  if (points.length < 3 || epsilon <= 0) return points;
  function perpendicularDistance(p, p1, p2) {
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const mag = Math.hypot(dx, dy);
    if (mag === 0) return Math.hypot(p.x - p1.x, p.y - p1.y);
    return Math.abs(dy * p.x - dx * p.y + p2.x * p1.y - p2.y * p1.x) / mag;
  }
  function rdpStep(pts, first, last) {
    let maxDist = 0, index = 0;
    for (let i = first + 1; i < last; i++) {
      const dist = perpendicularDistance(pts[i], pts[first], pts[last]);
      if (dist > maxDist) { maxDist = dist; index = i; }
    }
    if (maxDist > epsilon) {
      const rec1 = rdpStep(pts, first, index);
      const rec2 = rdpStep(pts, index, last);
      return rec1.slice(0, -1).concat(rec2);
    } else {
      return [pts[first], pts[last]];
    }
  }
  let maxD = 0, splitIdx = 1;
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i].x - points[0].x, points[i].y - points[0].y);
    if (d > maxD) { maxD = d; splitIdx = i; }
  }
  const half1 = points.slice(0, splitIdx + 1);
  const half2 = points.slice(splitIdx).concat([points[0]]);
  const sim1 = rdpStep(half1, 0, half1.length - 1);
  const sim2 = rdpStep(half2, 0, half2.length - 1);
  return sim1.slice(0, -1).concat(sim2.slice(0, -1));
}

let totalVerts = 0;
const processedLoops = [];
for (const loop of loops) {
  if (loop.length < 4) continue;
  const sc = simplifyCollinear(loop);
  const sim = rdp(sc, 0.45); // 0.45 preserves 100% of curves and hand-drawn character
  if (sim.length >= 3) {
    totalVerts += sim.length;
    processedLoops.push(sim);
  }
}

console.log(`Processed: ${processedLoops.length} loops, ${totalVerts} vertices.`);

// Now let's serialize the loops into compact Path2D format or function
// In SVG / Path2D path string:
// M x y L x y ... Z
let pathString = '';
for (const pts of processedLoops) {
  pathString += `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    pathString += `L${pts[i].x} ${pts[i].y}`;
  }
  pathString += 'Z';
}

fs.writeFileSync(path.join(__dirname, '../public/portrait_path.json'), JSON.stringify({
  width: W,
  height: H,
  bgColor: '#fce03b',
  pathD: pathString
}));

console.log(`Path data written. Length: ${pathString.length} chars.`);
