// node scratch/calendar/build-dance.js -> final/data/calendar-dance.bin
// Cuts the dance clip into SEGMENTS (close-up -> mid -> small full figure, the framing arc of the reference reel), motion-
// interpolates each to 30 fps with ffmpeg (the source is 25 fps; at 30 every page frame pair gets a new pose), places each
// segment on a 4:3 "grid canvas" with its own scale/offset, maps every pixel onto Google Calendar's event palette through a
// hand-tuned codebook (anchors in the dim club footage's colour space: the near-black floor becomes free time, dark hair
// Basil, the denim jacket walks the blues, lit skin goes white) and writes:
//   'GCD2' u8 version, u16 w, u16 h, u16 frames, u16 fps*100, u8 paletteSize, paletteSize * rgb,
//   then frames * (w*h) palette indices, each XORed with the previous frame,
// gzip-compressed (the page inflates it with DecompressionStream).
// PREVIEW=1 also writes scratch/calendar/v2/dance-preview.png (every STEP-th frame at the desktop grid's resolution).
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..', '..');
const SRC = process.env.SRC || 'C:\\Users\\gaura\\Downloads\\Russian Kid Dancing - Velocity Edit.mp4';
const OUT = process.env.OUT || path.join(ROOT, 'final', 'data', 'calendar-dance.bin');
const FPS = 30;
// Dance length on the page: beat 11 to beat 37.5 of the 137 BPM loop
const N = Math.round(26.5 * 60 / 137.01 * FPS);
const W = 96, H = 72, SW = 192, SH = 144;

// [from, to] source seconds; s = source width as a fraction of the canvas; x, y = source top-left on the canvas (fractions).
// The reel opens on a torso close-up in the right half, widens to a centred mid shot, and ends on a small full figure.
const SEGMENTS = [
    { a: 2.80, b: 5.00, s: 1.15, x: 0.02, y: -0.06 },
    { a: 8.40, b: 10.80, s: 1.08, x: 0.02, y: -0.04 },
    { a: 14.20, b: 17.40, s: 0.96, x: 0.02, y: 0.04 },
    { a: 5.00, b: 5.60, s: 0.92, x: 0.02, y: 0.08 },
    { a: 7.90, b: 8.35, s: 0.90, x: 0.10, y: 0.10 },
    { a: 6.90, b: 7.90, s: 0.80, x: 0.30, y: 0.20 },
];

const DISPLAY = {
    field: '#53b44b', basil: '#0b8043', graphite: '#616161', white: '#fbfbfb', pale: '#a6c1f6', lavender: '#7986cb',
    cobalt: '#5482eb', blueberry: '#3f51b5', peacock: '#039be5', tomato: '#d50000', tangerine: '#f4511e', banana: '#f6bf26',
    flamingo: '#e67c73',
};
const NAMES = Object.keys(DISPLAY);
// [display, ...anchor hexes in source space]
const CODEBOOK = [
    ['field', '#4a1a8a', '#5a2ab0', '#3a1c70', '#6a3cc8', '#2a1a50'], // violet club lights read as free time
    ['basil', '#202326', '#1c2330', '#2a2622', '#30333a', '#2c2f38', '#383b42', '#3a3630'],
    ['graphite', '#4c4f56', '#464a58', '#686a6f', '#605a54', '#80848a', '#a08a76', '#a89480'],
    ['white', '#e6e8ec', '#f4f4f4', '#d8dadf', '#bfe0ea', '#b8d8e6', '#e2d8bc', '#dccfb0', '#d6ae8c', '#c9a283'],
    ['pale', '#88acdf', '#94b4e4', '#b6cfee', '#c0d6f2'],
    ['lavender', '#56669c', '#6070a6', '#6a7ab4'],
    ['cobalt', '#4a78c0', '#5684cc', '#5a8ad8'],
    ['blueberry', '#1e2d58', '#24366a', '#2a3a62', '#34487a', '#3a4c80', '#40598e', '#46609a', '#3e5aa0'],
    ['peacock', '#1c9ec8', '#28b0c0', '#3aa8b8'],
    ['tomato', '#8e1c1c', '#a02622'],
    ['tangerine', '#b85230', '#c06a3a'],
    ['banana', '#c8a034', '#b89a40'],
    ['flamingo', '#b67462', '#a86a5c'],
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
const PALETTE = NAMES.map((n) => hex(DISPLAY[n]));
const ANCHORS = [];
CODEBOOK.forEach(([name, ...as]) => as.forEach((a) => ANCHORS.push([NAMES.indexOf(name), oklab(...hex(a))])));

// The reel's dancer is contrasty (white highlights, deep blueberry jacket, Basil outline), so push contrast over saturation
const EQ = process.env.EQ || 'saturation=1.15:contrast=1.25:gamma=1.0';
const DARK = +(process.env.DARK || 0.22);   // OKLab L below which the club floor reads as free time
const CHROMA_W = +(process.env.CW || 1.6);
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

const totalSrc = SEGMENTS.reduce((s, g) => s + g.b - g.a, 0);
const stretch = N / FPS / totalSrc; // > 1 plays the clip slightly slower than life
function decode(seg, count) {
    const vf = `scale=${SW}:${SH}:flags=area,eq=${EQ},setpts=(PTS-STARTPTS)*${stretch.toFixed(5)},` +
        `minterpolate=fps=${FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=fdiff:scd_threshold=8`;
    const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(seg.a), '-t', String(seg.b - seg.a), '-i', SRC, '-vf', vf,
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 29 });
    if (r.status) throw new Error(String(r.stderr));
    const fs3 = SW * SH * 3, n = Math.floor(r.stdout.length / fs3);
    const out = [];
    for (let i = 0; i < count; i++) out.push(r.stdout.subarray(Math.min(i, n - 1) * fs3, (Math.min(i, n - 1) + 1) * fs3));
    return out;
}

function place(rgb, seg) {
    const q = new Uint8Array(W * H);
    for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
        const u = ((X + 0.5) / W - seg.x) / seg.s, v = ((Y + 0.5) / H - seg.y) / seg.s;
        if (u < 0 || v < 0 || u >= 1 || v >= 1) continue;
        // 2x2 box average around the source point
        const sx = Math.min(SW - 2, Math.floor(u * SW)), sy = Math.min(SH - 2, Math.floor(v * SH));
        let r = 0, g = 0, b = 0;
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
            const o = ((sy + dy) * SW + sx + dx) * 3;
            r += rgb[o]; g += rgb[o + 1]; b += rgb[o + 2];
        }
        q[Y * W + X] = quantize(r >> 2, g >> 2, b >> 2);
    }
    return solidify(despeckle(q));
}

// The reel's dancer is a solid silhouette: dark folds and hair inside it are Basil, never free time. Close the booked
// mask by CLOSE px, then everything the field can't reach from the canvas edge becomes Basil.
const CLOSE = +(process.env.CLOSE || 2);
function solidify(q) {
    const on = Uint8Array.from(q, (v) => (v ? 1 : 0));
    const morph = (src, grow) => {
        const out = new Uint8Array(W * H);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            let hit = !grow;
            for (let dy = -CLOSE; dy <= CLOSE && hit !== grow; dy++) for (let dx = -CLOSE; dx <= CLOSE; dx++) {
                if (Math.abs(dx) + Math.abs(dy) > CLOSE) continue;
                const xx = x + dx, yy = y + dy;
                const v = xx < 0 || yy < 0 || xx >= W || yy >= H ? 0 : src[yy * W + xx];
                if (grow ? v : !v) { hit = grow; break; }
            }
            out[y * W + x] = hit ? 1 : 0;
        }
        return out;
    };
    const closed = morph(morph(on, true), false);
    const outside = new Uint8Array(W * H), stack = [];
    for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
    for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
    while (stack.length) {
        const i = stack.pop();
        if (outside[i] || closed[i]) continue;
        outside[i] = 1;
        const x = i % W, y = (i - x) / W;
        if (x > 0) stack.push(i - 1);
        if (x < W - 1) stack.push(i + 1);
        if (y > 0) stack.push(i - W);
        if (y < H - 1) stack.push(i + W);
    }
    const out = Uint8Array.from(q);
    for (let i = 0; i < W * H; i++) if (!q[i] && !outside[i]) out[i] = NAMES.indexOf('basil');
    return out;
}

function despeckle(q) {
    const out = Uint8Array.from(q);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, c = q[i];
        const n = [q[i - 1], q[i + 1], q[i - W], q[i + W]];
        if (n.every((v) => v !== c) && n[0] === n[1] && n[1] === n[2]) out[i] = n[0];
    }
    return out;
}

const frames = [];
let acc = 0;
SEGMENTS.forEach((seg, i) => {
    acc += seg.b - seg.a;
    const want = (i === SEGMENTS.length - 1 ? N : Math.round(acc / totalSrc * N)) - frames.length;
    decode(seg, want).forEach((rgb) => frames.push(place(rgb, seg)));
    console.log(`segment ${seg.a}-${seg.b}s -> ${want} frames`);
});

const head = Buffer.alloc(14);
head.write('GCD2', 0, 'ascii');
head.writeUInt8(2, 4);
head.writeUInt16LE(W, 5);
head.writeUInt16LE(H, 7);
head.writeUInt16LE(frames.length, 9);
head.writeUInt16LE(FPS * 100, 11);
head.writeUInt8(PALETTE.length, 13);
const body = Buffer.alloc(frames.length * W * H);
frames.forEach((q, f) => {
    const prev = f ? frames[f - 1] : null;
    for (let i = 0; i < q.length; i++) body[f * W * H + i] = prev ? q[i] ^ prev[i] : q[i];
});
const gz = zlib.gzipSync(Buffer.concat([head, Buffer.from(PALETTE.flat()), body]), { level: 9 });
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, gz);
console.log(`frames ${frames.length} @ ${FPS}fps (clip x${(1 / stretch).toFixed(3)}), ${W}x${H}, gzip ${gz.length} B -> ${path.relative(ROOT, OUT)}`);
const hist = new Array(PALETTE.length).fill(0);
frames.forEach((q) => q.forEach((v) => hist[v]++));
console.log('usage %', hist.map((h, i) => NAMES[i] + ':' + (100 * h / (frames.length * W * H)).toFixed(1)).join(' '));

if (process.env.PREVIEW) {
    // The canvas spans ~34 x 32 cells of the 1920x1080 grid
    const GC = 34, GR = 32, S = 6, cols = +process.env.COLS || 12, step = +process.env.STEP || 6;
    const pick = frames.filter((_, i) => i % step === 0);
    const rowsN = Math.ceil(pick.length / cols);
    const IW = cols * GC * S, IH = rowsN * GR * S;
    const img = Buffer.alloc(IW * IH * 3, 40);
    pick.forEach((q, f) => {
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
                const o = ((oy + gy * S + y) * IW + ox + gx * S + x) * 3;
                img[o] = col[0]; img[o + 1] = col[1]; img[o + 2] = col[2];
            }
        }
    });
    const tmp = path.join(__dirname, '_sheet.rgb');
    fs.writeFileSync(tmp, img);
    const png = path.join(__dirname, 'v2', 'dance-preview.png');
    spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', IW + 'x' + IH, '-i', tmp, png]);
    fs.unlinkSync(tmp);
    console.log('preview', path.relative(ROOT, png));
}
