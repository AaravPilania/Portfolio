// node scratch/skills-wheel-steps.test.js
// Exercises the pure gesture classifier and pin-zone machine exported by final/js/skills-wheel.js under Node.
'use strict';
const assert = require('assert');
const path = require('path');
const { createIntent, createZone } = require(path.join(__dirname, '..', 'final', 'js', 'skills-wheel.js'));

let passed = 0;
function test(name, fn) {
    try {
        fn();
        passed++;
        console.log('ok   ' + name);
    } catch (e) {
        console.log('FAIL ' + name + '\n     ' + e.message);
        process.exitCode = 1;
    }
}

// Streams: [ [t, dy], ... ] -> list of fired directions with their times
function feed(intent, events) {
    const out = [];
    events.forEach(([t, dy]) => {
        const d = intent.wheel(dy, t);
        if (d) out.push([t, d]);
    });
    return out;
}

// A trackpad swipe: ramp up for ~120ms, then inertia decaying ~4% per 16ms frame for `ms`
function swipe(t0, dir, peak, ms) {
    const ev = [];
    let t = t0;
    for (let i = 1; i <= 8; i++, t += 16) ev.push([t, dir * peak * i / 8]);
    let v = peak;
    for (; t < t0 + ms; t += 16) {
        v *= 0.96;
        if (v < 0.5) break;
        ev.push([t, dir * Math.max(1, Math.round(v))]);
    }
    return ev;
}

const LOCK = 860;

test('one trackpad swipe with 2s of inertia fires exactly once', () => {
    const it = createIntent({ lock: LOCK });
    const fired = feed(it, swipe(1000, 1, 60, 2000));
    assert.strictEqual(fired.length, 1, JSON.stringify(fired));
    assert.strictEqual(fired[0][1], 1);
    assert.ok(fired[0][0] < 1060, 'fires within the first frames, got ' + fired[0][0]);
});

test('a second swipe after the lock fires again, even over the first one\'s inertia', () => {
    const it = createIntent({ lock: LOCK });
    const a = swipe(0, 1, 60, 3000);
    const b = swipe(1200, 1, 70, 1500);
    const ev = a.filter(([t]) => t < 1200).concat(b);
    const fired = feed(it, ev);
    assert.strictEqual(fired.length, 2, JSON.stringify(fired));
    assert.ok(fired[1][0] >= 1200 && fired[1][0] < 1300, 'second fire time ' + fired[1][0]);
});

test('a swipe landing inside the lock fires once the lock ends if the finger is still moving', () => {
    const it = createIntent({ lock: LOCK });
    const a = swipe(0, 1, 60, 500);
    const b = [];
    for (let t = 700; t <= 1100; t += 16) b.push([t, 40]);
    const fired = feed(it, a.concat(b));
    assert.strictEqual(fired.length, 2, JSON.stringify(fired));
    assert.ok(fired[1][0] >= LOCK, 'second fire respects the lock: ' + fired[1][0]);
});

test('mouse: three quick notches are one step', () => {
    const it = createIntent({ lock: LOCK });
    const fired = feed(it, [[0, 100], [60, 100], [120, 100]]);
    assert.deepStrictEqual(fired.map((f) => f[1]), [1]);
});

test('mouse: separated notches step once per lock window', () => {
    const it = createIntent({ lock: LOCK });
    const fired = feed(it, [[0, 100], [400, 100], [1000, 100], [1500, 100], [2000, 100]]);
    assert.deepStrictEqual(fired.map((f) => f[0]), [0, 1000, 2000]);
});

test('mouse: a continuous spin keeps stepping at a readable pace', () => {
    const it = createIntent({ lock: LOCK });
    const ev = [];
    for (let t = 0; t <= 3500; t += 50) ev.push([t, 100]);
    const fired = feed(it, ev);
    assert.ok(fired.length >= 3 && fired.length <= 4, JSON.stringify(fired));
    for (let i = 1; i < fired.length; i++) assert.ok(fired[i][0] - fired[i - 1][0] >= LOCK, 'gap ' + (fired[i][0] - fired[i - 1][0]));
});

test('reversing direction after the lock fires the other way', () => {
    const it = createIntent({ lock: LOCK });
    const fired = feed(it, swipe(0, 1, 50, 600).concat(swipe(1000, -1, 50, 600)));
    assert.deepStrictEqual(fired.map((f) => f[1]), [1, -1]);
});

test('tiny opposite jitter at the end of inertia is ignored', () => {
    const it = createIntent({ lock: LOCK });
    const ev = swipe(0, 1, 50, 900).concat([[1000, -1], [1016, 1], [1032, -2]]);
    const fired = feed(it, ev);
    assert.strictEqual(fired.length, 1, JSON.stringify(fired));
});

test('claim swallows the gesture that carried the page into the stage', () => {
    const it = createIntent({ lock: LOCK });
    const ev = swipe(0, 1, 60, 2500);
    const out = [];
    ev.forEach(([t, dy]) => {
        if (t === 400) it.claim(t);
        const d = it.wheel(dy, t);
        if (d && t >= 400) out.push(t);
    });
    assert.deepStrictEqual(out, []);
});

test('touch: one swipe past the threshold fires once; lock holds a second swipe', () => {
    const it = createIntent({ lock: LOCK });
    it.touchStart(500);
    assert.strictEqual(it.touchMove(490, 0), 0);
    assert.strictEqual(it.touchMove(460, 16), 1);
    assert.strictEqual(it.touchMove(300, 32), 0);
    it.touchEnd();
    it.touchStart(300);
    assert.strictEqual(it.touchMove(400, 300), 0, 'locked');
    assert.strictEqual(it.touchMove(420, 900), -1, 'fires when the lock ends mid-swipe');
});

test('keys respect the lock', () => {
    const it = createIntent({ lock: LOCK });
    assert.strictEqual(it.key(1, 0), 1);
    assert.strictEqual(it.key(1, 500), 0);
    assert.strictEqual(it.key(-1, 900), -1);
});

// ---------- zone

const A = 5000, B = 6296; // 1080px viewport, 4 detents 0.3 * 1080 apart

function zoneAt(y) {
    const z = createZone(5);
    z.frame(y, A, B, false, false);
    return z;
}

test('offsets are evenly spaced detents from A to B', () => {
    const z = zoneAt(0);
    assert.deepStrictEqual([0, 1, 2, 3, 4].map(z.offset), [5000, 5324, 5648, 5972, 6296]);
});

test('crossing A from above engages detent 0, even with overshoot', () => {
    const z = zoneAt(4900);
    const act = z.frame(5090, A, B, false, false);
    assert.deepStrictEqual(act, { type: 'engage', step: 0, y: 5000 });
    assert.strictEqual(z.desired(5090), 0);
});

test('crossing B from below engages the last detent', () => {
    const z = zoneAt(6500);
    const act = z.frame(6250, A, B, false, false);
    assert.deepStrictEqual(act, { type: 'engage', step: 4, y: 6296 });
});

test('loading inside the zone engages the nearest detent', () => {
    const z = createZone(5);
    const act = z.frame(5700, A, B, false, false);
    assert.deepStrictEqual(act, { type: 'engage', step: 2, y: 5648 });
});

test('steps walk 0..4, then down releases at B', () => {
    const z = zoneAt(4900);
    z.frame(5000, A, B, false, false);
    const seen = [];
    for (let i = 0; i < 4; i++) seen.push(z.input(1));
    assert.deepStrictEqual(seen.map((a) => a.step), [1, 2, 3, 4]);
    const rel = z.input(1);
    assert.deepStrictEqual(rel, { type: 'release', dir: 1, y: B });
    assert.strictEqual(z.pinned, false);
    assert.strictEqual(z.desired(B), 4, 'the last category stays up while the stage scrolls away');
});

test('up at detent 0 releases at A and hides the text', () => {
    const z = zoneAt(4900);
    z.frame(5000, A, B, false, false);
    assert.deepStrictEqual(z.input(-1), { type: 'release', dir: -1, y: A });
    assert.strictEqual(z.desired(A), -1);
});

test('after releasing down, the page scrolls on without re-engaging; coming back re-engages at 4', () => {
    const z = zoneAt(6296);
    z.pinned = true;
    z.step = 4;
    z.input(1);
    assert.strictEqual(z.frame(6296, A, B, false, false), null);
    assert.strictEqual(z.frame(6400, A, B, false, false), null);
    assert.strictEqual(z.frame(6900, A, B, false, false), null);
    const back = z.frame(6280, A, B, false, false);
    assert.deepStrictEqual(back, { type: 'engage', step: 4, y: 6296 });
});

test('after releasing up, scrolling away does not re-engage; reversing does', () => {
    const z = zoneAt(4900);
    z.frame(5000, A, B, false, false);
    z.input(-1);
    assert.strictEqual(z.frame(5000, A, B, false, false), null);
    assert.strictEqual(z.frame(4950, A, B, false, false), null);
    assert.deepStrictEqual(z.frame(5010, A, B, false, false), { type: 'engage', step: 0, y: 5000 });
});

test('a jump clean over the zone does not engage', () => {
    const z = zoneAt(4000);
    assert.strictEqual(z.frame(8000, A, B, false, false), null);
    assert.strictEqual(z.desired(8000), 4);
});

test('external movement while pinned releases, and stays free until the page leaves the zone', () => {
    const z = zoneAt(4900);
    z.frame(5000, A, B, false, false);
    assert.strictEqual(z.frame(5003, A, B, false, false), null, 'within tolerance');
    assert.deepStrictEqual(z.frame(5400, A, B, false, false), { type: 'release', external: true });
    assert.strictEqual(z.frame(5600, A, B, false, false), null, 'guarded inside');
    assert.strictEqual(z.desired(5600), 2, 'text follows the free position');
    assert.strictEqual(z.frame(4800, A, B, false, false), null, 'left above');
    assert.deepStrictEqual(z.frame(5020, A, B, false, false), { type: 'engage', step: 0, y: 5000 });
});

test('our own scroll animation is not mistaken for external movement', () => {
    const z = zoneAt(4900);
    z.frame(5000, A, B, false, false);
    z.input(1);
    assert.strictEqual(z.frame(5150, A, B, false, true), null);
    assert.strictEqual(z.frame(5324, A, B, false, false), null);
});

test('a layout change while pinned re-snaps to the moved detent', () => {
    const z = zoneAt(4900);
    z.frame(5000, A, B, false, false);
    z.input(1);
    z.input(1);
    assert.deepStrictEqual(z.frame(5648, A + 100, B + 100, false, false), { type: 'snap', y: 5748 });
    assert.strictEqual(z.frame(5748, A + 100, B + 100, false, false), null);
});

test('scrollbar drag: no engagement while dragging, nearest detent on release', () => {
    const z = zoneAt(4000);
    z.external();
    assert.strictEqual(z.frame(5500, A, B, true, false), null);
    assert.strictEqual(z.frame(5900, A, B, true, false), null);
    z.unguard();
    assert.deepStrictEqual(z.frame(5900, A, B, false, false), { type: 'engage', step: 3, y: 5972 });
});

test('input is ignored when free or when the classifier said no', () => {
    const z = zoneAt(4000);
    assert.strictEqual(z.input(1), null);
    z.frame(5000, A, B, false, false);
    assert.strictEqual(z.input(0), null);
    assert.strictEqual(z.step, 0);
});

// ---------- route + damage

const { planRoute, buildDamage } = require(path.join(__dirname, '..', 'final', 'js', 'skills-wheel.js'));

// Synthetic slide 04 layouts, following measure()'s formulas: star centre cx at the index column, title column from
// max(29vw, star arm + 3 gaps), the longest title on two lines, the longest skills list right-aligned on the axis.
// Narrow (<=700px) stacks counter, title and skills into one block right of the star.
const LAYOUTS = {
    '1920x1080': { w: 1920, h: 1080, cx: 115, S: 626, rects: [
        { l: 557, t: 400, r: 700, b: 411 },     // [ 0N / 05 ] counter
        { l: 557, t: 428, r: 1496, b: 652 },    // title, two lines at 100px
        { l: 1574, t: 413, r: 1864, b: 667 },   // skills, 8 x 31.7px
    ] },
    '1366x768': { w: 1366, h: 768, cx: 82, S: 445, rects: [
        { l: 396, t: 281, r: 520, b: 292 },
        { l: 396, t: 300, r: 1044, b: 470 },
        { l: 1101, t: 287, r: 1322, b: 481 },
    ] },
    '390x844': { w: 390, h: 844, cx: 18, S: 273, rects: [
        { l: 162, t: 307, r: 290, b: 318 },
        { l: 162, t: 329, r: 372, b: 383 },
        { l: 162, t: 399, r: 330, b: 537 },
    ] },
};
const BUG_HALF = 32;
function planFor(key) {
    const L = LAYOUTS[key];
    const bandMax = Math.max(26, L.w * 0.03), reach = bandMax * 0.8 + 5, gap = L.w * 0.025;
    const star = { x: L.cx, y: L.h / 2, r: L.S * 10.6 / 24 };
    const plan = planRoute({ w: L.w, h: L.h, rects: L.rects, star, edge: 36, clear: gap + reach + BUG_HALF, starPad: reach + BUG_HALF });
    return { L, plan, gap, reach, star, bandMax };
}
const createRouteFor = (w, h) => planFor(w + 'x' + h).plan.route;

test('route never comes within the safety margin of any text box (dense check)', () => {
    Object.keys(LAYOUTS).forEach((key) => {
        const { L, plan } = planFor(key);
        assert.ok(plan.ok, key + ' plan failed: ' + plan.kind + ' minClear ' + plan.minClear.toFixed(1) + ' < ' + plan.clear.toFixed(1));
        const r = plan.route;
        let worst = Infinity;
        for (let s = 0; s <= r.L; s += 1) {
            const p = r.atS(s);
            L.rects.forEach((b) => {
                worst = Math.min(worst, Math.hypot(Math.max(b.l - p.x, 0, p.x - b.r), Math.max(b.t - p.y, 0, p.y - b.b)));
            });
            assert.ok(p.x >= 35 && p.x <= L.w - 35 && p.y >= 35 && p.y <= L.h - 35, key + ' out of stage at s=' + s);
        }
        assert.ok(worst >= plan.clear - 1, key + ' worst clearance ' + worst.toFixed(1) + ' < ' + plan.clear.toFixed(1));
        console.log('     ' + key + ': ' + plan.kind + ', L ' + r.L.toFixed(0) + 'px, text clearance ' + worst.toFixed(0) + 'px (needs ' +
            plan.clear.toFixed(0) + '), asterisk ' + plan.starClear.toFixed(0) + 'px, ' + plan.pts.length + ' control points');
    });
});

test('route keeps its centre line off the asterisk\'s arm sweep, and wraps the words where the lane fits', () => {
    Object.keys(LAYOUTS).forEach((key) => {
        const { plan } = planFor(key);
        assert.ok(plan.starClear >= 0, key + ' asterisk clearance ' + plan.starClear.toFixed(1));
    });
    assert.strictEqual(planFor('1920x1080').plan.kind, 'wrap');
    assert.strictEqual(planFor('1366x768').plan.kind, 'wrap');
});

test('route flows like a ribbon: long, with loops (self-crossings), start and end apart', () => {
    Object.keys(LAYOUTS).forEach((key) => {
        const { L, plan } = planFor(key);
        const r = plan.route;
        assert.ok(r.L > L.w * 1.1, key + ' length ' + r.L.toFixed(0));
        const a = r.at(0), b = r.at(1);
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > Math.min(L.w, L.h) * 0.3, key + ' start/end too close');
        // Count self-crossings of the polyline: each curl crosses itself once
        const pts = [];
        for (let i = 0; i <= 600; i++) pts.push(r.at(i / 600));
        const cross = (p, q, u, v) => {
            const d = (q.x - p.x) * (v.y - u.y) - (q.y - p.y) * (v.x - u.x);
            if (!d) return false;
            const s = ((u.x - p.x) * (v.y - u.y) - (u.y - p.y) * (v.x - u.x)) / d, t = ((u.x - p.x) * (q.y - p.y) - (u.y - p.y) * (q.x - p.x)) / d;
            return s > 0 && s < 1 && t > 0 && t < 1;
        };
        let loops = 0;
        for (let i = 0; i < pts.length - 1; i++) for (let j = i + 2; j < pts.length - 1; j++) if (cross(pts[i], pts[i + 1], pts[j], pts[j + 1])) loops++;
        assert.ok(loops >= 1, key + ' has no loops');
    });
});

test('planner adapts: a cramped viewport falls back to a simpler route that still clears the text', () => {
    // 1280x560: the text block leaves no band above it; the planner must still find a clear route
    const w = 1280, h = 560;
    const rects = [{ l: 371, t: 110, r: 480, b: 121 }, { l: 371, t: 130, r: 960, b: 330 }, { l: 1030, t: 125, r: 1240, b: 340 }];
    const bandMax = Math.max(26, w * 0.03), reach = bandMax * 0.8 + 5, clear = w * 0.025 + reach + BUG_HALF;
    const plan = planRoute({ w, h, rects, star: { x: 77, y: h / 2, r: 0.58 * h * 10.6 / 24 }, edge: 36, clear, starPad: reach + BUG_HALF });
    assert.ok(plan.ok, plan.kind + ' minClear ' + plan.minClear.toFixed(1));
    assert.notStrictEqual(plan.kind, 'wrap');
    console.log('     1280x560: ' + plan.kind + ', clearance ' + plan.minClear.toFixed(0) + 'px');
});

test('route is arc-length parameterised: equal t steps are equal distances along it', () => {
    const r = createRouteFor(1920, 1080);
    const K = 400;
    let worst = 0;
    for (let i = 0; i < K; i++) {
        const p = r.at(i / K), q = r.at((i + 1) / K);
        worst = Math.max(worst, Math.abs(Math.hypot(q.x - p.x, q.y - p.y) - r.L / K) / (r.L / K));
    }
    assert.ok(worst < 0.02, 'chord vs arc error ' + (worst * 100).toFixed(2) + '%');
});

test('route tangent points along the direction of travel', () => {
    const r = createRouteFor(1920, 1080);
    for (let i = 1; i < 100; i++) {
        const p = r.at(i / 100), q = r.at(i / 100 + 0.002);
        const d = Math.atan2(q.y - p.y, q.x - p.x);
        const err = Math.abs(Math.atan2(Math.sin(d - p.a), Math.cos(d - p.a)));
        assert.ok(err < 0.35, 't=' + i / 100 + ' err ' + err.toFixed(2));
    }
});

function dmgFor(w, h) {
    const { L, plan, gap } = planFor(w + 'x' + h);
    const r = plan.route;
    return { r, L, gap, d: buildDamage(r, { cell: 5, bandMin: Math.max(14, w * 0.015), bandMax: Math.max(26, w * 0.03), seed: 0x5ced04, avoid: L.rects, gap }) };
}

test('no damage cell or tear (with its jolt and RGB split) lands within the gap of any text box', () => {
    Object.keys(LAYOUTS).forEach((key) => {
        const [w, h] = key.split('x').map(Number);
        const { L, d, gap } = dmgFor(w, h);
        const dist = (x0, y0, x1, y1) => Math.min(...L.rects.map((b) => Math.hypot(Math.max(b.l - x1, 0, x0 - b.r), Math.max(b.t - y1, 0, y0 - b.b))));
        let worst = Infinity;
        d.cells.forEach((c) => { worst = Math.min(worst, dist(c.gx * 5, c.gy * 5, c.gx * 5 + 5, c.gy * 5 + 5)); });
        d.tears.forEach((t) => {
            const reach = Math.abs(t.dx) * 15 + 3;
            worst = Math.min(worst, dist(t.gx * 5 - reach, t.gy * 5, (t.gx + t.len) * 5 + reach, t.gy * 5 + 5));
        });
        assert.ok(worst >= gap, key + ' damage ' + worst.toFixed(1) + 'px from text, gap ' + gap.toFixed(1));
    });
});

test('damage is deterministic: same stage, same dead pixels', () => {
    const a = dmgFor(1920, 1080).d, b = dmgFor(1920, 1080).d;
    assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
});

test('damage cells and tears are ordered by arc length, so a progress prefix is the trail so far', () => {
    const { r, d } = dmgFor(1920, 1080);
    for (let i = 1; i < d.cells.length; i++) assert.ok(d.cells[i].s >= d.cells[i - 1].s);
    for (let i = 1; i < d.tears.length; i++) assert.ok(d.tears[i].s >= d.tears[i - 1].s);
    assert.ok(d.cells[d.cells.length - 1].s <= r.L);
    const keys = new Set(d.cells.map((c) => c.gx + ',' + c.gy));
    assert.strictEqual(keys.size, d.cells.length, 'one owner per grid cell');
});

test('damage hugs the route in a 1.5-3vw band with ragged edges', () => {
    const w = 1920, h = 1080;
    const { r, d } = dmgFor(w, h);
    const pts = [];
    for (let i = 0; i <= 2000; i++) pts.push(r.at(i / 2000));
    const near = (x, y) => pts.reduce((m, p) => Math.min(m, Math.hypot(p.x - x, p.y - y)), Infinity);
    let far = 0, within = 0;
    const sample = d.cells.filter((c, i) => i % 7 === 0 && c.k !== 0);
    sample.forEach((c) => {
        const dist = near((c.gx + 0.5) * 5, (c.gy + 0.5) * 5);
        far = Math.max(far, dist);
        if (dist <= w * 0.015 + 5) within++;
    });
    assert.ok(far <= w * 0.03 * 0.8 + 10, 'farthest lit cell ' + far.toFixed(1) + 'px');
    assert.ok(within / sample.length > 0.8, 'most cells inside the band: ' + (within / sample.length * 100).toFixed(0) + '%');
});

test('damage mixes dead, sub-pixel, stuck and hot pixels, plus a few tears', () => {
    const { d } = dmgFor(1920, 1080);
    const count = Array(9).fill(0);
    d.cells.forEach((c) => count[c.k]++);
    const n = d.cells.length;
    assert.ok(n > 2000 && n < 20000, 'cell count ' + n);
    assert.ok(count[0] / n > 0.1, 'dead ' + count[0]);
    assert.ok(count[1] / n > 0.1, 'rgb ' + count[1]);
    assert.ok((count[2] + count[3] + count[4]) / n > 0.1, 'stuck ' + (count[2] + count[3] + count[4]));
    assert.ok(count[7] / n > 0.03, 'hot ' + count[7]);
    assert.ok(d.tears.length >= 4, 'tears ' + d.tears.length);
    console.log('     ' + n + ' cells, ' + d.tears.length + ' tears; kinds ' + count.join('/'));
});

console.log('\n' + passed + ' passed' + (process.exitCode ? ', some FAILED' : ''));
