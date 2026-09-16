const fs = require('fs');
const path = require('path');

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

console.log('RIGHT EYE PROFILE:');
for (let x = 864; x <= 918; x++) {
  let topY = -1, botY = -1;
  for (let y = 410; y <= 453; y++) {
    if (grid[y * W + x]) {
      if (topY === -1) topY = y;
      botY = y;
    }
  }
  console.log(`x=${x}: topY=${topY}, botY=${botY}, thickness=${botY - topY + 1}`);
}
