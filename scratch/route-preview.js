// node scratch/route-preview.js -> scratch/route-<size>.png
// The paper plane's flight as the page draws it (cells under the round-capped stroke, the seeded broken-screen fill, a
// red/cyan ghost either side), the clearance halo round the words, GLITCH's stops at each detent (green take-off, white
// in between, red landing) and the portrait's eyes (green crosshairs). Sizes with a marker-free page screenshot in
// scratch/eyes/bg-<w>.png are laid over it.
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { planRoute, ribbonCells, eyeSpots } = require(path.join(__dirname, '..', 'final', 'js', 'skills-wheel.js'));

// Measured on the page with slide 04 stuck (scratch/eyes/probe.js): every category's words and skills, the star's centre
const LAYOUTS = {
    '1920x1080': { w: 1920, h: 1080, words: { l: 549, t: 397, r: 1308, b: 659 }, list: { l: 1558, t: 412, r: 1866, b: 673 }, starX: 68 },
    '1366x768': { w: 1366, h: 768, words: { l: 390, t: 278, r: 930, b: 469 }, list: { l: 1087, t: 286, r: 1324, b: 487 }, starX: 48 },
    '1024x515': { w: 1024, h: 515, words: { l: 293, t: 171, r: 697, b: 321 }, list: { l: 800, t: 178, r: 992, b: 341 }, starX: 36 },
    '390x844': { w: 390, h: 844, words: { l: 172, t: 305, r: 370, b: 386 }, list: { l: 173, t: 373, r: 340, b: 520 }, starX: 30 },
};

const crcT = [];
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcT[n] = c >>> 0;
}
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function encode(w, h, px) {
    const chunk = (type, data) => {
        const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
        const td = Buffer.concat([Buffer.from(type), data]);
        const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
        return Buffer.concat([len, td, c]);
    };
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) px.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
// 8-bit RGB / RGBA, non-interlaced
function decode(buf) {
    let p = 8, w = 0, h = 0, type = 0;
    const idat = [];
    while (p < buf.length) {
        const len = buf.readUInt32BE(p), t = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
        if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); type = d[9]; if (d[8] !== 8 || d[12]) return null; }
        if (t === 'IDAT') idat.push(d);
        p += 12 + len;
    }
    const bpp = type === 6 ? 4 : type === 2 ? 3 : 0;
    if (!bpp) return null;
    const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, out = Buffer.alloc(w * h * 3);
    let prev = Buffer.alloc(stride);
    for (let y = 0; y < h; y++) {
        const f = raw[y * (stride + 1)], line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
        for (let i = 0; i < stride; i++) {
            const a = i >= bpp ? line[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
            const pr = a + b - c, pa = Math.abs(pr - a), pb = Math.abs(pr - b), pc = Math.abs(pr - c);
            line[i] = (line[i] + (f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : f === 4 ? (pa <= pb && pa <= pc ? a : pb <= pc ? b : c) : 0)) & 255;
        }
        for (let x = 0; x < w; x++) for (let k = 0; k < 3; k++) out[(y * w + x) * 3 + k] = line[x * bpp + k];
        prev = line;
    }
    return { w, h, px: out };
}

const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const FILL = ['#3b0710', '', '#ff1fd0', '#18f0ff', '#22ff5a', '#ff1e2d', '#d90018', '#fff6f0', '#ff4a3d', '#99000f', '#2a4bff'].map((c) => c && hex(c));
const SUB = [[255, 0, 0], [0, 255, 0], [0, 0, 255]];
Object.entries(LAYOUTS).forEach(([key, L]) => {
    const { w, h } = L;
    const bg = path.join(__dirname, 'eyes', 'bg-' + w + '.png');
    const shot = fs.existsSync(bg) ? decode(fs.readFileSync(bg)) : null;
    const ribbonW = Math.max(12, w * 0.018), half = ribbonW / 2, cell = Math.max(3, ribbonW / 7);
    const clear = half + Math.max(8, w * 0.008);
    const S = Math.round(Math.min(w, h) * (w < 650 ? 0.7 : 0.58));
    const spot = eyeSpots(w, h);
    const plan = planRoute({ w, h, words: L.words, list: L.list, clear, half, inset: 36, star: { x: L.starX, y: h / 2, r: S * 0.375 }, eyes: spot.eyes, eyeR: spot.r });
    const cells = ribbonCells(plan.route, { cell, half, seed: 0x5ced04 });
    const px = Buffer.alloc(w * h * 3);
    const set = (x, y, c, a) => {
        x = Math.floor(x); y = Math.floor(y);
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const i = (y * w + x) * 3;
        for (let k = 0; k < 3; k++) px[i + k] = a === undefined ? c[k] : px[i + k] * (1 - a) + c[k] * a;
    };
    const useShot = shot && shot.w === w && shot.h === h;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (useShot) {
            const i = (y * w + x) * 3;
            px[i] = shot.px[i]; px[i + 1] = shot.px[i + 1]; px[i + 2] = shot.px[i + 2];
            continue;
        }
        const d = Math.min(...[L.words, L.list].map((r) => Math.hypot(Math.max(r.l - x, 0, x - r.r), Math.max(r.t - y, 0, y - r.b))));
        set(x, y, d === 0 ? [255, 237, 41] : d < clear ? [40, 26, 34] : [10, 10, 12]);
    }
    if (useShot) {
        [L.words, L.list].forEach((r) => {
            for (let x = r.l - clear; x <= r.r + clear; x++) { set(x, r.t - clear, [120, 120, 255]); set(x, r.b + clear, [120, 120, 255]); }
            for (let y = r.t - clear; y <= r.b + clear; y++) { set(r.l - clear, y, [120, 120, 255]); set(r.r + clear, y, [120, 120, 255]); }
        });
    }
    // The page lights a cell when the stroke covers half of it; its centre lying within the half-width is the same test
    const lit = new Set();
    for (let s = 0; s <= plan.route.L; s += cell * 0.4) {
        const p = plan.route.atS(s);
        for (let gx = Math.floor((p.x - half) / cell); gx <= Math.floor((p.x + half) / cell); gx++) {
            for (let gy = Math.floor((p.y - half) / cell); gy <= Math.floor((p.y + half) / cell); gy++) {
                if (Math.hypot((gx + 0.5) * cell - p.x, (gy + 0.5) * cell - p.y) <= half) lit.add(gx + ',' + gy);
            }
        }
    }
    const byKey = new Map(cells.map((c) => [c.gx + ',' + c.gy, c]));
    const fr = 1.5;
    lit.forEach((k) => {
        const [gx, gy] = k.split(',').map(Number);
        if (!lit.has((gx - 1) + ',' + gy)) for (let y = gy * cell; y < (gy + 1) * cell; y++) for (let x = gx * cell - fr; x < gx * cell; x++) set(x, y, [255, 0, 64], 0.6);
        if (!lit.has((gx + 1) + ',' + gy)) for (let y = gy * cell; y < (gy + 1) * cell; y++) for (let x = (gx + 1) * cell; x < (gx + 1) * cell + fr; x++) set(x, y, [0, 229, 255], 0.6);
    });
    lit.forEach((k) => {
        const c = byKey.get(k);
        if (!c) return;
        for (let y = c.gy * cell; y < (c.gy + 1) * cell; y++) for (let x = c.gx * cell; x < (c.gx + 1) * cell; x++) {
            set(x, y, c.k === 1 ? SUB[Math.min(2, Math.floor((x - c.gx * cell) / cell * 3))] : FILL[c.k]);
        }
    });
    plan.marks.forEach((s, i) => {
        const p = plan.route.atS(s);
        const col = i === 0 ? [0, 255, 0] : i === plan.marks.length - 1 ? [255, 40, 40] : [255, 255, 255];
        for (let a = -7; a <= 7; a++) for (let b = -7; b <= 7; b++) {
            const r = Math.hypot(a, b);
            if (r <= 7) set(p.x + a, p.y + b, r > 5 ? [0, 0, 0] : col);
        }
    });
    spot.eyes.forEach((e) => {
        for (let a = -10; a <= 10; a++) { set(e.x + a, e.y, [0, 255, 90]); set(e.x, e.y + a, [0, 255, 90]); }
    });
    fs.writeFileSync(path.join(__dirname, 'route-' + key + '.png'), encode(w, h, px));
    console.log(key, 'ok', plan.ok, 'ribbon edge', (plan.minClear - half).toFixed(0) + 'px from words', 'loops', plan.onEyes ? 'on the eyes' : 'above the words',
        plan.lensOk ? 'clear' : 'over the words (' + (plan.lensClear - half).toFixed(0) + 'px)', plan.stacked ? 'stacked' : '', useShot ? '(over screenshot)' : '');
});
