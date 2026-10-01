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

const { createRoute, buildDamage, RIBBON } = require(path.join(__dirname, '..', 'final', 'js', 'skills-wheel.js'));
const SIZES = [[1920, 1080], [1366, 768], [390, 844]];

test('route stays inside the stage margin and runs the ribbon\'s direction', () => {
    SIZES.forEach(([w, h]) => {
        const r = createRoute(RIBBON, w, h, 36);
        for (let i = 0; i <= 200; i++) {
            const p = r.at(i / 200);
            assert.ok(p.x >= 35.5 && p.x <= w - 35.5 && p.y >= 35.5 && p.y <= h - 35.5, w + 'x' + h + ' t=' + i / 200 + ' -> ' + p.x.toFixed(1) + ',' + p.y.toFixed(1));
        }
        const a = r.at(0), b = r.at(1);
        assert.ok(a.x < w * 0.1 && a.y < h * 0.25, 'starts top-left: ' + a.x.toFixed(0) + ',' + a.y.toFixed(0));
        assert.ok(b.x > w * 0.85 && b.y > h * 0.6, 'ends bottom-right: ' + b.x.toFixed(0) + ',' + b.y.toFixed(0));
        assert.ok(r.L > (w + h), 'long enough: ' + r.L.toFixed(0));
    });
});

test('route is arc-length parameterised: equal t steps are equal distances along it', () => {
    const r = createRoute(RIBBON, 1920, 1080, 36);
    const K = 400;
    let worst = 0;
    for (let i = 0; i < K; i++) {
        const p = r.at(i / K), q = r.at((i + 1) / K);
        worst = Math.max(worst, Math.abs(Math.hypot(q.x - p.x, q.y - p.y) - r.L / K) / (r.L / K));
    }
    assert.ok(worst < 0.02, 'chord vs arc error ' + (worst * 100).toFixed(2) + '%');
});

test('route tangent points along the direction of travel', () => {
    const r = createRoute(RIBBON, 1920, 1080, 36);
    for (let i = 1; i < 100; i++) {
        const p = r.at(i / 100), q = r.at(i / 100 + 0.002);
        const d = Math.atan2(q.y - p.y, q.x - p.x);
        const err = Math.abs(Math.atan2(Math.sin(d - p.a), Math.cos(d - p.a)));
        assert.ok(err < 0.35, 't=' + i / 100 + ' err ' + err.toFixed(2));
    }
});

function dmgFor(w, h) {
    const r = createRoute(RIBBON, w, h, 36);
    return { r, d: buildDamage(r, { cell: 5, bandMin: Math.max(14, w * 0.015), bandMax: Math.max(26, w * 0.03), seed: 0x5ced04 }) };
}

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
