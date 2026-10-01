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

// ---------- route (the designer's drawn red line) + ribbon

const { planRoute, ribbonCells, DRAWN } = require(path.join(__dirname, '..', 'final', 'js', 'skills-wheel.js'));

// Synthetic slide 04 layouts following measure()'s formulas. `words` is the union of every category's counter and title
// (the longest, "TOOLS & TECHNOLOGIES", wraps to two lines and sets the width), `list` of every skills list (the
// longest list and widest item). 1024x515 is the view the line was drawn on. Narrow screens stack it all in one column.
const LAYOUTS = {
    '1024x515': { w: 1024, h: 515, words: { l: 297, t: 173, r: 746, b: 318 }, list: { l: 811, t: 178, r: 991, b: 336 } },
    '1920x1080': { w: 1920, h: 1080, words: { l: 557, t: 383, r: 1380, b: 652 }, list: { l: 1574, t: 413, r: 1864, b: 667 } },
    '1366x768': { w: 1366, h: 768, words: { l: 396, t: 265, r: 1000, b: 470 }, list: { l: 1101, t: 287, r: 1322, b: 481 } },
    '390x844': { w: 390, h: 844, words: { l: 162, t: 307, r: 372, b: 383 }, list: { l: 162, t: 399, r: 330, b: 537 } },
};
const INSET = 36;
function planFor(key, over) {
    const L = Object.assign({}, LAYOUTS[key], over || {});
    const ribbonW = Math.max(12, L.w * 0.018);
    const plan = planRoute({ w: L.w, h: L.h, words: L.words, list: L.list, clear: ribbonW / 2 + Math.max(8, L.w * 0.008), inset: INSET });
    return { L, plan, ribbonW };
}
const createRouteFor = (w, h) => planFor(w + 'x' + h).plan.route;
const boxDist = (x, y, b) => Math.hypot(Math.max(b.l - x, 0, x - b.r), Math.max(b.t - y, 0, y - b.b));

test('the ribbon (centre line +- half its width + margin) never comes near any category\'s words', () => {
    Object.keys(LAYOUTS).forEach((key) => {
        const { L, plan, ribbonW } = planFor(key);
        assert.ok(plan.ok, key + ' minClear ' + plan.minClear.toFixed(1) + ' < ' + plan.clear.toFixed(1));
        let worst = Infinity;
        for (let s = 0; s <= plan.route.L; s++) {
            const p = plan.route.atS(s);
            [L.words, L.list].forEach((b) => { worst = Math.min(worst, boxDist(p.x, p.y, b)); });
        }
        assert.ok(worst - ribbonW / 2 >= 7.5, key + ' ribbon edge only ' + (worst - ribbonW / 2).toFixed(1) + 'px from the words');
        console.log('     ' + key + ': ribbon edge ' + (worst - ribbonW / 2).toFixed(0) + 'px from the words, furthest control point moved ' +
            plan.moved.toFixed(0) + 'px (' + (plan.moved / L.w * 100).toFixed(1) + 'vw)' + (plan.stacked ? ', stacked' : ''));
    });
});

test('route is the drawing: it enters at the top edge, swings under the title, crests, and leaves at the right edge', () => {
    Object.keys(LAYOUTS).forEach((key) => {
        const { L, plan } = planFor(key);
        const P = plan.pts;
        assert.ok(Math.abs(P[0][0] - DRAWN[0][0] * L.w) < 0.5 && P[0][1] === 0, key + ' entry');
        assert.ok(P[P.length - 1][0] === L.w, key + ' exit');
        for (let i = 0; i <= 5; i++) {
            const d = Math.hypot(P[i][0] - DRAWN[i][0] * L.w, P[i][1] - DRAWN[i][1] * L.h);
            assert.ok(d < 1, key + ' descent point ' + i + ' moved ' + d.toFixed(1));
        }
        const bottom = P.reduce((a, p) => (p[1] > a[1] ? p : a));
        assert.ok(Math.abs(bottom[1] - 478 / 515 * L.h) < L.h * 0.02, key + ' bottom at ' + bottom[1].toFixed(0));
        assert.ok(bottom[1] > L.words.b, key + ' swing passes under the words');
        if (!plan.stacked) {
            for (let i = 9; i < P.length; i++) assert.ok(P[i][0] >= P[i - 1][0] - 0.5, key + ' folds back at point ' + i);
            const crest = P.slice(9).reduce((a, p) => (p[1] < a[1] ? p : a));
            assert.ok(crest[1] < L.words.t && crest[1] < L.list.t, key + ' crest above the words');
        }
    });
});

test('the 1024x515 view keeps the drawing except where it ran through the title', () => {
    const { plan, L } = planFor('1024x515');
    const unmoved = plan.pts.filter((p, i) => Math.hypot(p[0] - DRAWN[i][0] * L.w, p[1] - DRAWN[i][1] * L.h) < 1).length;
    assert.ok(unmoved >= 9, 'only ' + unmoved + ' of ' + plan.pts.length + ' control points kept');
    // With only FRONTEND on the page, the rise still clears it (the drawn line crossed its right end)
    const solo = planFor('1024x515', { words: { l: 297, t: 205, r: 577, b: 285 }, list: { l: 876, t: 186, r: 991, b: 330 } }).plan;
    assert.ok(solo.ok && solo.moved < plan.moved, 'FRONTEND alone moves less: ' + solo.moved.toFixed(0) + ' vs ' + plan.moved.toFixed(0));
});

test('GLITCH\'s endpoints sit just inside the viewport, along the curve', () => {
    Object.keys(LAYOUTS).forEach((key) => {
        const { L, plan } = planFor(key);
        [plan.s0, plan.s1].forEach((s) => {
            const p = plan.route.atS(s);
            assert.ok(p.x >= INSET - 1 && p.x <= L.w - INSET + 1 && p.y >= INSET - 1 && p.y <= L.h - INSET + 1, key + ' endpoint ' + p.x.toFixed(0) + ',' + p.y.toFixed(0));
        });
        assert.ok(plan.s0 < 120 && plan.route.L - plan.s1 < 120 && plan.s1 > plan.s0, key + ' insets ' + plan.s0.toFixed(0) + ' / ' + (plan.route.L - plan.s1).toFixed(0));
    });
});

test('route is arc-length parameterised: equal t steps are equal distances along it', () => {
    const r = createRouteFor(1920, 1080);    const K = 400;
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

function cellsFor(w, h) {
    const { plan, ribbonW } = planFor(w + 'x' + h);
    const cell = Math.max(3, ribbonW / 7);
    return { r: plan.route, cell, half: ribbonW / 2, cells: ribbonCells(plan.route, { cell, half: ribbonW / 2, seed: 0x5ced04 }) };
}

test('ribbon texture is deterministic: same stage, same broken pixels', () => {
    assert.strictEqual(JSON.stringify(cellsFor(1920, 1080).cells), JSON.stringify(cellsFor(1920, 1080).cells));
});

test('ribbon texture has no holes: every cell the stroke can touch is filled, once, in arc-length order', () => {
    ['1920x1080', '1024x515', '390x844'].forEach((key) => {
        const [w, h] = key.split('x').map(Number);
        const { r, cell, half, cells } = cellsFor(w, h);
        const have = new Set(cells.map((c) => c.gx + ',' + c.gy));
        assert.strictEqual(have.size, cells.length, key + ' one colour per cell');
        for (let i = 1; i < cells.length; i++) assert.ok(cells[i].s >= cells[i - 1].s, key + ' s order');
        let missing = 0, checked = 0;
        for (let s = 0; s <= r.L; s += cell * 0.5) {
            const p = r.atS(s);
            for (let gx = Math.floor((p.x - half) / cell); gx <= Math.floor((p.x + half) / cell); gx++) {
                for (let gy = Math.floor((p.y - half) / cell); gy <= Math.floor((p.y + half) / cell); gy++) {
                    // Any cell whose nearest point lies under the stroke can be lit by the mask
                    const nx = Math.max(gx * cell, Math.min((gx + 1) * cell, p.x)), ny = Math.max(gy * cell, Math.min((gy + 1) * cell, p.y));
                    if (Math.hypot(nx - p.x, ny - p.y) > half) continue;
                    checked++;
                    if (!have.has(gx + ',' + gy)) missing++;
                }
            }
        }
        assert.strictEqual(missing, 0, key + ': ' + missing + ' of ' + checked + ' covered cells unfilled');
    });
});

test('ribbon reads as signal red, broken by stuck sub-pixels, hot white, dead clusters and tears', () => {
    const { cells } = cellsFor(1920, 1080);
    const count = Array(11).fill(0);
    cells.forEach((c) => count[c.k]++);
    const n = cells.length;
    const red = count[5] + count[6] + count[8] + count[9];
    assert.ok(red / n > 0.5 && red / n < 0.85, 'red ' + (red / n * 100).toFixed(0) + '%');
    assert.ok(count[1] / n > 0.05, 'rgb ' + count[1]);
    assert.ok(count[7] / n > 0.01, 'hot ' + count[7]);
    assert.ok(count[0] / n > 0.01 && count[0] / n < 0.1, 'dead ' + count[0]);
    assert.ok((count[2] + count[3] + count[4] + count[10]) / n > 0.04, 'stuck colours');
    console.log('     ' + n + ' cells; kinds ' + count.join('/'));
});

console.log('\n' + passed + ' passed' + (process.exitCode ? ', some FAILED' : ''));
