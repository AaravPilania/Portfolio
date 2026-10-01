// node scratch/route-preview.js -> scratch/route-<size>.png: text boxes, clearance halo, asterisk sweep, route and damage
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { planRoute, buildDamage } = require(path.join(__dirname, '..', 'final', 'js', 'skills-wheel.js'));

const LAYOUTS = {
    '1920x1080': { w: 1920, h: 1080, cx: 115, S: 626, rects: [{ l: 557, t: 400, r: 700, b: 411 }, { l: 557, t: 428, r: 1496, b: 652 }, { l: 1574, t: 413, r: 1864, b: 667 }] },
    '1366x768': { w: 1366, h: 768, cx: 82, S: 445, rects: [{ l: 396, t: 281, r: 520, b: 292 }, { l: 396, t: 300, r: 1044, b: 470 }, { l: 1101, t: 287, r: 1322, b: 481 }] },
    '390x844': { w: 390, h: 844, cx: 18, S: 273, rects: [{ l: 162, t: 307, r: 290, b: 318 }, { l: 162, t: 329, r: 372, b: 383 }, { l: 162, t: 399, r: 330, b: 537 }] },
};

function png(w, h, px) {
    const crcT = [];
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        crcT[n] = c >>> 0;
    }
    const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const chunk = (type, data) => {
        const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
        const td = Buffer.concat([Buffer.from(type), data]);
        const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
        return Buffer.concat([len, td, c]);
    };
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) {
        raw[y * (w * 3 + 1)] = 0;
        px.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

Object.entries(LAYOUTS).forEach(([key, L]) => {
    const { w, h } = L;
    const bandMax = Math.max(26, w * 0.03), reach = bandMax * 0.8 + 5, gap = w * 0.025, clear = gap + reach + 32;
    const star = { x: L.cx, y: h / 2, r: L.S * 10.6 / 24 };
    const plan = planRoute({ w, h, rects: L.rects, star, edge: 36, clear, starPad: reach + 32 });
    const dmg = buildDamage(plan.route, { cell: 5, bandMin: Math.max(14, w * 0.015), bandMax, seed: 0x5ced04, avoid: L.rects, gap });
    const px = Buffer.alloc(w * h * 3);
    const set = (x, y, c) => {
        x |= 0; y |= 0;
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const i = (y * w + x) * 3;
        px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
    };
    const dist = (x, y, r) => Math.hypot(Math.max(r.l - x, 0, x - r.r), Math.max(r.t - y, 0, y - r.b));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let c = [8, 8, 10];
        if (Math.hypot(x - star.x, y - star.y) < star.r) c = [60, 54, 10];
        const d = Math.min(...L.rects.map((r) => dist(x, y, r)));
        if (d < clear) c = [34, 22, 30];
        if (d === 0) c = [255, 237, 41];
        if (Math.abs(y - h / 2) < 0.5) c = [200, 200, 200];
        set(x, y, c);
    }
    const COL = [[0, 0, 0], [255, 255, 255], [255, 0, 255], [0, 255, 255], [0, 255, 65], [255, 26, 26], [31, 75, 255], [255, 255, 255], [43, 43, 43]];
    dmg.cells.forEach((c) => { for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) set(c.gx * 5 + i, c.gy * 5 + j, c.k === 1 ? [[255, 0, 0], [0, 255, 0], [0, 0, 255]][Math.min(2, (i / 5 * 3) | 0)] : COL[c.k]); });
    for (let s = 0; s <= plan.route.L; s += 0.5) {
        const p = plan.route.atS(s);
        set(p.x, p.y, [255, 255, 255]);
    }
    [0, 0.25, 0.5, 0.75, 1].forEach((t, i) => {
        const p = plan.route.at(t);
        for (let a = -6; a <= 6; a++) for (let b = -6; b <= 6; b++) if (Math.hypot(a, b) <= 6) set(p.x + a, p.y + b, i === 0 ? [0, 255, 0] : i === 4 ? [255, 0, 0] : [255, 255, 255]);
    });
    fs.writeFileSync(path.join(__dirname, 'route-' + key + '.png'), png(w, h, px));
    console.log(key, plan.kind, 'ok', plan.ok, 'clear', plan.minClear.toFixed(0), '/', clear.toFixed(0), 'star', plan.starClear.toFixed(0));
});
