// node scratch/calendar/build-dance.js -> final/data/calendar-dance.bin
// Decodes the dance clip with ffmpeg at FPS into W x H rgb frames, maps every pixel onto Google Calendar's event palette
// through a hand-tuned codebook (each display colour has an "anchor" in the dim club footage's colour space, so a near-black
// floor becomes the light green field, dark hair becomes Basil, the denim jacket walks the blues), and writes:
//   'GCD1' u8 version, u16 w, u16 h, u16 frames, u16 fps*100, u8 paletteSize, paletteSize * rgb,
//   then per frame RLE pairs [runLength 1..255, index] until w*h pixels are covered,
// gzip-compressed (the page inflates it with DecompressionStream).
// PREVIEW=1 also writes scratch/calendar/preview-<n>.png contact sheets (each frame mode-downsampled to the desktop grid).
// SEG="a-b,c-d" picks source time ranges (seconds); SRC overrides the clip path.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..', '..');
const SRC = process.env.SRC || 'C:\\Users\\gaura\\Downloads\\Russian Kid Dancing - Velocity Edit.mp4';
// Two 8-beat (137 BPM) close-up stretches of the clip; the wide shots between them are crowded with other dancers
const SEG = (process.env.SEG || '14.2-17.724,8.1-11.624').split(',').map((s) => s.split('-').map(Number));
const FPS = +(process.env.FPS || 12.5);
const W = 128, H = 96;
const OUT = process.env.OUT || path.join(ROOT, 'final', 'data', 'calendar-dance.bin');

// [display hex, ...anchor hexes in source space]. Index 0 is the field, reached through the dark gate or its own anchors.
const CODEBOOK = [
    ['#58b450', '#4a1a8a', '#5a2ab0', '#3a1c70', '#6a3cc8', '#2a1a50'], // field; also swallows the violet club lights
    ['#0b8043', '#202326', '#1c2330', '#2a2622', '#30333a', '#2c2f38', '#383b42', '#3a3630'], // basil: hair, deep shadow
    ['#556857', '#4c4f56', '#464a58'],            // slate
    ['#616161', '#686a6f', '#605a54'],            // graphite
    ['#708a74', '#80848a'],                       // grey sage
    ['#a79b8e', '#a08a76', '#a89480'],            // birch
    ['#fafafa', '#e6e8ec', '#f4f4f4', '#d8dadf'], // white
    ['#d5f1f7', '#bfe0ea', '#b8d8e6'],            // ice
    ['#f3efd4', '#e2d8bc', '#dccfb0'],            // cream
    ['#f2d3ad', '#d6ae8c', '#c9a283'],            // sand (lit skin)
    ['#e67c73', '#b67462', '#a86a5c'],            // flamingo (skin)
    ['#f4511e', '#b85230', '#c06a3a'],            // tangerine
    ['#d50000', '#8e1c1c', '#a02622'],            // tomato
    ['#f6bf26', '#c8a034', '#b89a40'],            // banana
    ['#039be5', '#1c9ec8', '#28b0c0', '#3aa8b8'], // peacock (the cyan shirt)
    ['#3f51b5', '#1e2d58', '#24366a', '#2a3a62', '#34487a', '#3a4c80'], // blueberry
    ['#5469b1', '#40598e', '#46609a', '#3e5aa0'], // blue mid
    ['#7986cb', '#56669c', '#6070a6', '#6a7ab4'], // lavender
    ['#7192e9', '#4a78c0', '#5684cc', '#5a8ad8'], // cobalt soft
    ['#92adf1', '#88acdf', '#94b4e4'],            // sky
    ['#afc9f8', '#b6cfee', '#c0d6f2'],            // pale blue
];

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
function oklab(r, g, b) {
    r = lin(r); g = lin(g); b = lin(b);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const PALETTE = CODEBOOK.map((e) => hex(e[0]));
const ANCHORS = [];
CODEBOOK.forEach((e, i) => e.slice(1).forEach((a) => ANCHORS.push([i, oklab(...hex(a))])));

// The club footage is murky; the reference reads as saturated denim on white skin, so push it before matching
const EQ = process.env.EQ || 'saturation=1.45:contrast=1.12:gamma=1.04';
const DARK = +(process.env.DARK || 0.30);   // OKLab L below which the club floor reads as free time
const CHROMA_W = +(process.env.CW || 1.6);  // hue matters more than lightness for picking the event colour
const cache = new Map();
function quantize(r, g, b) {
    const key = (r >> 2) << 12 | (g >> 2) << 6 | (b >> 2);
    let v = cache.get(key);
    if (v !== undefined) return v;
    const [L, A, B] = oklab(r, g, b);
    if (L < DARK) v = 0;
    else {
        let best = 1e9;
        for (const [i, [l2, a2, b2]] of ANCHORS) {
            const d = (L - l2) ** 2 + CHROMA_W * ((A - a2) ** 2 + (B - b2) ** 2);
            if (d < best) { best = d; v = i; }
        }
    }
    cache.set(key, v);
    return v;
}

function decode([a, b]) {
    const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(a), '-t', String(b - a), '-i', SRC,
        '-vf', `fps=${FPS},scale=${W}:${H}:flags=area,eq=${EQ}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
    { maxBuffer: 1 << 28 });
    if (r.status) throw new Error(String(r.stderr));
    const n = Math.floor(r.stdout.length / (W * H * 3));
    return Array.from({ length: n }, (_, i) => r.stdout.subarray(i * W * H * 3, (i + 1) * W * H * 3));
}

// Isolated specks of one colour inside another read as compression noise, not as the dancer
function despeckle(q) {
    const out = Uint8Array.from(q);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, c = q[i];
        const n = [q[i - 1], q[i + 1], q[i - W], q[i + W]];
        if (n.every((v) => v !== c) && n[0] === n[1] && n[1] === n[2]) out[i] = n[0];
    }
    return out;
}

const frames = SEG.flatMap(decode).map((rgb) => {
    const q = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) q[i] = quantize(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]);
    return despeckle(q);
});

const head = Buffer.alloc(14);
head.write('GCD1', 0, 'ascii');
head.writeUInt8(1, 4);
head.writeUInt16LE(W, 5);
head.writeUInt16LE(H, 7);
head.writeUInt16LE(frames.length, 9);
head.writeUInt16LE(Math.round(FPS * 100), 11);
head.writeUInt8(PALETTE.length, 13);
const parts = [head, Buffer.from(PALETTE.flat())];
for (const q of frames) {
    const runs = [];
    for (let i = 0; i < q.length;) {
        let j = i + 1;
        while (j < q.length && q[j] === q[i] && j - i < 255) j++;
        runs.push(j - i, q[i]);
        i = j;
    }
    parts.push(Buffer.from(runs));
}
const raw = Buffer.concat(parts);
const gz = zlib.gzipSync(raw, { level: 9 });
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, gz);
console.log(`frames ${frames.length} @ ${FPS}fps, ${W}x${H}, rle ${raw.length} B, gzip ${gz.length} B -> ${path.relative(ROOT, OUT)}`);
const hist = new Array(PALETTE.length).fill(0);
frames.forEach((q) => q.forEach((v) => hist[v]++));
console.log('usage %', hist.map((h, i) => i + ':' + (100 * h / (frames.length * W * H)).toFixed(1)).join(' '));

if (process.env.PREVIEW) {
    // Desktop 1920x1080 grid: the clip spans 40 rows and ~47 cols (cells are 26.6 x 23.25 px)
    const GC = 47, GR = 40, S = 8, cols = +process.env.COLS || 10;
    const sheetFrames = frames.filter((_, i) => i % (+process.env.STEP || 2) === 0);
    const rowsN = Math.ceil(sheetFrames.length / cols);
    const SW = cols * GC * S, SH = rowsN * GR * S;
    const img = Buffer.alloc(SW * SH * 3, 40);
    sheetFrames.forEach((q, f) => {
        const ox = (f % cols) * GC * S, oy = Math.floor(f / cols) * GR * S;
        for (let gy = 0; gy < GR; gy++) for (let gx = 0; gx < GC; gx++) {
            const votes = new Map();
            for (let y = Math.floor(gy * H / GR); y < Math.ceil((gy + 1) * H / GR); y++)
                for (let x = Math.floor(gx * W / GC); x < Math.ceil((gx + 1) * W / GC); x++) {
                    const v = q[y * W + x];
                    votes.set(v, (votes.get(v) || 0) + (v === 0 ? 0.8 : 1));
                }
            let bv = 0, bc = -1;
            votes.forEach((c, v) => { if (c > bc) { bc = c; bv = v; } });
            const col = PALETTE[bv];
            for (let y = 1; y < S; y++) for (let x = 1; x < S; x++) {
                const o = ((oy + gy * S + y) * SW + ox + gx * S + x) * 3;
                img[o] = col[0]; img[o + 1] = col[1]; img[o + 2] = col[2];
            }
        }
    });
    const tmp = path.join(__dirname, '_sheet.rgb');
    fs.writeFileSync(tmp, img);
    const png = path.join(__dirname, 'preview-' + (process.env.NAME || '0') + '.png');
    spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', SW + 'x' + SH, '-i', tmp, png]);
    fs.unlinkSync(tmp);
    console.log('preview', path.relative(ROOT, png));
}
