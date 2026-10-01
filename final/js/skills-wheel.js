// Projects -> Skills: row 16's asterisk drops straight down its own column into slide 04, then turns like a wheel.
// While the stage is stuck, one gesture (wheel flick, trackpad swipe, touch swipe, key) is one 60° detent and one
// category swap; the first detent up and the last detent down hand the page back to normal scrolling.
// GLITCH (pixel-bug.js) is leashed to a ribbon route planned around the words while the stage is stuck: it flies in to
// the route's start, travels a quarter of it per detent and leaves dead pixels behind it until reverse steps eat them
// back; then it's handed back to wandering.
(function (root) {
    'use strict';

    // Gesture classifier. Times are ms. A gesture ends after GAP of wheel silence, on a direction change, or when a
    // delta surges well above the decaying tail (a new swipe landing on top of trackpad inertia).
    function createIntent(opt) {
        const o = opt || {};
        const GAP = o.gap || 180;
        const LOCK = o.lock || 860;
        const WHEEL_MIN = o.wheelMin || 6;
        const TOUCH_MIN = o.touchMin || 32;
        const TAU = 100;
        let last = -Infinity, dir = 0, acc = 0, peak = 0, tail = 0, spent = false, firedAt = -Infinity, lockUntil = -Infinity;
        let touchY = null, touchSpent = false;

        const fire = (d, t) => {
            spent = true;
            touchSpent = true;
            firedAt = t;
            lockUntil = t + LOCK;
            return d;
        };

        return {
            locked: (t) => t < lockUntil,
            // Entering the stage owns whatever gesture carried the page there, so its inertia can't skip category one
            claim(t) {
                spent = true;
                touchSpent = true;
                firedAt = t;
                lockUntil = t + LOCK;
            },
            wheel(dy, t) {
                const mag = Math.abs(dy);
                if (!mag) return 0;
                const d = dy > 0 ? 1 : -1;
                if (d !== dir && mag < 4 && t - last <= GAP) {
                    last = t;
                    return 0;
                }
                const decayed = tail * Math.exp(-(t - last) / TAU);
                const fresh = t - last > GAP || d !== dir || (mag >= 16 && mag > decayed * 2.5);
                last = t;
                tail = Math.max(mag, decayed);
                if (fresh) {
                    dir = d;
                    acc = 0;
                    peak = 0;
                    spent = false;
                }
                acc += mag;
                peak = Math.max(peak, mag);
                if (t < lockUntil) return 0;
                if (!spent) return acc >= WHEEL_MIN ? fire(d, t) : 0;
                // A mouse wheel that keeps spinning at full strength is new intent; trackpad inertia decays well below its peak
                if (t - firedAt > LOCK + 250 && peak >= 30 && mag >= peak * 0.8) return fire(d, t);
                return 0;
            },
            touchStart(y) {
                touchY = y;
                touchSpent = false;
            },
            touchMove(y, t) {
                if (touchY === null || touchSpent) return 0;
                const dy = touchY - y;
                if (Math.abs(dy) < TOUCH_MIN || t < lockUntil) return 0;
                return fire(dy > 0 ? 1 : -1, t);
            },
            touchEnd() {
                touchY = null;
            },
            key(d, t) {
                return t < lockUntil ? 0 : fire(d, t);
            },
        };
    }

    // Pin zone [A, B] in scroller pixels; detent k rests at A + (B - A) * k / (n - 1).
    function createZone(n, opt) {
        const o = opt || {};
        const TOL = o.tol || 4;
        const DEV = o.dev || 6;
        const z = { pinned: false, step: 0, guard: false, A: 0, B: 0 };
        let prev = null;

        const offset = (k) => Math.round(z.A + (z.B - z.A) * k / (n - 1));
        const nearest = (y) => Math.max(0, Math.min(n - 1, Math.round((y - z.A) / (z.B - z.A) * (n - 1))));
        const inside = (y) => y > z.A + TOL && y < z.B - TOL;
        const engage = (k) => {
            z.pinned = true;
            z.step = k;
            z.guard = false;
            return { type: 'engage', step: k, y: offset(k) };
        };

        z.offset = offset;
        z.frame = (y, A, B, drag, anim) => {
            const moved = A !== z.A || B !== z.B;
            z.A = A;
            z.B = B;
            const p = prev;
            prev = y;
            if (B - A < n) return null;
            if (z.pinned) {
                if (moved) return { type: 'snap', y: offset(z.step) };
                // Anything else moving the page (scrollbar, find-in-page, another script) wins; stepping resumes on re-entry
                if (!anim && Math.abs(y - offset(z.step)) > DEV) {
                    z.pinned = false;
                    z.guard = true;
                    return { type: 'release', external: true };
                }
                return null;
            }
            if (drag) return null;
            if (z.guard) {
                if (inside(y)) return null;
                z.guard = false;
            }
            if (p !== null && p < A && y >= A && y <= B) return engage(0);
            if (p !== null && p > B && y <= B && y >= A) return engage(n - 1);
            if (inside(y)) return engage(nearest(y));
            return null;
        };
        z.input = (d) => {
            if (!z.pinned || !d) return null;
            const to = z.step + d;
            if (to < 0 || to > n - 1) {
                z.pinned = false;
                return { type: 'release', dir: d, y: d < 0 ? z.A : z.B };
            }
            z.step = to;
            return { type: 'step', step: to, y: offset(to) };
        };
        z.external = () => {
            const was = z.pinned;
            z.pinned = false;
            z.guard = true;
            return was ? { type: 'release', external: true } : null;
        };
        z.unguard = () => {
            z.guard = false;
        };
        z.desired = (y) => {
            if (z.pinned) return z.step;
            if (y <= z.A + TOL) return -1;
            if (y >= z.B - TOL) return n - 1;
            return nearest(y);
        };
        return z;
    }

    // Segment i of a uniform Catmull-Rom through P (the prototype's bezier controls), at t in [0, 1]
    function crPoint(P, i, t) {
        const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
        const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
        const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
        const u = 1 - t;
        return [
            u * u * u * p1[0] + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * p2[0],
            u * u * u * p1[1] + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * p2[1],
        ];
    }

    const rectDist = (x, y, r) => Math.hypot(Math.max(r.l - x, 0, x - r.r), Math.max(r.t - y, 0, y - r.b));
    const unite = (a, b) => (!a ? b : !b ? a : { l: Math.min(a.l, b.l), t: Math.min(a.t, b.t), r: Math.max(a.r, b.r), b: Math.max(a.b, b.b) });

    // The curve through stage-pixel control points, sampled densely and parameterised by arc length
    function createRoute(P) {
        const SEG = 48;
        const xs = [], ys = [], cum = [];
        let L = 0;
        for (let i = 0; i < P.length - 1; i++) {
            for (let j = i ? 1 : 0; j <= SEG; j++) {
                const q = crPoint(P, i, j / SEG);
                if (xs.length) L += Math.hypot(q[0] - xs[xs.length - 1], q[1] - ys[ys.length - 1]);
                xs.push(q[0]);
                ys.push(q[1]);
                cum.push(L);
            }
        }
        const n = xs.length;
        const pos = (s) => {
            s = Math.max(0, Math.min(L, s));
            let lo = 0, hi = n - 1;
            while (hi - lo > 1) {
                const mid = (lo + hi) >> 1;
                if (cum[mid] <= s) lo = mid;
                else hi = mid;
            }
            const f = cum[hi] > cum[lo] ? (s - cum[lo]) / (cum[hi] - cum[lo]) : 0;
            return [xs[lo] + (xs[hi] - xs[lo]) * f, ys[lo] + (ys[hi] - ys[lo]) * f];
        };
        // Tangent from a short chord, so heading doesn't snap at sample joints
        const atS = (s) => {
            const p = pos(s), q0 = pos(s - 6), q1 = pos(s + 6);
            return { x: p[0], y: p[1], a: Math.atan2(q1[1] - q0[1], q1[0] - q0[0]) };
        };
        return { L, atS, at: (t) => atS(t * L), xs, ys };
    }

    // A cursive loop (prolate trochoid) at xc travelling `dir`; vs -1 throws its bowl upward, +1 downward
    function curl(xc, yc, b, dir, vs) {
        const a = b * 0.32, out = [];
        for (let k = 0; k <= 8; k++) {
            const u = -Math.PI + k * Math.PI / 4;
            out.push([xc + dir * (a * u - b * Math.sin(u)), yc + vs * b * Math.cos(u)]);
        }
        return out;
    }

    // A wave along a horizontal corridor yr = [top, bottom] of centre-line positions, with curls at fractions `curls`
    function sweep(yr, xa, xb, curls, vs, w) {
        const yc = (yr[0] + yr[1]) / 2, hh = (yr[1] - yr[0]) / 2;
        const span = Math.abs(xb - xa), dir = xb >= xa ? 1 : -1;
        const rho = Math.min(hh * 0.7, Math.max(w * 0.055, 34) * (w < 700 ? 1.5 : 1), span * 0.16);
        const amp = hh * 0.58;
        const n = Math.max(1, Math.round(span / Math.max(150, w * 0.13)));
        const loops = rho >= 16 ? curls.map((f) => xa + (xb - xa) * f) : [];
        const pts = [];
        let li = 0;
        for (let i = 0; i <= n; i++) {
            const x = xa + (xb - xa) * i / n;
            while (li < loops.length && dir * (x - loops[li]) > 0) pts.push(...curl(loops[li++], yc, rho, dir, vs));
            if (i === 0 || i === n || loops.every((lx) => Math.abs(x - lx) > rho * 1.9)) pts.push([x, yc + amp * Math.sin(i * 2.2 + (vs > 0 ? 1.1 : 0))]);
        }
        return pts;
    }

    // Pushes control points out of any rect the curve comes within `m` of, and back inside the stage edge `e`
    function settle(P, rects, w, h, e, m) {
        for (let it = 0; it < 32; it++) {
            const push = P.map(() => [0, 0]);
            let bad = false;
            const want = (i, vx, vy) => {
                if (Math.hypot(vx, vy) > Math.hypot(push[i][0], push[i][1])) push[i] = [vx, vy];
            };
            for (let i = 0; i < P.length - 1; i++) {
                for (let j = 0; j <= 16; j++) {
                    const q = crPoint(P, i, j / 16);
                    let vx = 0, vy = 0;
                    rects.forEach((r) => {
                        const d = rectDist(q[0], q[1], r);
                        if (d >= m) return;
                        let nx = q[0] - Math.max(r.l, Math.min(r.r, q[0])), ny = q[1] - Math.max(r.t, Math.min(r.b, q[1]));
                        if (!nx && !ny) {
                            const dl = q[0] - r.l, dr = r.r - q[0], dt = q[1] - r.t, db = r.b - q[1], mn = Math.min(dl, dr, dt, db);
                            if (mn === dl) nx = -1; else if (mn === dr) nx = 1; else if (mn === dt) ny = -1; else ny = 1;
                        }
                        const nl = Math.hypot(nx, ny), need = m - d + 2;
                        vx += nx / nl * need;
                        vy += ny / nl * need;
                    });
                    if (q[0] < e) vx += e - q[0] + 1;
                    if (q[0] > w - e) vx -= q[0] - (w - e) + 1;
                    if (q[1] < e) vy += e - q[1] + 1;
                    if (q[1] > h - e) vy -= q[1] - (h - e) + 1;
                    if (!vx && !vy) continue;
                    bad = true;
                    want(i, vx, vy);
                    want(i + 1, vx, vy);
                }
            }
            if (!bad) return;
            P.forEach((p, i) => {
                p[0] = Math.max(e, Math.min(w - e, p[0] + push[i][0]));
                p[1] = Math.max(e, Math.min(h - e, p[1] + push[i][1]));
            });
        }
    }

    // GLITCH's route, drawn around the words rather than over them. The union of every category's title, counter and
    // skills boxes, grown by `clear`, leaves three free zones: the band above it, the band below it, and the lane between
    // it and the asterisk. The full route wraps the words (top band right to left with a curl, down the lane, bottom band
    // left to right with a curl); the lane is dropped when its centre line would cross the asterisk's arm sweep, a band
    // when it's thinner than nothing. Each candidate is settled, then checked densely; the first that holds wins.
    function planRoute(o) {
        const w = o.w, h = o.h, e = o.edge, m = o.clear;
        const rects = (o.rects || []).filter((r) => r && r.r > r.l && r.b > r.t);
        const T = rects.reduce((a, r) => unite(a, r), null) || { l: w * 0.3, t: h * 0.45, r: w - e, b: h * 0.55 };
        const E = { l: T.l - m, t: T.t - m, r: T.r + m, b: T.b + m };
        const s = o.star;
        const x0 = Math.max(e, w * 0.07), x1 = w - x0;
        const top = E.t >= e ? [e, E.t] : null;
        const bot = E.b <= h - e ? [E.b, h - e] : null;
        const laneX = Math.min(E.l, x1);
        const laneOk = laneX >= e && (!s || laneX >= s.x + s.r);
        const room = s ? laneX - (s.x + s.r + (o.starPad || 0)) : laneX - e;
        const bulge = Math.max(0, Math.min(room * 0.5, w * 0.04));
        const lx = laneX - bulge * 0.2, lm = laneX - bulge;
        const turnT = top ? Math.max(24, (top[1] - top[0]) * 0.4) : 0, turnB = bot ? Math.max(24, (bot[1] - bot[0]) * 0.4) : 0;
        const cands = [];
        if (top && bot && laneOk) {
            cands.push(['wrap', sweep(top, x1, Math.min(x1 - 1, laneX + turnT), [0.42], -1, w)
                .concat([[lx, E.t], [lm, (E.t + E.b) / 2], [lx, E.b]], sweep(bot, Math.min(x1 - 1, laneX + turnB), x1, [0.58], 1, w))]);
        }
        if (top && laneOk) cands.push(['top-lane', sweep(top, x1, Math.min(x1 - 1, laneX + turnT), [0.45], -1, w).concat([[lx, E.t], [lm, (E.t + h - e) / 2], [lx, h - e]])]);
        if (bot && laneOk) cands.push(['lane-bottom', [[lx, e], [lm, (e + E.b) / 2], [lx, E.b]].concat(sweep(bot, Math.min(x1 - 1, laneX + turnB), x1, [0.55], 1, w))]);
        const bands = [[top, -1, 'top'], [bot, 1, 'bottom']].filter((b) => b[0]).sort((a, b) => (b[0][1] - b[0][0]) - (a[0][1] - a[0][0]));
        bands.forEach((b) => cands.push([b[2], sweep(b[0], x0, x1, [0.3, 0.68], b[1], w)]));
        if (laneX >= e) cands.push(['lane', [[lx, e], [lm, h / 2], [lx, h - e]]]);
        if (!cands.length) cands.push(['edge', sweep([e, e], x0, x1, [], -1, w)]);

        let best = null;
        for (const [kind, P] of cands) {
            settle(P, rects, w, h, e, m);
            const route = createRoute(P);
            let minClear = Infinity, starClear = Infinity, inside = true;
            for (let i = 0; i < route.xs.length; i++) {
                const x = route.xs[i], y = route.ys[i];
                rects.forEach((r) => { minClear = Math.min(minClear, rectDist(x, y, r)); });
                if (s) starClear = Math.min(starClear, Math.hypot(x - s.x, y - s.y) - s.r);
                if (x < e - 1 || x > w - e + 1 || y < e - 1 || y > h - e + 1) inside = false;
            }
            const plan = { kind, pts: P, route, box: T, clear: m, minClear, starClear, ok: inside && minClear >= m - 1 };
            if (plan.ok) return plan;
            if (!best || plan.minClear > best.minClear) best = plan;
        }
        return best;
    }

    function mulberry32(seed) {
        let a = seed | 0;
        return () => {
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // Dead-pixel damage along a route, seeded so the same stage always breaks the same way. Cells sit on a `cell`-px grid
    // and each grid cell is owned by the first stamp that reaches it, so drawing every cell with s <= progress grows and
    // erases the trail without re-rolling anything. Kinds: 0 dead, 1 RGB sub-pixels, 2 magenta, 3 cyan, 4 green, 5 red,
    // 6 blue, 7 hot white, 8 dim.
    const DAMAGE_ZONES = [
        [0.34, [60, 6, 3, 3, 2, 1, 1, 6, 18]],     // dead patch
        [0.46, [12, 26, 14, 14, 14, 5, 5, 8, 2]],  // stuck sub-pixels
        [0.2, [18, 32, 9, 10, 4, 3, 2, 22, 0]],    // burn-in
    ];
    function buildDamage(route, o) {
        const rnd = mulberry32(o.seed || 0x5ced04);
        const c = o.cell;
        const owned = new Map();
        const cells = [], tears = [];
        const ph1 = rnd() * 6.283, ph2 = rnd() * 6.283;
        const pick = (weights) => {
            let r = rnd() * weights.reduce((x, y) => x + y, 0);
            for (let i = 0; i < weights.length; i++) if ((r -= weights[i]) < 0) return i;
            return 0;
        };
        // Nothing is stamped within `gap` of a kept-out box (the words), whatever the band's ragged edge does
        const avoid = o.avoid || [], gap = o.gap || 0;
        const clearOf = (x0, y0, x1, y1) => avoid.every((r) => Math.hypot(Math.max(r.l - x1, 0, x0 - r.r), Math.max(r.t - y1, 0, y0 - r.b)) >= gap);
        // Dead clusters overwrite whatever kind already owns a cell (keeping its s), so they punch through the band
        const put = (gx, gy, s, k, over) => {
            if (avoid.length && !clearOf(gx * c, gy * c, gx * c + c, gy * c + c)) return;
            const key = (gx + 4096) * 8192 + (gy + 4096);
            const had = owned.get(key);
            if (had) {
                if (over) {
                    had.k = k;
                    had.f = false;
                }
                return;
            }
            const cell = { gx, gy, s, k, f: k !== 0 && k !== 8 && rnd() < 0.3 };
            owned.set(key, cell);
            cells.push(cell);
        };
        let zone = DAMAGE_ZONES[1][1], zoneUntil = -1;
        for (let s = 0; s <= route.L; s += c * 0.9) {
            const p = route.atS(s);
            const nx = -Math.sin(p.a), ny = Math.cos(p.a);
            const wob = 0.5 + 0.3 * Math.sin(s / 90 + ph1) + 0.2 * Math.sin(s / 37 + ph2);
            const hw = (o.bandMin + (o.bandMax - o.bandMin) * wob) / 2;
            if (s >= zoneUntil) {
                const r = rnd();
                zone = r < DAMAGE_ZONES[0][0] ? DAMAGE_ZONES[0][1] : r < DAMAGE_ZONES[0][0] + DAMAGE_ZONES[1][0] ? DAMAGE_ZONES[1][1] : DAMAGE_ZONES[2][1];
                zoneUntil = s + 30 + rnd() * 110;
            }
            for (let off = -hw * 1.6; off <= hw * 1.6; off += c) {
                const r = Math.abs(off) / hw;
                const fill = r < 0.45 ? 0.9 : r < 1 ? 0.9 - (r - 0.45) * 1.25 : 0.06;
                if (rnd() >= fill) continue;
                put(Math.floor((p.x + nx * off + (rnd() - 0.5) * c) / c), Math.floor((p.y + ny * off + (rnd() - 0.5) * c) / c), s, pick(zone));
            }
            if (rnd() < 0.035) {
                const w = 2 + Math.floor(rnd() * 4), hh = 1 + Math.floor(rnd() * 3);
                const gx = Math.floor((p.x + nx * (rnd() - 0.5) * hw) / c) - (w >> 1), gy = Math.floor((p.y + ny * (rnd() - 0.5) * hw) / c) - (hh >> 1);
                for (let i = 0; i < w; i++) for (let j = 0; j < hh; j++) put(gx + i, gy + j, s, 0, true);
            }
            if (rnd() < 0.016) {
                const len = 4 + Math.floor(rnd() * 12);
                const t = {
                    s,
                    gx: Math.floor((p.x - len * c / 2 + (rnd() - 0.5) * hw) / c),
                    gy: Math.floor((p.y + (rnd() - 0.5) * hw * 2) / c),
                    len,
                    dx: (rnd() < 0.5 ? -1 : 1) * (1 + Math.floor(rnd() * 2)),
                    h: rnd() < 0.55 ? 0.5 : 1,
                    k: rnd() < 0.6 ? 7 : 2 + Math.floor(rnd() * 3),
                };
                // Its whole sweep: the displacement, a flicker jolt of two more, and the red/cyan split either side
                const reach = Math.abs(t.dx) * 3 * c + 3;
                if (!avoid.length || clearOf(t.gx * c - reach, t.gy * c, (t.gx + len) * c + reach, (t.gy + 1) * c)) tears.push(t);
            }
        }
        return { cells, tears };
    }

    if (typeof window === 'undefined' && typeof module === 'object' && module && module.exports) {
        module.exports = { createIntent, createZone, createRoute, planRoute, buildDamage };
        return;
    }

    const doc = root.document;
    const track = doc.getElementById('skWheel');
    if (!track || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    const reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const narrowMq = root.matchMedia ? root.matchMedia('(max-width: 700px)') : null;

    const scroller = doc.querySelector('.js-scroller');
    const stage = track.querySelector('.sk__stage');
    const star = track.querySelector('.sk-star');
    const railSegs = [...track.querySelectorAll('.sk-rail__seg')];
    const container = track.parentElement;
    const cats = [...track.querySelectorAll('.sk-cat')];
    const N = cats.length;
    const rows = doc.querySelectorAll('#section-projects .projects__entry');
    const srcRow = rows[rows.length - 1] || null;
    const srcIndex = srcRow && srcRow.querySelector('.projects__entry-index');
    if (!scroller || !stage || !star || N < 2) return;

    const CAT_LINES = [
        'frontend. react 19, gsap, three.js. and still nobody can center me.',
        'backend. fastapi and postgres. i live in the logs now.',
        'ai / ml. pytorch found me in the training data. rude.',
        'seven languages. i only speak segfault.',
        'git, docker, ollama. git blame still says it was me.',
    ];

    const ARM = Math.PI / 3;          // one detent: the asterisk's six arms repeat every 60°
    const LOCK = 0.86;                // s a detent owns the input; the swap below settles inside it
    const T_OUT = 0.24, CAP_OUT = 0.06, T_IN = 0.52, CAP_IN = 0.12;
    const SHIFT = 135;                // % of a glyph's line box; clears the mask's 0.12em/0.2em padding either way
    const SETTLE = 0.45;              // s to settle onto a detent after the page carries into the stage
    // Detents sit 0.3 viewports apart: under pixel-bug's 1200px/s fast-scroll threshold at this ease and LOCK
    const STEP_VH = 0.3;
    const BUG_HALF = 32;              // half of pixel-bug's 64px hit box
    const ROUTE_EDGE = 36;            // inside pixel-bug's viewport clamp (24 / 30px), so it's never pushed off its route
    const APPROACH_MAX = 2600;        // ms a detent's travel waits for GLITCH to land on the route before going anyway
    const APP_URL = '/wp-content/themes/lamalama2025/dist/assets/app-DjHRamTc.js';

    const st = { travel: 0, travelT: 0, wheel: 0, angle: 0 };
    const rail = { p: 0, tl: 0, tr: 0, sl: 0, sr: 0 };
    // GLITCH's progress along the route: detent k of N rests at k / (N - 1), so detent 1 is the start and N the end
    const path = { t: 0 };
    const dmgCanvas = track.querySelector('.sk-damage');
    const dmgCtx = dmgCanvas ? dmgCanvas.getContext('2d') : null;
    let route = null, plan = null, keepOut = [], damage = null, buckets = null, fringe = null, routeKey = '';
    let cellDev = 5, dmgScale = 1, pathTween = null, pathGoal = 0, pathDir = 1, dmgDrawn = -1, dmgDirty = true;
    let arrived = false, approachSince = 0, pendingT = null;
    let flickerOff = null, tearJolt = null, nextFlicker = 0;
    let W = 0, H = 0, S = 0, cx = 0, srcY = 0, srcS = 0.03, A = 0, B = 0, gapPx = 18;
    let geo = [];
    let visible = false, drawn = -1, detached = false, railDirty = true;
    let wantLeash = false, leashed = false;
    let shown = -1, swap = null, spin = null, fill = null;
    let appMod = null, nativeTween = null, animUntil = 0, dragging = false, nudgeAfterTouch = 0;

    const now = () => performance.now();
    const viewW = () => scroller.clientWidth;
    const say = (text) => { if (typeof root.__pixelBugSay === 'function') root.__pixelBugSay(text); };
    const easeScroll = (t) => 0.5 - Math.cos(Math.PI * t) / 2;

    // Meer's split: every glyph is its own inline-block inside an overflow mask; spaces become nbsp so widths hold
    function splitInto(parent, text, whole) {
        const chars = [];
        const groups = whole ? [text] : text.split(' ');
        groups.forEach((g, gi) => {
            const mk = doc.createElement('span');
            mk.className = 'sk-mk';
            for (const c of g) {
                const ch = doc.createElement('span');
                ch.className = 'sk-ch';
                ch.textContent = c === ' ' ? '\u00a0' : c;
                mk.appendChild(ch);
                chars.push(ch);
            }
            parent.appendChild(mk);
            if (gi < groups.length - 1) parent.appendChild(doc.createTextNode(' '));
        });
        return chars;
    }

    const parts = cats.map((cat, i) => {
        const title = cat.querySelector('.sk-title');
        const set = cat.querySelector('.sk-set');
        const label = title.textContent.trim();
        title.setAttribute('aria-label', label);
        title.textContent = '';
        const kick = doc.createElement('span');
        kick.className = 'sk-kicker';
        kick.setAttribute('aria-hidden', 'true');
        title.appendChild(kick);
        const kickChars = splitInto(kick, '[ 0' + (i + 1) + ' / 0' + N + ' ]', true);
        const titleChars = kickChars.concat(splitInto(title, label, false));
        const items = [];
        set.querySelectorAll('li').forEach((li) => {
            const t = li.textContent.trim();
            li.setAttribute('aria-label', t);
            li.textContent = '';
            items.push(...splitInto(li, t, true));
        });
        return { cat, title: titleChars, items, all: titleChars.concat(items), titleEl: title, setEl: set };
    });

    // ---------- scrolling: the bundle's Lenis when it runs one, the bare .js-scroller otherwise (touch-first devices)

    // Same URL the bundle's module graph resolves, so this is the running module instance; its `n` export is the live App
    function loadApp() {
        import(APP_URL).then((m) => { appMod = m; }).catch(() => {});
    }
    const lenisOf = () => {
        const app = appMod && appMod.n;
        const s = app && app.instances && app.instances.get('scroller');
        return (s && s.lenis) || null;
    };

    function scrollTo(y, dur) {
        const lenis = lenisOf();
        animUntil = now() + dur * 1000 + 120;
        if (lenis) {
            lenis.scrollTo(y, dur > 0 ? { duration: dur, easing: easeScroll, force: true } : { immediate: true, force: true });
            return;
        }
        if (nativeTween) nativeTween.kill();
        nativeTween = null;
        if (dur <= 0) {
            scroller.scrollTop = y;
            return;
        }
        const o = { y: scroller.scrollTop };
        nativeTween = gsap.to(o, { y, duration: dur, ease: 'sine.inOut', onUpdate: () => { scroller.scrollTop = o.y; } });
    }

    // Stopped Lenis still runs forced scrollTo; overflow:hidden is what halts iOS momentum on the bare scroller
    function hold(on) {
        const lenis = lenisOf();
        if (on) {
            if (lenis) lenis.stop();
            else scroller.style.setProperty('overflow-y', 'hidden', 'important');
            return;
        }
        if (lenis) lenis.start();
        scroller.style.removeProperty('overflow-y');
    }

    function nudge(d) {
        const y = scroller.scrollTop + d * H * 0.45;
        const lenis = lenisOf();
        if (lenis) lenis.scrollTo(y, { duration: 0.9 });
        else scrollTo(y, 0.7);
    }

    // ---------- the swap: outgoing glyphs clear their masks before the incoming set rises into the same masks

    const each = (cap, n, rev) => ({ each: Math.min(0.016, cap / Math.max(1, n - 1)), from: rev ? 'end' : 'start' });

    function show(k, dir) {
        const from = shown;
        shown = k;
        if (swap) swap.kill();
        parts.forEach((p, i) => { if (i !== from && i !== k) gsap.set(p.all, { yPercent: SHIFT }); });
        swap = gsap.timeline();
        const rev = dir < 0;
        let at = 0;
        if (from >= 0) {
            const p = parts[from];
            const to = rev ? SHIFT : -SHIFT;
            swap.to(p.title, { yPercent: to, duration: T_OUT, ease: 'power2.in', stagger: each(CAP_OUT, p.title.length, rev) }, 0);
            swap.to(p.items, { yPercent: to, duration: T_OUT, ease: 'power2.in', stagger: each(CAP_OUT, p.items.length, rev) }, 0);
            at = T_OUT + CAP_OUT;
        }
        if (k >= 0) {
            const p = parts[k];
            gsap.set(p.all, { yPercent: rev ? -SHIFT : SHIFT });
            swap.to(p.title, { yPercent: 0, duration: T_IN, ease: 'power4.out', stagger: each(CAP_IN, p.title.length, rev) }, at);
            swap.to(p.items, { yPercent: 0, duration: T_IN, ease: 'power4.out', stagger: each(CAP_IN, p.items.length, rev) }, at);
        }
        if (spin) spin.kill();
        spin = gsap.to(st, { wheel: k + 1, duration: 0.9, ease: 'back.out(1.2)' });
        if (fill) fill.kill();
        const g = geo[Math.max(k, 0)];
        fill = gsap.to(rail, Object.assign({ p: (k + 1) / N, duration: 0.9, ease: 'power3.out', onUpdate: () => { railDirty = true; } }, g || {}));
        travelTo(Math.max(k, 0) / (N - 1));
        if (k >= 0 && leashed) say(CAT_LINES[k]);
    }

    // A detent that lands while GLITCH is still flying in is queued until it touches down on the route, so the trail
    // never runs ahead of it; a jump of several detents takes a little longer than one.
    function travelTo(pt) {
        if (leashed && !arrived && now() - approachSince < APPROACH_MAX) {
            pendingT = pt;
            return;
        }
        pendingT = null;
        if (pt === pathGoal && (pathTween || pt === path.t)) return;
        pathGoal = pt;
        if (pt === path.t) return;
        pathDir = pt > path.t ? 1 : -1;
        if (pathTween) pathTween.kill();
        const q = Math.max(1, Math.abs(pt - path.t) * (N - 1));
        pathTween = gsap.to(path, { t: pt, duration: LOCK * Math.sqrt(q), ease: 'power2.inOut', onComplete: () => { pathTween = null; } });
    }

    function onArrive() {
        arrived = true;
        if (pendingT !== null) travelTo(pendingT);
    }

    // ---------- geometry

    // Caps sit off-centre in their line box by (ascent - descent - capHeight) / 2; shifting by it puts the ink on the axis
    let inkCtx = null;
    function inkShift(el) {
        if (!inkCtx) inkCtx = doc.createElement('canvas').getContext('2d');
        if (!inkCtx) return 0;
        const cs = getComputedStyle(el);
        inkCtx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        const m = inkCtx.measureText('H');
        if (!m.fontBoundingBoxAscent || !m.actualBoundingBoxAscent) return 0;
        return (m.fontBoundingBoxAscent - m.fontBoundingBoxDescent - m.actualBoundingBoxAscent) / 2;
    }

    function spanX(els, left) {
        let a = Infinity, b = -Infinity;
        els.forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.width <= 0) return;
            a = Math.min(a, r.left - left);
            b = Math.max(b, r.right - left);
        });
        return a < b ? [a, b] : [0, 0];
    }

    function boxOf(els, sr) {
        let box = null;
        els.forEach((el) => {
            if (!el) return;
            const r = el.getBoundingClientRect();
            if (r.width <= 0 || r.height <= 0) return;
            box = unite(box, { l: r.left - sr.left, t: r.top - sr.top, r: r.right - sr.left, b: r.bottom - sr.top });
        });
        return box;
    }

    // --sk-h drives the track's scroll length, so it changes only on resize, ahead of ScrollTrigger's debounced refresh
    function syncHeight() {
        const h = scroller.clientHeight;
        if (h && h !== H) {
            H = h;
            track.style.setProperty('--sk-h', h + 'px');
            track.style.setProperty('--sk-steps', String(N - 1));
            track.style.setProperty('--sk-step', String(STEP_VH));
            return true;
        }
        return false;
    }

    function measure() {
        // The track breaks out of the grid to the scroller's full width, so the star is cut by the viewport's left edge
        const cr = container.getBoundingClientRect();
        const pl = parseFloat(getComputedStyle(container).paddingLeft) || 0;
        W = viewW();
        track.style.setProperty('--sk-x', Math.round(-(cr.left + pl)) + 'px');
        track.style.setProperty('--sk-w', W + 'px');
        S = Math.round(Math.min(W, H) * (W < 650 ? 0.7 : 0.58));
        track.style.setProperty('--sk-S', S + 'px');
        gapPx = Math.max(14, Math.min(26, W * 0.014));

        // Row 16's ::before: a 0.8em box flush left in the index cell, vertically centred. Under 650px the index is
        // display:none, so the star leaves from the row's left edge instead.
        let size = 12, sx = W * 0.06, sy = track.getBoundingClientRect().top;
        const ir = srcIndex && srcIndex.getBoundingClientRect();
        if (ir && ir.width > 0) {
            size = 0.8 * parseFloat(getComputedStyle(srcIndex).fontSize);
            sx = ir.left + size / 2;
            sy = ir.top + ir.height / 2;
        } else if (srcRow) {
            const rr = srcRow.getBoundingClientRect();
            sx = rr.left + size / 2;
            sy = rr.top + rr.height / 2;
        }
        const sr = stage.getBoundingClientRect();
        cx = sx - sr.left;

        // The text column opens a few gaps past the star's resting right arm (x 3..21 of the 24-unit glyph)
        const narrow = !!(narrowMq && narrowMq.matches);
        const tx = Math.round(Math.max(narrow ? 0 : W * 0.29, cx + S * 9 / 24 + gapPx * 3));
        track.style.setProperty('--sk-tx', tx + 'px');
        track.style.setProperty('--sk-fit', '1');
        track.style.removeProperty('--sk-tw');
        let col;
        if (narrow) {
            col = parts[0].cat.getBoundingClientRect().width;
        } else {
            let setLeft = Infinity;
            parts.forEach((p) => { setLeft = Math.min(setLeft, p.setEl.getBoundingClientRect().left - sr.left); });
            col = setLeft - gapPx * 3 - tx;
            track.style.setProperty('--sk-tw', Math.max(0, Math.round(col)) + 'px');
        }
        let widest = 0;
        parts.forEach((p) => {
            p.titleEl.querySelectorAll(':scope > .sk-mk').forEach((mk) => { widest = Math.max(widest, mk.getBoundingClientRect().width); });
        });
        if (widest > 0 && col > 0) track.style.setProperty('--sk-fit', Math.max(0.5, Math.min(1, col / widest)).toFixed(4));
        if (narrow) {
            track.style.setProperty('--sk-ty', '0px');
            track.style.setProperty('--sk-sy', '0px');
        } else {
            track.style.setProperty('--sk-ty', inkShift(parts[0].titleEl).toFixed(2) + 'px');
            track.style.setProperty('--sk-sy', inkShift(parts[0].setEl).toFixed(2) + 'px');
        }

        // Where the rail breaks for each category's words (title ink, then the skills column), in stage pixels
        geo = parts.map((p) => {
            const t = spanX(p.titleEl.querySelectorAll(':scope > .sk-mk'), sr.left);
            const s = spanX(p.setEl.querySelectorAll('.sk-mk'), sr.left);
            return { tl: t[0], tr: t[1], sl: s[0], sr: s[1] };
        });
        if (fill) fill.kill();
        fill = null;
        Object.assign(rail, geo[Math.max(shown, 0)], { p: (shown + 1) / N });
        railDirty = true;

        // What GLITCH and its trail keep out of: the furthest extents of every category's counter, title and skills,
        // in stage pixels (masks, so ascenders and descenders count; the glyphs' own swap transforms don't)
        let kick = null, title = null, set = null;
        parts.forEach((p) => {
            kick = unite(kick, boxOf([p.titleEl.querySelector('.sk-kicker')], sr));
            title = unite(title, boxOf(p.titleEl.querySelectorAll(':scope > .sk-mk'), sr));
            set = unite(set, boxOf(p.setEl.querySelectorAll('.sk-mk'), sr));
        });
        keepOut = [kick, title, set].filter(Boolean);

        const tr = track.getBoundingClientRect();
        const scr = scroller.getBoundingClientRect();
        A = Math.round(tr.top - scr.top + scroller.scrollTop);
        B = A + Math.round(track.offsetHeight - scroller.clientHeight);
        buildTrail();

        if (reduced) return;
        // Before it sticks the stage rides the track's top edge, so the star's start offset is measured from there
        srcY = sy - (tr.top + H / 2);
        srcS = size / S;
    }

    // ---------- drawing

    const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

    function render() {
        const e = ease(st.travel);
        const on = st.travel > 0.0005;
        star.style.opacity = on ? 1 : 0;
        if (on !== detached) {
            detached = on;
            if (srcIndex) srcIndex.classList.toggle('sk-detached', on);
        }
        star.style.transform = 'translate3d(' + (cx - S / 2) + 'px,' + (srcY * (1 - e)) + 'px,0) rotate(' + (60 * e + st.angle * 180 / Math.PI) + 'deg) scale(' + (srcS + (1 - srcS) * e) + ')';
    }

    // Three 100%-wide segments, each placed and cut to length by transform alone; progress fills the visible length
    function renderRail() {
        railDirty = false;
        if (!railSegs.length || !W) return;
        let holes = [[rail.tl - gapPx, rail.tr + gapPx], [rail.sl - gapPx, rail.sr + gapPx]]
            .filter((h) => h[1] > h[0] + gapPx * 2)
            .sort((a, b) => a[0] - b[0]);
        if (holes.length === 2 && holes[1][0] <= holes[0][1]) holes = [[holes[0][0], Math.max(holes[0][1], holes[1][1])]];
        const segs = [];
        let x = 0;
        holes.forEach((h) => {
            segs.push([x, Math.max(x, h[0])]);
            x = Math.max(x, h[1]);
        });
        segs.push([x, Math.max(x, W)]);
        let total = 0;
        segs.forEach((s) => { total += s[1] - s[0]; });
        let left = rail.p * total;
        railSegs.forEach((el, i) => {
            const s = segs[i];
            const len = s ? s[1] - s[0] : 0;
            const d = Math.max(0, Math.min(len, left));
            left -= d;
            el.style.transform = 'translate3d(' + (s ? s[0] : 0) + 'px,0,0) scaleX(' + (d / W) + ')';
        });
    }

    // ---------- the route and the damage GLITCH leaves on it

    // The route is planned around the kept-out boxes with a clearance of 2.5vw, plus the trail's ragged half-width
    // (its scatter reaches 0.8 of the widest band, plus a cell), plus half the bug; the damage grid is snapped to whole
    // backing pixels (5 CSS px cells at 1x, 10 device px at 2x), and the backing store is capped at 2x since the look is
    // deliberately coarse.
    function buildTrail() {
        const w = stage.clientWidth, h = stage.clientHeight;
        if (!w || !h) return;
        const scale = Math.min(2, root.devicePixelRatio || 1);
        const key = [w, h, scale, Math.round(cx), S].concat(...keepOut.map((r) => [r.l, r.t, r.r, r.b].map(Math.round))).join(',');
        if (key === routeKey) return;
        routeKey = key;
        dmgScale = scale;
        cellDev = Math.max(3, Math.round(5 * scale));
        const cell = cellDev / scale;
        const bandMin = Math.max(14, w * 0.015), bandMax = Math.max(26, w * 0.03);
        const reach = bandMax * 0.8 + cell, gap = w * 0.025;
        plan = planRoute({
            w, h, rects: keepOut, edge: ROUTE_EDGE, clear: gap + reach + BUG_HALF, starPad: reach + BUG_HALF,
            star: S ? { x: cx, y: h / 2, r: S * 10.6 / 24 } : null,
        });
        route = plan.route;
        damage = buildDamage(route, { cell, bandMin, bandMax, seed: 0x5ced04, avoid: keepOut, gap });
        buckets = Array.from({ length: 9 }, () => []);
        fringe = [];
        damage.cells.forEach((c) => {
            buckets[c.k].push(c);
            if (c.f) fringe.push(c);
        });
        flickerOff = null;
        tearJolt = null;
        if (dmgCanvas) {
            dmgCanvas.width = Math.round(w * scale);
            dmgCanvas.height = Math.round(h * scale);
        }
        dmgDirty = true;
    }

    const DMG_FILL = ['#000', '', '#ff00ff', '#00ffff', '#00ff41', '#ff1a1a', '#1f4bff', '#ffffff', '#2b2b2b'];
    const SUB = ['#ff0000', '#00ff00', '#0000ff'];

    function drawTrail(sNow) {
        const ctx = dmgCtx;
        ctx.clearRect(0, 0, dmgCanvas.width, dmgCanvas.height);
        if (!damage || sNow <= 0) return;
        const cd = cellDev, fr = Math.max(1, Math.round(dmgScale));
        const off = flickerOff;
        // RGB fringe: red and cyan ghosts a device pixel either side of a third of the lit cells
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#ff0040';
        for (let i = 0; i < fringe.length && fringe[i].s <= sNow; i++) ctx.fillRect(fringe[i].gx * cd - fr, fringe[i].gy * cd, cd, cd);
        ctx.fillStyle = '#00e5ff';
        for (let i = 0; i < fringe.length && fringe[i].s <= sNow; i++) ctx.fillRect(fringe[i].gx * cd + fr, fringe[i].gy * cd, cd, cd);
        ctx.globalAlpha = 1;
        for (let k = 0; k < 9; k++) {
            const list = buckets[k];
            if (k === 1) {
                const w3 = Math.max(1, Math.floor(cd / 3));
                for (let sp = 0; sp < 3; sp++) {
                    ctx.fillStyle = SUB[sp];
                    for (let i = 0; i < list.length && list[i].s <= sNow; i++) {
                        if (off && off.has(list[i])) continue;
                        ctx.fillRect(list[i].gx * cd + sp * w3, list[i].gy * cd, sp === 2 ? cd - 2 * w3 : w3, cd);
                    }
                }
                continue;
            }
            ctx.fillStyle = DMG_FILL[k];
            for (let i = 0; i < list.length && list[i].s <= sNow; i++) {
                if (off && off.has(list[i])) continue;
                ctx.fillRect(list[i].gx * cd, list[i].gy * cd, cd, cd);
            }
        }
        if (off) {
            ctx.fillStyle = '#000';
            off.forEach((c) => { if (c.s <= sNow) ctx.fillRect(c.gx * cd, c.gy * cd, cd, cd); });
        }
        // Tear slivers: a displaced scanline with a hard red/cyan split
        damage.tears.forEach((t) => {
            if (t.s > sNow) return;
            const x = (t.gx + t.dx + (tearJolt === t ? t.dx * 2 : 0)) * cd, y = t.gy * cd;
            const w = t.len * cd, h = Math.max(fr, Math.round(cd * t.h));
            ctx.globalAlpha = 0.75;
            ctx.fillStyle = '#ff0040';
            ctx.fillRect(x - 2 * fr, y, w, h);
            ctx.fillStyle = '#00e5ff';
            ctx.fillRect(x + 2 * fr, y, w, h);
            ctx.globalAlpha = 0.92;
            ctx.fillStyle = DMG_FILL[t.k];
            ctx.fillRect(x, y, w, h);
        });
        ctx.globalAlpha = 1;
    }

    // A few lit pixels die and come back, and once in a while a tear jumps; throttled, and only while the stage is seen
    function flicker(sNow, t) {
        if (t < nextFlicker) return false;
        nextFlicker = t + 110 + Math.random() * 90;
        let lo = 0, hi = damage.cells.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (damage.cells[mid].s <= sNow) lo = mid + 1;
            else hi = mid;
        }
        const n = lo;
        flickerOff = new Set();
        const count = Math.min(18, Math.ceil(n * 0.006));
        for (let i = 0; i < count; i++) {
            const c = damage.cells[Math.floor(Math.random() * n)];
            if (c && c.k !== 0 && c.k !== 8) flickerOff.add(c);
        }
        tearJolt = null;
        if (Math.random() < 0.06) {
            const live = damage.tears.filter((tr) => tr.s <= sNow);
            if (live.length) tearJolt = live[Math.floor(Math.random() * live.length)];
        }
        return true;
    }

    // GLITCH rides the route at the live path progress, facing along the tangent in the direction it's travelling.
    // Viewport coordinates, read per bug frame so it stays glued to the stage; it flies while a detent is moving it.
    // `avoid` is the words' box, so its approach flight bends around them rather than across.
    function routeTarget() {
        if (!route) return null;
        const r = stage.getBoundingClientRect();
        const p = route.at(path.t);
        const moving = !!(pathTween && pathTween.isActive());
        const T = plan && plan.box;
        return {
            x: r.left + p.x, y: r.top + p.y, heading: pathDir > 0 ? p.a : p.a + Math.PI, lift: moving ? 1 : 0,
            avoid: T ? { l: r.left + T.l, t: r.top + T.t, r: r.left + T.r, b: r.top + T.b } : null,
        };
    }

    function leashOn() {
        arrived = false;
        approachSince = now();
        root.__pixelBugLeash(routeTarget, { onArrive });
        leashed = true;
    }

    function leashOff() {
        wantLeash = false;
        if (leashed && typeof root.__pixelBugLeash === 'function') root.__pixelBugLeash(null);
        leashed = false;
        arrived = false;
        say('');
        if (pendingT !== null) travelTo(pendingT);
    }

    // ---------- stepping

    const zone = createZone(N);
    const intent = createIntent({ lock: LOCK * 1000 });

    function run(act) {
        if (!act) return;
        if (act.type === 'engage') {
            hold(true);
            intent.claim(now());
            scrollTo(act.y, SETTLE);
        } else if (act.type === 'step') {
            scrollTo(act.y, LOCK);
        } else if (act.type === 'snap') {
            scrollTo(act.y, 0);
        } else if (act.type === 'release') {
            if (!act.external) scrollTo(act.y, 0);
            hold(false);
        }
    }

    function inScope(t) {
        if (!t || t.nodeType !== 1) return false;
        if (t.closest('[data-lenis-prevent],[data-lenis-prevent-wheel]')) return false;
        return scroller.contains(t) || !!t.closest('.pb-bug');
    }

    // Lenis skips events flagged lenisStopPropagation, so a swallowed gesture never reaches its smooth scroll
    function swallow(e) {
        e.lenisStopPropagation = true;
        if (e.cancelable) e.preventDefault();
    }

    function onWheel(e) {
        if (e.ctrlKey) return;
        let dy = e.deltaY;
        if (e.deltaMode === 1) dy *= 16;
        else if (e.deltaMode === 2) dy *= H;
        if (Math.abs(e.deltaX) > Math.abs(dy)) dy = 0;
        if (zone.pinned && !inScope(e.target)) return;
        const d = intent.wheel(dy, now());
        if (!zone.pinned) return;
        const act = zone.input(d);
        // The releasing event is left alone, so Lenis (or the browser) scrolls it as the first move of normal scrolling
        if (act && act.type === 'release') {
            run(act);
            return;
        }
        swallow(e);
        run(act);
    }

    function onTouchStart(e) {
        if (nativeTween && !zone.pinned) {
            nativeTween.kill();
            nativeTween = null;
        }
        if (e.touches.length === 1) intent.touchStart(e.touches[0].clientY);
        else intent.touchEnd();
    }

    function onTouchMove(e) {
        if (!zone.pinned || e.touches.length !== 1 || !inScope(e.target)) return;
        swallow(e);
        const act = zone.input(intent.touchMove(e.touches[0].clientY, now()));
        if (act && act.type === 'release') nudgeAfterTouch = act.dir;
        run(act);
    }

    // A touch whose first move was cancelled never scrolls natively, so the release is carried after the finger lifts
    function onTouchEnd() {
        intent.touchEnd();
        if (!nudgeAfterTouch) return;
        const d = nudgeAfterTouch;
        nudgeAfterTouch = 0;
        requestAnimationFrame(() => nudge(d));
    }

    function onKey(e) {
        if (!zone.pinned || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
        const t = e.target;
        if (t && t.nodeType === 1 && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
        let d = 0;
        switch (e.key) {
            case 'ArrowDown': case 'PageDown': d = 1; break;
            case 'ArrowUp': case 'PageUp': d = -1; break;
            case ' ': case 'Spacebar':
                if (t && t.nodeType === 1 && t.closest('button, a, [role="button"]')) return;
                d = e.shiftKey ? -1 : 1;
                break;
            case 'Home': case 'End': run(zone.external()); return;
            default: return;
        }
        e.preventDefault();
        const act = zone.input(intent.key(d, now()));
        run(act);
        if (act && act.type === 'release') nudge(act.dir);
    }

    // The scrollbar is the scroller's own box past its client width
    function onPointerDown(e) {
        if (e.target !== scroller || e.clientX < scroller.getBoundingClientRect().left + scroller.clientWidth) return;
        dragging = true;
        run(zone.external());
    }

    function onPointerUp() {
        if (!dragging) return;
        dragging = false;
        zone.unguard();
    }

    function onClick(e) {
        if (!zone.pinned) return;
        const a = e.target && e.target.closest && e.target.closest('a[href*="#"]');
        if (a) run(zone.external());
    }

    function tick(time, dt) {
        const s = Math.max(1, Math.min(dt, 50)) / 1000;
        const y = scroller.scrollTop;
        run(zone.frame(y, A, B, dragging, now() < animUntil));
        if (zone.pinned) {
            const lenis = lenisOf();
            if (lenis && !lenis.isStopped) lenis.stop();
        }
        const want = zone.desired(y);
        if (want !== shown) show(want, want > shown ? 1 : -1);
        const held = zone.pinned || (y > A && y < B);
        if (held && !wantLeash) wantLeash = true;
        else if (!held && wantLeash) leashOff();

        st.travel += (st.travelT - st.travel) * (1 - Math.exp(-s * 14));
        if (Math.abs(st.travelT - st.travel) < 1e-4) st.travel = st.travelT;
        st.angle = st.wheel * ARM;
        if (visible || st.travel !== drawn) {
            render();
            drawn = st.travel;
        }
        if (railDirty && (visible || rail.p === 0)) renderRail();
        if (dmgCtx && damage && visible) {
            const sNow = path.t * route.L;
            if (sNow > 0 && flicker(sNow, now())) dmgDirty = true;
            if (dmgDirty || sNow !== dmgDrawn) {
                drawTrail(sNow);
                dmgDrawn = sNow;
                dmgDirty = false;
            }
        }
        // pixel-bug mounts after the intro, so the hand-over waits for its API rather than racing it
        if (wantLeash && !leashed && typeof root.__pixelBugLeash === 'function') {
            leashOn();
            if (shown >= 0) say(CAT_LINES[shown]);
        }
        if (pendingT !== null && now() - approachSince >= APPROACH_MAX) travelTo(pendingT);
    }

    // Reduced motion: no stepping, so the trail is drawn whole and still, and GLITCH is parked on the route's end
    // whenever that point is on screen (pixel-bug places a leashed bug without animating it under reduced motion).
    function reducedTrail() {
        path.t = pathGoal = 1;
        if (dmgCtx && damage) drawTrail(route.L);
        const sync = () => {
            if (!route || typeof root.__pixelBugLeash !== 'function') return;
            const r = stage.getBoundingClientRect();
            const e = route.at(1);
            const y = r.top + e.y;
            const on = y > 0 && y < scroller.clientHeight;
            if (on && !leashed) {
                leashOn();
            } else if (!on && leashed) {
                leashOff();
            }
        };
        scroller.addEventListener('scroll', sync, { passive: true });
        setInterval(sync, 1000);
        sync();
    }

    function init() {
        track.classList.add('is-live');
        syncHeight();
        if (reduced) {
            st.travel = 1;
            measure();
            render();
            reducedTrail();
            const redo = () => {
                syncHeight();
                measure();
                render();
                if (dmgCtx && damage) drawTrail(route.L);
            };
            root.addEventListener('resize', redo, { passive: true });
            if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(redo);
            return;
        }

        gsap.registerPlugin(ScrollTrigger);
        gsap.set(parts.flatMap((p) => p.all), { yPercent: SHIFT });
        ScrollTrigger.create({
            trigger: track, scroller, start: 'top bottom', end: 'top top',
            onUpdate: (self) => { st.travelT = self.progress; },
            onRefresh: (self) => { st.travelT = self.progress; },
        });
        ScrollTrigger.create({
            trigger: track, scroller, start: 'top bottom', end: 'bottom top',
            onToggle: (self) => { visible = self.isActive; },
        });
        // The CSS sticky stage does the pinning (the site's own sticky-hero pattern); the stepper holds the page on detents
        let refreshTimer = 0;
        const refreshSoon = () => {
            clearTimeout(refreshTimer);
            refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 220);
        };
        ScrollTrigger.addEventListener('refresh', () => {
            if (syncHeight()) refreshSoon();
            measure();
        });
        // ScrollTrigger ignores height-only resizes on touch devices, but the track's length follows the height
        root.addEventListener('resize', () => { if (syncHeight()) refreshSoon(); }, { passive: true });
        measure();

        root.addEventListener('wheel', onWheel, { capture: true, passive: false });
        root.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
        root.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
        root.addEventListener('touchend', onTouchEnd, { capture: true, passive: true });
        root.addEventListener('touchcancel', onTouchEnd, { capture: true, passive: true });
        root.addEventListener('keydown', onKey, { capture: true });
        scroller.addEventListener('pointerdown', onPointerDown, { passive: true });
        root.addEventListener('pointerup', onPointerUp, { passive: true });
        root.addEventListener('pointercancel', onPointerUp, { passive: true });
        doc.addEventListener('click', onClick, true);

        gsap.ticker.add(tick);
        if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', loadApp, { once: true });
        else loadApp();
        if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => ScrollTrigger.refresh());
    }

    init();
})(typeof window !== 'undefined' ? window : globalThis);
