const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function decodePNG(filePath) {
  const buf = fs.readFileSync(filePath);
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
}

const { grid, W, H } = decodePNG(path.join(__dirname, '../public/images/me.png'));

// Build gridBaseWithLids
const gridBaseWithLids = new Uint8Array(grid);

// Left eye: erase eyeball part (y > topY + 11 in x=750..780)
for (let x = 750; x <= 780; x++) {
  let topY = -1;
  for (let y = 428; y <= 470; y++) {
    if (grid[y * W + x]) { topY = y; break; }
  }
  if (topY !== -1) {
    for (let y = topY + 11; y <= 470; y++) {
      gridBaseWithLids[y * W + x] = 0;
    }
  }
}

// Right eye: erase eyeball part (y > topY + 11 in x=884..914)
for (let x = 884; x <= 914; x++) {
  let topY = -1;
  for (let y = 410; y <= 450; y++) {
    if (grid[y * W + x]) { topY = y; break; }
  }
  if (topY !== -1) {
    for (let y = topY + 11; y <= 455; y++) {
      gridBaseWithLids[y * W + x] = 0;
    }
  }
}

function traceGridToLoops(g) {
  function getVal(x, y) {
    if (x < 0 || x >= W || y < 0 || y >= H) return 0;
    return g[y * W + x];
  }
  const DIR = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: -1 }
  ];
  const V_STRIDE = W + 1;
  const outgoing = new Map();
  function addEdge(x1, y1, dir) {
    const k = y1 * V_STRIDE + x1;
    if (!outgoing.has(k)) outgoing.set(k, []);
    const toX = x1 + DIR[dir].dx;
    const toY = y1 + DIR[dir].dy;
    outgoing.get(k).push({ dir, toX, toY });
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (g[y * W + x] === 1) {
        if (getVal(x, y - 1) === 0) addEdge(x, y, 0);
        if (getVal(x + 1, y) === 0) addEdge(x + 1, y, 1);
        if (getVal(x, y + 1) === 0) addEdge(x + 1, y + 1, 2);
        if (getVal(x - 1, y) === 0) addEdge(x, y + 1, 3);
      }
    }
  }

  const loops = [];
  for (const [startK, edgesList] of outgoing.entries()) {
    while (edgesList.length > 0) {
      const loop = [];
      const sx = startK % V_STRIDE;
      const sy = Math.floor(startK / V_STRIDE);
      let currX = sx, currY = sy;
      let currK = startK;
      let inDir = -1;
      loop.push({ x: currX, y: currY });

      let safety = 0;
      while (safety++ < 1000000) {
        const list = outgoing.get(currK);
        if (!list || list.length === 0) break;
        let bestIdx = 0;
        if (list.length > 1 && inDir >= 0) {
          let maxScore = -1;
          for (let i = 0; i < list.length; i++) {
            const rel = (list[i].dir - inDir + 4) % 4;
            let score = 0;
            if (rel === 1) score = 3;
            else if (rel === 0) score = 2;
            else if (rel === 3) score = 1;
            if (score > maxScore) { maxScore = score; bestIdx = i; }
          }
        }
        const edge = list.splice(bestIdx, 1)[0];
        currX = edge.toX;
        currY = edge.toY;
        currK = currY * V_STRIDE + currX;
        inDir = edge.dir;
        if (currX === sx && currY === sy) break;
        loop.push({ x: currX, y: currY });
      }
      if (loop.length >= 3) loops.push(loop);
    }
  }
  return loops;
}

function simplifyCollinear(pts) {
  if (pts.length < 3) return pts;
  const res = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n], curr = pts[i], next = pts[(i + 1) % n];
    const dx1 = curr.x - prev.x, dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x, dy2 = next.y - curr.y;
    if (dx1 * dy2 !== dy1 * dx2) res.push(curr);
  }
  return res;
}

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
    } else return [pts[first], pts[last]];
  }
  let maxD = 0, splitIdx = 1;
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i].x - points[0].x, points[i].y - points[0].y);
    if (d > maxD) { maxD = d; splitIdx = i; }
  }
  const half1 = points.slice(0, splitIdx + 1);
  const half2 = points.slice(splitIdx).concat([points[0]]);
  return rdpStep(half1, 0, half1.length - 1).slice(0, -1).concat(rdpStep(half2, 0, half2.length - 1).slice(0, -1));
}

function loopsToPathD(loopArray) {
  let d = '';
  for (const loop of loopArray) {
    if (loop.length < 4) continue;
    const sc = simplifyCollinear(loop);
    const pts = rdp(sc, 0.45);
    if (pts.length < 3) continue;
    d += `M${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) d += `L${pts[i].x} ${pts[i].y}`;
    d += 'Z';
  }
  return d;
}

console.log('Tracing base with static eyelids...');
const baseWithLidsLoops = traceGridToLoops(gridBaseWithLids);
const baseWithLidsPathD = loopsToPathD(baseWithLidsLoops);
console.log(`Base with eyelids: ${baseWithLidsLoops.length} loops, ${baseWithLidsPathD.length} chars.`);

// Left Eyeball oval parameters in me.png:
// Center: (765, 451), Radius X: 13.5, Radius Y: 17.5
// Right Eyeball oval parameters in me.png:
// Center: (900, 433), Radius X: 14.0, Radius Y: 18.0

const eyeConfig = {
  width: W,
  height: H,
  bgColor: '#fce03b',
  faceCenter: { x: 825, y: 460 },
  baseWithLidsPathD,
  leftEye: {
    cx: 765,
    cy: 451,
    rx: 13.5,
    ry: 17.5,
    // Catchlights (offsets from center)
    glint1: { dx: -4.5, dy: -5.5, r: 2.8 },
    glint2: { dx: 3.5, dy: 4.5, r: 1.4 },
    // Eyelid stroke clipping/masking bounds
    travelX: 11.0,
    travelY: 6.5
  },
  rightEye: {
    cx: 900,
    cy: 433,
    rx: 14.0,
    ry: 18.0,
    glint1: { dx: -4.5, dy: -5.5, r: 2.8 },
    glint2: { dx: 3.5, dy: 4.5, r: 1.4 },
    travelX: 11.0,
    travelY: 6.5
  }
};

fs.writeFileSync(path.join(__dirname, '../public/portrait_eyeballs_config.json'), JSON.stringify(eyeConfig));
console.log('Saved portrait_eyeballs_config.json');
