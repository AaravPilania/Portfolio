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

const A = 5000, B = 6944; // 1080px viewport, the intro + 6 categories: 6 steps 0.3 * 1080 apart

function zoneAt(y) {
    const z = createZone(7);
    z.frame(y, A, B, false, false);
    return z;
}

test('offsets are evenly spaced detents from A to B', () => {
    const z = zoneAt(0);
    assert.deepStrictEqual([0, 1, 2, 3, 4, 5, 6].map(z.offset), [5000, 5324, 5648, 5972, 6296, 6620, 6944]);
});

test('crossing A from above engages detent 0, even with overshoot', () => {
    const z = zoneAt(4900);
    const act = z.frame(5090, A, B, false, false);
    assert.deepStrictEqual(act, { type: 'engage', step: 0, y: 5000 });
    assert.strictEqual(z.desired(5090), 0);
});

test('crossing B from below engages the last detent', () => {
    const z = zoneAt(7100);
    const act = z.frame(6900, A, B, false, false);
    assert.deepStrictEqual(act, { type: 'engage', step: 6, y: 6944 });
});

test('loading inside the zone engages the nearest detent', () => {
    const z = createZone(7);
    const act = z.frame(5700, A, B, false, false);
    assert.deepStrictEqual(act, { type: 'engage', step: 2, y: 5648 });
});

test('steps walk the intro (0) and the categories 1..6 (Experience last), then down releases at B', () => {
    const z = zoneAt(4900);
    z.frame(5000, A, B, false, false);
    const seen = [];
    for (let i = 0; i < 6; i++) seen.push(z.input(1));
    assert.deepStrictEqual(seen.map((a) => a.step), [1, 2, 3, 4, 5, 6]);
    const rel = z.input(1);
    assert.deepStrictEqual(rel, { type: 'release', dir: 1, y: B });
    assert.strictEqual(z.pinned, false);
    assert.strictEqual(z.desired(B), 6, 'Experience stays up while the stage scrolls away');
});

test('up at the intro releases at A and hides the text', () => {
    const z = zoneAt(4900);
    z.frame(5000, A, B, false, false);
    assert.deepStrictEqual(z.input(-1), { type: 'release', dir: -1, y: A });
    assert.strictEqual(z.desired(A), -1);
});

test('after releasing down, the page scrolls on without re-engaging; coming back re-engages at 6', () => {
    const z = zoneAt(6944);
    z.pinned = true;
    z.step = 6;
    z.input(1);
    assert.strictEqual(z.frame(6944, A, B, false, false), null);
    assert.strictEqual(z.frame(7000, A, B, false, false), null);
    assert.strictEqual(z.frame(7500, A, B, false, false), null);
    const back = z.frame(6920, A, B, false, false);
    assert.deepStrictEqual(back, { type: 'engage', step: 6, y: 6944 });
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
    assert.strictEqual(z.desired(8000), 6);
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

// ---------- the backdrop's eyes, the paper plane's flight + ribbon

const { planRoute, ribbonCells, eyeSpots, legS, PORTRAIT } = require(path.join(__dirname, '..', 'final', 'js', 'skills-wheel.js'));

// Slide 04 measured on the page with the stage stuck (scratch/sixth-arm/probe.js): `words` is the union of every
// category's counter and title, `list` of every right column, starX the asterisk's centre. Phones stack it all in one
// column.
const LAYOUTS = {
    '1920x1080': { w: 1920, h: 1080, words: { l: 549, t: 397, r: 1308, b: 659 }, list: { l: 1558, t: 412, r: 1866, b: 673 }, starX: 68 },
    '1366x768': { w: 1366, h: 768, words: { l: 390, t: 278, r: 930, b: 469 }, list: { l: 1087, t: 286, r: 1324, b: 487 }, starX: 48 },
    '1024x515': { w: 1024, h: 515, words: { l: 293, t: 171, r: 697, b: 321 }, list: { l: 800, t: 178, r: 992, b: 341 }, starX: 36 },
    '390x844': { w: 390, h: 844, words: { l: 172, t: 305, r: 370, b: 433 }, list: { l: 173, t: 373, r: 340, b: 520 }, starX: 30 },
};
const DESKTOP = ['1920x1080', '1366x768', '1024x515'];
const INSET = 36;
function planFor(key, over) {
    const L = Object.assign({}, LAYOUTS[key], over || {});
    const ribbonW = Math.max(12, L.w * 0.018);
    const S = Math.round(Math.min(L.w, L.h) * (L.w < 650 ? 0.7 : 0.58));
    const spot = eyeSpots(L.w, L.h);
    const plan = planRoute({
        w: L.w, h: L.h, words: L.words, list: L.list, clear: ribbonW / 2 + Math.max(8, L.w * 0.008), half: ribbonW / 2, inset: INSET,
        star: { x: L.starX, y: L.h / 2, r: S * 0.375 }, eyes: 'eyes' in L ? L.eyes : spot.eyes, eyeR: spot.r,
    });
    return { L, plan, ribbonW, spot };
}
const createRouteFor = (w, h) => planFor(w + 'x' + h).plan.route;
const boxDist = (x, y, b) => Math.hypot(Math.max(b.l - x, 0, x - b.r), Math.max(b.t - y, 0, y - b.b));
const near = (p, b) => Math.hypot(p.x - b.x, p.y - b.y);

test('eyes map onto the viewport as the backdrop draws them (verified against page screenshots to 1px)', () => {
    // scratch/eyes/verify-map.py correlated the dot-grid render with this cover: offsets of at most 1px at both sizes
    const want = { '1920x1080': [[873.4, 169.3], [1088.1, 185.4]], '1366x768': [[621.4, 120.3], [774.1, 131.7]] };
    Object.keys(want).forEach((key) => {
        const [w, h] = key.split('x').map(Number);
        const s = eyeSpots(w, h);
        s.eyes.forEach((e, i) => assert.ok(Math.hypot(e.x - want[key][i][0], e.y - want[key][i][1]) < 0.5, key + ' eye ' + i + ' at ' + e.x.toFixed(1) + ',' + e.y.toFixed(1)));
    });
    // Portrait viewports are cut at the sides instead: height fits, the video is centred across
    const p = eyeSpots(390, 844), k = 844 / 1920, ox = (390 - 1440 * k) / 2;
    assert.ok(Math.abs(p.eyes[0].x - (ox + 655 * k)) < 1e-6 && Math.abs(p.eyes[0].y - 682 * k) < 1e-6, 'portrait cover');
    assert.ok(Math.abs(p.r - PORTRAIT.lens * k) < 1e-9 && Math.abs(eyeSpots(1920, 1080).r - PORTRAIT.lens * 1920 / 1440) < 1e-9, 'loop radius scales with the cover');
});

test('the two loops close round the two eyes: goggles', () => {
    Object.keys(LAYOUTS).forEach((key) => {
        const { plan, spot } = planFor(key);
        assert.ok(plan.onEyes, key + ' loops on the eyes');
        plan.lens.forEach((l, i) => {
            assert.ok(near(l, spot.eyes[i]) < 0.5, key + ' lens ' + i + ' off its eye by ' + near(l, spot.eyes[i]).toFixed(1));
            assert.ok(Math.abs(l.r - spot.r) < 0.5, key + ' lens ' + i + ' radius ' + l.r.toFixed(1) + ' vs ' + spot.r.toFixed(1));
        });
        // The flown path really rounds each eye: every direction from the eye meets the ribbon's centre line near the radius
        plan.lens.forEach((l, i) => {
            const s0 = plan.marks[i], s1 = plan.marks[i + 1];
            const hit = Array(24).fill(Infinity);
            for (let s = s0; s <= s1; s += 1) {
                const p = plan.route.atS(s), d = Math.hypot(p.x - l.x, p.y - l.y);
                const a = Math.floor(((Math.atan2(p.y - l.y, p.x - l.x) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * 24) % 24;
                hit[a] = Math.min(hit[a], Math.abs(d - l.r));
            }
            const worst = Math.max(...hit);
            assert.ok(worst < l.r * 0.18, key + ' loop ' + i + ' strays ' + worst.toFixed(1) + 'px from a circle of ' + l.r.toFixed(0));
        });
    });
});

test('one leg per detent: loop 1 done at step 2, loop 2 at step 3, touchdown at step 4, stopped at step 5', () => {
    Object.keys(LAYOUTS).forEach((key) => {
        const { plan } = planFor(key);
        const m = plan.marks;
        assert.strictEqual(m.length, 5);
        assert.ok(m[0] === plan.s0 && m[4] === plan.s1 && plan.s1 === plan.route.L, key + ' starts and ends with the flight');
        for (let i = 1; i < 5; i++) assert.ok(m[i] > m[i - 1] + 20, key + ' leg ' + i + ' has length');
        // Step 2 rests at loop 1's exit, under its eye, and step 3 at loop 2's
        [1, 2].forEach((i) => {
            const p = plan.route.atS(m[i]), l = plan.lens[i - 1];
            assert.ok(Math.abs(p.x - l.x) < l.r * 1.2 && p.y > l.y + l.r * 0.8 && p.y < l.y + l.r * 1.3, key + ' step ' + (i + 1) + ' at ' + p.x.toFixed(0) + ',' + p.y.toFixed(0));
            assert.ok(Math.abs(Math.cos(p.a)) > 0.9, key + ' step ' + (i + 1) + ' level out of the loop');
        });
        // Touchdown and the stop are level, below the words
        [3, 4].forEach((i) => {
            const p = plan.route.atS(m[i]);
            assert.ok(p.y > plan.box.b, key + ' step ' + (i + 1) + ' below the words');
        });
        const end = plan.route.atS(m[4] - 2);
        assert.ok(Math.abs(Math.sin(end.a)) < 0.2, key + ' lands level');
        // legS walks the marks
        [0, 0.25, 0.5, 0.75, 1].forEach((t, i) => assert.ok(Math.abs(legS(m, t) - m[i]) < 1e-9, key + ' legS ' + t));
        assert.ok(Math.abs(legS(m, 0.125) - (m[0] + m[1]) / 2) < 1e-9 && legS(m, -1) === m[0] && legS(m, 2) === m[4]);
    });
});

test('seven detents on the flight: the intro rests on the take-off with nothing drawn, the categories fly one leg each', () => {
    Object.keys(LAYOUTS).forEach((key) => {
        const { plan } = planFor(key);
        const st = plan.steps, m = plan.marks;
        assert.strictEqual(st.length, 7);
        assert.strictEqual(st[0], 0, key + ' intro at the take-off: empty trail');
        assert.ok(st[1] > 20 && st[1] <= plan.calm[0], key + ' Frontend climbs past the asterisk to loop 1 entry, ' + st[1].toFixed(0));
        assert.ok(st[1] < m[1] - 20, key + ' loop 1 still to fly after Frontend');
        assert.deepStrictEqual(st.slice(2, 4), m.slice(1, 3), key + ' Backend closes loop 1, AI / ML loop 2');
        assert.ok(st[4] > m[2] + 20 && st[4] < m[3] - 20, key + ' Languages ends the dive short of touchdown');
        assert.deepStrictEqual(st.slice(5), m.slice(3), key + ' Tools touches down, Experience rolls out to the stop');
        for (let k = 1; k < 7; k++) assert.ok(st[k] - st[k - 1] > 40, key + ' leg ' + k + ' is ' + (st[k] - st[k - 1]).toFixed(0) + 'px');
        // Detent k of the seven sits at t = k / 6
        st.forEach((s, k) => assert.ok(Math.abs(legS(st, k / 6) - s) < 1e-9, key + ' legS step ' + k));
        assert.ok(legS(st, 1 / 12) > 0 && legS(st, 1 / 12) < st[1], key + ' halfway to Frontend is on the climb');
    });
});

test('Languages rests at the foot of the dive: below the words, beside the skills (desktop), heading down', () => {
    Object.keys(LAYOUTS).forEach((key) => {
        const { L, plan } = planFor(key);
        const p = plan.route.atS(plan.steps[4]);
        assert.ok(p.y > plan.box.b, key + ' at ' + p.x.toFixed(0) + ',' + p.y.toFixed(0) + ' below the words');
        assert.ok(Math.sin(p.a) > 0.5, key + ' still descending, heading ' + p.a.toFixed(2));
        if (DESKTOP.includes(key)) assert.ok(p.x > L.words.r && p.x < L.list.l, key + ' between the columns at x ' + p.x.toFixed(0));
    });
});

test('take-off passes the asterisk on its right; the dive drops between the words and the skills', () => {
    DESKTOP.forEach((key) => {
        const { L, plan } = planFor(key);
        const S = Math.round(Math.min(L.w, L.h) * 0.58), tip = L.starX + S * 0.375;
        let atStar = null;
        for (let s = 0; s < plan.marks[1]; s++) {
            const p = plan.route.atS(s);
            if (Math.abs(p.y - L.h / 2) < 2) { atStar = p; break; }
        }
        assert.ok(atStar && atStar.x > tip && atStar.x < L.words.l, key + ' crosses the star\'s height at ' + (atStar && atStar.x.toFixed(0)) + ' (tip ' + tip.toFixed(0) + ')');
        const mid = (L.words.b + L.list.t) / 2;
        let dive = null;
        for (let s = plan.marks[2]; s < plan.marks[3]; s++) {
            const p = plan.route.atS(s);
            if (Math.abs(p.y - mid) < 2) { dive = p; break; }
        }
        assert.ok(dive && dive.x > L.words.r && dive.x < L.list.l, key + ' dive at ' + (dive && dive.x.toFixed(0)));
    });
});

test('the ribbon keeps clear of every category\'s words wherever it isn\'t rimming an eye', () => {
    Object.keys(LAYOUTS).forEach((key) => {
        const { L, plan, ribbonW } = planFor(key);
        assert.ok(plan.ok, key + ' minClear ' + plan.minClear.toFixed(1) + ' < ' + plan.clear.toFixed(1));
        assert.ok(plan.minClear - ribbonW / 2 >= 7.5, key + ' ribbon edge only ' + (plan.minClear - ribbonW / 2).toFixed(1) + 'px from the words');
        console.log('     ' + key + ': ribbon edge ' + (plan.minClear - ribbonW / 2).toFixed(0) + 'px from the words; loops ' +
            (plan.lensOk ? (plan.lensClear - ribbonW / 2).toFixed(0) + 'px clear' : 'under the words (stacked column over the eyes)'));
    });
    DESKTOP.forEach((key) => assert.ok(planFor(key).plan.lensOk, key + ' loops clear of the words too'));
});

test('phones: the stacked column sits on the eyes, so the dive drops down the free strip right of the skills and lands short of the take-off', () => {
    [{}, { list: Object.assign({}, LAYOUTS['390x844'].list, { r: 340.6 }) }].forEach((over) => {
        const { L, plan } = planFor('390x844', over);
        assert.ok(plan.stacked && plan.onEyes, 'stacked, loops on the eyes');
        let lo = Infinity;
        for (let s = plan.marks[2]; s < plan.marks[3]; s++) {
            const p = plan.route.atS(s);
            if (p.y > L.list.t && p.y < L.list.b) lo = Math.min(lo, p.x);
        }
        assert.ok(lo > L.list.r && lo <= L.w - 24, 'dive beside the skills at x >= ' + lo.toFixed(1));
        const stop = plan.route.atS(plan.s1);
        let up = Infinity;
        for (let s = 0; s < plan.marks[1]; s++) {
            const p = plan.route.atS(s);
            if (Math.abs(p.y - stop.y) < 3) up = Math.min(up, p.x);
        }
        assert.ok(stop.x > up + 40 && stop.y > L.list.b, 'lands at ' + stop.x.toFixed(0) + ',' + stop.y.toFixed(0) + ', take-off passes x ' + up.toFixed(0));
    });
});

test('a loop that would touch the words shrinks or steps off them before giving up its eye', () => {
    const { L, spot } = planFor('1920x1080');
    // Words rising to just under the right eye: the loop at full size would overlap them
    const words = Object.assign({}, L.words, { t: spot.eyes[1].y + spot.r + 6 });
    const { plan } = planFor('1920x1080', { words });
    assert.ok(plan.lensOk && plan.ok, 'still clear');
    const l = plan.lens[1];
    assert.ok(l.r < spot.r || near(l, spot.eyes[1]) > 0, 'adjusted');
    assert.ok(near(l, spot.eyes[1]) <= spot.r * 0.41, 'eye stays inside its loop');
    // Words over the eye itself: nothing clears, so the loop stays on the eye (under the words) and says so
    const over = planFor('1920x1080', { words: Object.assign({}, L.words, { t: spot.eyes[0].y - 10 }) }).plan;
    assert.ok(!over.lensOk && near(over.lens[0], spot.eyes[0]) < 0.5 && Math.abs(over.lens[0].r - spot.r) < 0.5, 'held on the eye');
});

test('eyes off the stage: the pair is flown in the band above the words instead', () => {
    const { L } = planFor('1920x1080');
    const { plan } = planFor('1920x1080', { eyes: [{ x: 873, y: -40 }, { x: 1088, y: -30 }] });
    assert.ok(!plan.onEyes && plan.ok && plan.lensOk, 'fallback is clear');
    plan.lens.forEach((l) => assert.ok(l.y + l.r < L.words.t && l.y - l.r > 0 && l.x > L.words.l && l.x < L.words.r, 'loop in the band at ' + l.x.toFixed(0) + ',' + l.y.toFixed(0)));
});

test('GLITCH\'s endpoints sit just inside the viewport', () => {
    Object.keys(LAYOUTS).forEach((key) => {
        const { L, plan } = planFor(key);
        [plan.s0, plan.s1].forEach((s) => {
            const p = plan.route.atS(s);
            assert.ok(p.x >= INSET - 1 && p.x <= L.w - INSET + 1 && p.y >= INSET - 1 && p.y <= L.h - INSET + 1, key + ' endpoint ' + p.x.toFixed(0) + ',' + p.y.toFixed(0));
        });
    });
});

test('route is arc-length parameterised: equal t steps are equal distances along it', () => {
    const r = createRouteFor(1920, 1080);
    const K = 400;
    let worst = 0;
    for (let i = 0; i < K; i++) {
        const p = r.at(i / K), q = r.at((i + 1) / K);
        worst = Math.max(worst, Math.abs(Math.hypot(q.x - p.x, q.y - p.y) - r.L / K) / (r.L / K));
    }
    assert.ok(worst < 0.05, 'chord vs arc error ' + (worst * 100).toFixed(2) + '%');
});

test('route tangent points along the direction of travel, round the loops too', () => {
    const r = createRouteFor(1920, 1080);
    for (let i = 1; i < 400; i++) {
        const p = r.at(i / 400), q = r.at(i / 400 + 0.0005);
        const d = Math.atan2(q.y - p.y, q.x - p.x);
        const err = Math.abs(Math.atan2(Math.sin(d - p.a), Math.cos(d - p.a)));
        assert.ok(err < 0.35, 't=' + i / 400 + ' err ' + err.toFixed(2));
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

test('the goggles stay calm: plan.calm spans both loops, and there the band is red with only the odd stuck sub-pixel', () => {
    ['1920x1080', '1366x768', '390x844'].forEach((key) => {
        const { plan, ribbonW } = planFor(key);
        const [a, b] = plan.calm;
        assert.ok(a > 0 && a < plan.marks[1] && b === plan.marks[2], key + ' calm ' + a + '..' + b);
        const cell = Math.max(3, ribbonW / 7), half = ribbonW / 2;
        const plain = ribbonCells(plan.route, { cell, half, seed: 0x5ced04 });
        const calm = ribbonCells(plan.route, { cell, half, seed: 0x5ced04, calm: plan.calm });
        const count = Array(11).fill(0);
        let n = 0;
        calm.forEach((c, i) => {
            const inside = c.s >= a && c.s <= b;
            if (!inside) return assert.strictEqual(c.k, plain[i].k, key + ' outside the loops is untouched');
            n++;
            count[c.k]++;
        });
        assert.ok(n > 50, key + ' cells in the loops ' + n);
        [0, 2, 3, 4, 7, 10].forEach((k) => assert.strictEqual(count[k], 0, key + ' kind ' + k + ' in the loops'));
        assert.ok(count[1] / n < 0.06, key + ' sub-pixels ' + count[1] + '/' + n);
    });
});

test('the eye loops ring the sockets: centreline at 62 video px, so a narrowed band clears the eye corners and brows', () => {
    const { plan, ribbonW } = planFor('1920x1080');
    const k = Math.max(1920 / 1440, 1080 / 1920);
    plan.lens.forEach((l) => {
        assert.ok(Math.abs(l.r - 62 * k) < 0.5, 'lens r ' + l.r.toFixed(1));
        assert.ok(l.r - ribbonW * 0.55 / 2 > 50 * k, 'inner edge ' + (l.r - ribbonW * 0.275).toFixed(1));
    });
});

const { navSpan, navHide } = require(path.join(__dirname, '..', 'final', 'js', 'skills-wheel.js'));

test('nav lifts as slide 04 starts entering and returns once the portrait wipe has erased the eyes', () => {
    // 1920x1080 as measured live (scratch/sixth-arm/wheel.js): section 4577..8008, detents 4717..6661 (intro + six
    // categories), eye loops' tops at 86.7
    const eyeTop = Math.min(...eyeSpots(1920, 1080).eyes.map((e) => e.y)) - eyeSpots(1920, 1080).r;
    const span = navSpan({ sTop: 4577, sBot: 8008, A: 4717, B: 6661, H: 1080, eyeTop });
    assert.strictEqual(span[0], 4577 - 1080 * 0.85);
    // the bundle's shader: the loops' top row (GL height v) is gone at u_bottomProgress 0.8 (0.7 v + 0.225) + 0.2,
    // with the wipe's noise at its worst; no row of the loops survives past it
    const bp = (span[1] - (7360 - 1080)) / 1080;
    for (let y = eyeTop; y <= eyeTop + 300; y += 4) {
        for (let n = 0; n <= 0.075; n += 0.015) {
            const v = 1 - y / 1080, row = v * 0.7 + 0.15 + n;
            assert.ok(bp - 0.2 >= row * 0.8 - 1e-9, 'row ' + y + ' still showing at bp ' + bp.toFixed(3));
        }
    }
    assert.ok(span[1] > 6661 && span[1] < 8008, 'end ' + span[1]);
    console.log('     section bottom ' + (8008 - span[1]).toFixed(1) + 'px from the viewport top when the nav returns');
    // a stage that engages before the section's top would reach the line still starts it
    assert.strictEqual(navSpan({ sTop: 1000, sBot: 3000, A: 50, B: 900, H: 800, eyeTop: 10 })[0], 50);
    console.log('     1920x1080: hidden from scroll ' + span[0] + ' to ' + span[1].toFixed(0) + ' (eye loops top ' + eyeTop.toFixed(1) + ')');
});

test('nav state has 40px of hysteresis at both edges, the same scrolling either way', () => {
    const span = [1000, 5000];
    const walk = (ys) => ys.reduce((acc, y) => { acc.h = navHide(acc.h, y, span); acc.seen.push(acc.h); return acc; }, { h: false, seen: [] }).seen;
    assert.deepStrictEqual(walk([990, 1010, 1019, 1021, 1000, 981, 979]), [false, false, false, true, true, true, false]);
    assert.deepStrictEqual(walk([1021, 4990, 5010, 5019, 5021, 5000, 4981, 4979]), [true, true, true, true, false, false, false, true]);
});

test('counters: five expertise detents count to 05, experience is its own 01 / 01 cycle', () => {
    const { cycleInfo, counter } = require(path.join(__dirname, '..', 'final', 'js', 'skills-wheel.js'));
    // intro, Frontend, Backend, AI / ML, Languages, Tools, Experience: as cycles are read off the DOM
    const list = [null, 'expertise', 'expertise', 'expertise', 'expertise', 'expertise', 'experience'];
    const labels = list.map((_, k) => { const c = cycleInfo(list, k); return counter(c.n, c.total); });
    assert.deepStrictEqual(labels.slice(1), ['[ 01 / 05 ]', '[ 02 / 05 ]', '[ 03 / 05 ]', '[ 04 / 05 ]', '[ 05 / 05 ]', '[ 01 / 01 ]']);
    assert.deepStrictEqual(cycleInfo(list, 0), { n: 0, total: 5, cycle: 'expertise' });
    assert.deepStrictEqual(cycleInfo(list, -1), { n: 0, total: 5, cycle: 'expertise' });
    assert.deepStrictEqual(cycleInfo(list, 5), { n: 5, total: 5, cycle: 'expertise' });
    assert.deepStrictEqual(cycleInfo(list, 6), { n: 1, total: 1, cycle: 'experience' });
    // the rail fills per cycle: 1/5 ... 5/5, then full again for experience after a drain
    assert.deepStrictEqual(list.map((_, k) => { const c = cycleInfo(list, k); return c.n / c.total; }), [0, 0.2, 0.4, 0.6, 0.8, 1, 1]);
    // without an intro the first detent counts from 01 and the same split holds
    const bare = list.slice(1);
    assert.strictEqual(counter(cycleInfo(bare, 0).n, cycleInfo(bare, 0).total), '[ 01 / 05 ]');
    assert.strictEqual(counter(cycleInfo(bare, 5).n, cycleInfo(bare, 5).total), '[ 01 / 01 ]');
});

console.log('\n' + passed + ' passed' + (process.exitCode ? ', some FAILED' : ''));
