const fs = require('fs');
const path = require('path');

// Let's create a pixel-accurate separation of Eyelid vs Eyeball for both eyes
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

// Create grid copies:
// 1. gridLids: contains base portrait + static eyelids
// 2. gridLeftBall: contains left eyeball oval (with top filled so it's a complete full oval)
// 3. gridRightBall: contains right eyeball oval (with top filled so it's a complete full oval)

const gridBaseWithLids = new Uint8Array(grid);
const gridLeftBall = new Uint8Array(W * H);
const gridRightBall = new Uint8Array(W * H);

// Left Eye:
// Eyelid line: from x=731..781, top edge is topY, bottom edge is topY + 11.
// Eyeball: from x=750..777, y is from ~438 to 469.
// To make the eyeball a complete oval even when looking down, we complete its top contour!
// Left eyeball center: cx = 764, cy = 453, rx = 13.5, ry = 15.5
for (let y = 432; y <= 472; y++) {
  for (let x = 748; x <= 782; x++) {
    // Check if inside eyeball oval
    const dx = (x - 764) / 13.5;
    const dy = (y - 453) / 15.5;
    if (dx * dx + dy * dy <= 1.0) {
      gridLeftBall[y * W + x] = 1;
    }
  }
}

// In gridBaseWithLids, erase the eyeball part below the eyelid so only the eyelid remains!
for (let y = 428; y <= 472; y++) {
  for (let x = 730; x <= 784; x++) {
    if (grid[y * W + x]) {
      // Find topY for this x
      let topY = -1;
      for (let ty = 428; ty <= 470; ty++) {
        if (grid[ty * W + x]) { topY = ty; break; }
      }
      // Eyelid thickness is ~11px
      if (y > topY + 11) {
        gridBaseWithLids[y * W + x] = 0; // erase eyeball from base
      }
    }
  }
}

// Right Eye:
// Right eyeball center: cx = 900, cy = 434, rx = 14, ry = 16.5
for (let y = 415; y <= 455; y++) {
  for (let x = 884; x <= 918; x++) {
    const dx = (x - 900) / 14;
    const dy = (y - 434) / 16.5;
    if (dx * dx + dy * dy <= 1.0) {
      gridRightBall[y * W + x] = 1;
    }
  }
}

for (let y = 410; y <= 455; y++) {
  for (let x = 864; x <= 918; x++) {
    if (grid[y * W + x]) {
      let topY = -1;
      for (let ty = 410; ty <= 450; ty++) {
        if (grid[ty * W + x]) { topY = ty; break; }
      }
      if (y > topY + 11) {
        gridBaseWithLids[y * W + x] = 0;
      }
    }
  }
}

console.log('Grids separated successfully!');
