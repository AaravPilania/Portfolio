const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function decodePNG(filePath) {
  const buf = fs.readFileSync(filePath);
  let pos = 8; // skip signature
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
      console.log(`PNG IHDR: ${width}x${height}, bitDepth=${bitDepth}, colorType=${colorType}`);
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  const compressed = Buffer.concat(idatChunks);
  const decompressed = zlib.inflateSync(compressed);

  // Channels based on colorType:
  // 0: Grayscale (1)
  // 2: RGB (3)
  // 3: Palette (1)
  // 4: Gray+Alpha (2)
  // 6: RGBA (4)
  let bytesPerPixel = 4;
  if (colorType === 2) bytesPerPixel = 3;
  else if (colorType === 6) bytesPerPixel = 4;
  else if (colorType === 0) bytesPerPixel = 1;

  const rowSize = 1 + width * bytesPerPixel;
  const pixels = Buffer.alloc(width * height * 4);

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
      if (filter === 1) { // Sub
        val = (raw + a) & 0xff;
      } else if (filter === 2) { // Up
        val = (raw + b) & 0xff;
      } else if (filter === 3) { // Average
        val = (raw + Math.floor((a + b) / 2)) & 0xff;
      } else if (filter === 4) { // Paeth
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        let pr;
        if (pa <= pb && pa <= pc) pr = a;
        else if (pb <= pc) pr = b;
        else pr = c;
        val = (raw + pr) & 0xff;
      }
      currRow[x] = val;
    }

    prevRow = currRow;

    // Convert currRow to RGBA in pixels buffer
    for (let x = 0; x < width; x++) {
      const outIdx = (y * width + x) * 4;
      if (bytesPerPixel === 4) {
        pixels[outIdx] = currRow[x * 4];
        pixels[outIdx + 1] = currRow[x * 4 + 1];
        pixels[outIdx + 2] = currRow[x * 4 + 2];
        pixels[outIdx + 3] = currRow[x * 4 + 3];
      } else if (bytesPerPixel === 3) {
        pixels[outIdx] = currRow[x * 3];
        pixels[outIdx + 1] = currRow[x * 3 + 1];
        pixels[outIdx + 2] = currRow[x * 3 + 2];
        pixels[outIdx + 3] = 255;
      }
    }
  }

  return { width, height, pixels };
}

const imgPath = path.join(__dirname, '../public/images/me.png');
const img = decodePNG(imgPath);

// Sample background color (top-left)
const bgR = img.pixels[0], bgG = img.pixels[1], bgB = img.pixels[2];
console.log(`Background color RGB: (${bgR}, ${bgG}, ${bgB}) -> #${bgR.toString(16).padStart(2,'0')}${bgG.toString(16).padStart(2,'0')}${bgB.toString(16).padStart(2,'0')}`);

// Find bounding box of ink (dark pixels where luminance < 180 or distance from yellow > 50)
let minX = img.width, maxX = 0, minY = img.height, maxY = 0;
let inkCount = 0;

for (let y = 0; y < img.height; y++) {
  for (let x = 0; x < img.width; x++) {
    const idx = (y * img.width + x) * 4;
    const r = img.pixels[idx], g = img.pixels[idx + 1], b = img.pixels[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 180) {
      inkCount++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

console.log(`Ink Bounding Box: [${minX}, ${minY}] to [${maxX}, ${maxY}], width=${maxX - minX + 1}, height=${maxY - minY + 1}`);
console.log(`Total ink pixels: ${inkCount}`);
