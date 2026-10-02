// node scratch/calendar/v5/hist.js -> palette usage and per-column run stats of final/data/calendar-dance.bin
const fs = require('fs');
const path = require('path');
let buf = fs.readFileSync(path.join(__dirname, '../../../final/data/calendar-dance.bin'));
if (buf[0] === 0x1f) buf = require('zlib').gunzipSync(buf);
const w = buf.readUInt16LE(5), h = buf.readUInt16LE(7), n = buf.readUInt16LE(9), np = buf[13];
const pal = [];
for (let i = 0; i < np; i++) pal.push('#' + [0, 1, 2].map((k) => buf[14 + i * 3 + k].toString(16).padStart(2, '0')).join(''));
const p = 14 + np * 3, size = w * h, fr = new Uint8Array(n * size);
for (let i = 0; i < n * size; i++) fr[i] = i < size ? buf[p + i] : buf[p + i] ^ fr[i - size];
const cnt = new Array(np).fill(0);
for (const v of fr) cnt[v]++;
console.log({ w, h, n, np });
pal.forEach((c, i) => console.log(i, c, (cnt[i] / fr.length * 100).toFixed(2) + '%'));
let runs = 0, maxRuns = 0, changed = 0;
for (let f = 0; f < n; f++) {
    let fr0 = 0;
    for (let c = 0; c < w; c++) {
        let k = 0;
        for (let r = 0; r < h; r++) { const v = fr[f * size + r * w + c]; if (v && (r === 0 || fr[f * size + (r - 1) * w + c] !== v)) k++; }
        fr0 += k; maxRuns = Math.max(maxRuns, k);
    }
    runs += fr0;
    if (f) for (let i = 0; i < size; i++) if (fr[f * size + i] !== fr[(f - 1) * size + i]) changed++;
}
console.log('ink runs/frame', (runs / n).toFixed(1), 'max runs/column', maxRuns, 'changed cells/step', (changed / (n - 1)).toFixed(1));
