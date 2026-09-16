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

// In me.png:
// Left eyeball lower half is present at x in [754, 781], y in [440, 469].
// Upper half connects to the eyelid.
// To make the hand-drawn eyeball a complete closed shape with authentic hand-drawn texture:
// Let's extract the lower perimeter directly from me.png, and mirror the top with organic jitter!
// Or: extract the exact grid of the eyeball!

function traceContour(g, minX, minY, maxX, maxY) {
  function getVal(x, y) {
    if (x < minX || x > maxX || y < minY || y > maxY) return 0;
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
    outgoing.get(k).push({ dir, toX: x1 + DIR[dir].dx, toY: y1 + DIR[dir].dy });
  }

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
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
      while (safety++ < 100000) {
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

// Let's create an authentic hand-drawn eyeball mask for Left Eye:
// Center: (765, 452)
// In me.png, y in [441, 469] is pure original hand-drawn ink!
// For top part y in [434, 440], complete the dome with identical hand-drawn ink texture from me.png!
const gridLeftEyeBall = new Uint8Array(W * H);
for (let y = 433; y <= 471; y++) {
  for (let x = 750; x <= 782; x++) {
    if (y >= 441 && y <= 469) {
      // Use exact original pixels from me.png
      if (grid[y * W + x]) gridLeftEyeBall[y * W + x] = 1;
    } else if (y < 441) {
      // Mirror bottom hand-drawn contour around y=452 to get identical organic edge
      const mirrorY = 452 + (452 - y);
      if (mirrorY <= 469 && grid[mirrorY * W + x]) {
        gridLeftEyeBall[y * W + x] = 1;
      }
    }
  }
}

// Right eyeball:
// Center: (900, 434)
const gridRightEyeBall = new Uint8Array(W * H);
for (let y = 416; y <= 453; y++) {
  for (let x = 884; x <= 916; x++) {
    if (y >= 424 && y <= 451) {
      if (grid[y * W + x]) gridRightEyeBall[y * W + x] = 1;
    } else if (y < 424) {
      const mirrorY = 434 + (434 - y);
      if (mirrorY <= 451 && grid[mirrorY * W + x]) {
        gridRightEyeBall[y * W + x] = 1;
      }
    }
  }
}

const leftLoops = traceContour(gridLeftEyeBall, 748, 430, 784, 474);
const rightLoops = traceContour(gridRightEyeBall, 882, 414, 918, 456);

console.log('Left eyeball loops:', leftLoops.length, 'Right eyeball loops:', rightLoops.length);

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

// Convert loop to relative coordinates around center:
function toRelativePath(pts, cx, cy) {
  const sc = simplifyCollinear(pts);
  const sim = rdp(sc, 0.4);
  let d = `M${sim[0].x - cx} ${sim[0].y - cy}`;
  for (let i = 1; i < sim.length; i++) {
    d += `L${sim[i].x - cx} ${sim[i].y - cy}`;
  }
  d += 'Z';
  return d;
}

const leftRelPathD = toRelativePath(leftLoops[0], 765, 452);
const rightRelPathD = toRelativePath(rightLoops[0], 900, 434);

console.log('Left relative hand-drawn path:', leftRelPathD);
console.log('Right relative hand-drawn path:', rightRelPathD);

const result = {
  left: {
    cx: 765,
    cy: 452,
    relPathD: leftRelPathD,
    glint1: { dx: -4.5, dy: -5.5, rx: 2.6, ry: 2.2, rot: -0.2 },
    glint2: { dx: 3.5, dy: 4.5, rx: 1.4, ry: 1.1, rot: 0.1 }
  },
  right: {
    cx: 900,
    cy: 434,
    relPathD: rightRelPathD,
    glint1: { dx: -4.5, dy: -5.5, rx: 2.6, ry: 2.2, rot: -0.2 },
    glint2: { dx: 3.5, dy: 4.5, rx: 1.4, ry: 1.1, rot: 0.1 }
  }
};

fs.writeFileSync(path.join(__dirname, '../public/hand_drawn_eyeballs.json'), JSON.stringify(result, null, 2));
console.log('Saved public/hand_drawn_eyeballs.json');
