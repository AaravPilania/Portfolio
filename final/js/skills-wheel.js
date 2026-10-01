// Projects -> Skills: row 16's asterisk drops straight down its own column into slide 04, then turns like a wheel.
// While the stage is stuck, one gesture (wheel flick, trackpad swipe, touch swipe, key) is one 60° detent and one
// category swap; the first detent up and the last detent down hand the page back to normal scrolling.
// GLITCH (pixel-bug.js) is leashed to a hand-drawn route (top edge -> down the left -> under the words -> up past them
// -> out the right edge), nudged only where it would touch any category's text, while the stage is stuck: it flies in to
// the route's start, travels a quarter of it per detent and lays a solid ribbon of broken screen behind it until reverse
// steps eat it back; then it's handed back to wandering.
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
    // Centripetal (alpha 0.5) so a short segment next to a long one can't loop or overshoot into the text
    function crHandle(p0, p1, p2) {
        const a = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), b = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
        if (a < 1e-6 || b < 1e-6) return [p1[0] + (p2[0] - p1[0]) / 3, p1[1] + (p2[1] - p1[1]) / 3];
        const sa = Math.sqrt(a), sb = Math.sqrt(b), k = 2 * a + 3 * sa * sb + b, d = 3 * sa * (sa + sb);
        return [(a * p2[0] - b * p0[0] + k * p1[0]) / d, (a * p2[1] - b * p0[1] + k * p1[1]) / d];
    }

    function crPoint(P, i, t) {
        const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
        const [c1x, c1y] = crHandle(p0, p1, p2);
        const [c2x, c2y] = crHandle(p3, p2, p1);
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
        return { L, atS, at: (t) => atS(t * L), xs, ys, cum };
    }

    // The route GLITCH flies and its ribbon follows: the line the designer drew by hand over a 1024x515 view of this slide,
    // as viewport fractions. It enters at the top edge right of the asterisk, drops through the gap before the title,
    // swings round under it, rises past its right end, crests between the title and the skills, and waves out over the
    // skills to the right edge. DRAWN_BOTTOM is the swing's lowest point, DRAWN_PEAK the crest.
    const DRAWN = [[121, 0], [150, 55], [190, 110], [212, 190], [211, 290], [212, 385], [245, 435], [300, 465], [352, 478], [405, 450],
        [445, 400], [470, 330], [490, 268], [525, 185], [575, 145], [620, 137], [690, 155], [760, 183], [850, 167], [950, 135], [1024, 119]]
        .map((p) => [p[0] / 1024, p[1] / 515]);
    const DRAWN_BOTTOM = 8, DRAWN_PEAK = 15;

    const inside = (p, r) => !!r && p[0] > r.l && p[0] < r.r && p[1] > r.t && p[1] < r.b;
    const grow = (r, m) => r && { l: r.l - m, t: r.t - m, r: r.r + m, b: r.b + m };

    // The drawing mapped onto the stage, bent only where it would run over the words. `words` is the union of every
    // category's counter and title, `list` of every skills list (all five, so the longest title and list count), and
    // `clear` the ribbon's half-width plus a margin. Each control point that lands in a grown box is moved out along the
    // way the drawing already passes it: the descent to the left, the swing under the title down, the rise to the right
    // (into the gap before the skills; to the left when the words are stacked in one column on narrow screens), the crest
    // and the wave over the skills up. The crest and wave are then re-spread so the line keeps flowing left to right, and
    // the curve is checked densely; any segment still too close pushes its two control points further the same way.
    function planRoute(o) {
        const w = o.w, h = o.h, m = o.clear, inset = o.inset || 0;
        const words = o.words || null, list = o.list || null;
        const P = DRAWN.map((q) => [q[0] * w, q[1] * h]);
        const stacked = !!(words && list && list.l < words.r);
        const TU = grow(stacked ? unite(words, list) : words, m), SK = stacked ? null : grow(list, m);
        const B = DRAWN_BOTTOM, K = DRAWN_PEAK, last = P.length - 1;
        // The rise's way up past the words: the gap between them and the skills (a little left of its middle), or on
        // narrow screens the strip left of the stacked column
        const lo = TU ? TU.r : 0, hi = SK ? SK.l : w - inset;
        const crossX = stacked ? (TU ? TU.l : 0) : lo <= hi ? lo + (hi - lo) * 0.4 : (lo + hi) / 2;
        const below = (p) => !!TU && p[1] >= TU.b - 0.5;

        for (let i = 1; i < last; i++) {
            const p = P[i];
            if (i < B - 2) {
                if (inside(p, TU)) p[0] = TU.l;
            } else if (i <= B + 1) {
                if (inside(p, TU)) p[1] = TU.b;
            } else if (i >= K) {
                if (inside(p, TU)) p[1] = TU.t;
                if (SK && p[0] > SK.l && p[1] > SK.t) p[1] = SK.t;
            }
        }
        // Once the rise would cut into the words it goes up the gap instead. The first such point becomes a corner under
        // the words, just short of the gap, so the swing rounds into it without the curve bulging past it; the rest climb
        // the gap evenly from the words' bottom edge to where the last of them was drawn.
        const cut = [];
        for (let i = B + 2; i < K; i++) {
            const p = P[i];
            if (inside(p, TU) || inside(p, SK) || (cut.length && (stacked ? p[0] > crossX : p[0] < crossX))) cut.push(i);
        }
        if (cut.length && TU) {
            const g = Math.min(48, w * 0.05) * (stacked ? -1 : 1);
            const yTop = Math.min(P[cut[cut.length - 1]][1], TU.b);
            P[cut[0]] = [crossX - g, Math.max(P[cut[0]][1], TU.b + Math.abs(g) * 0.8)];
            const n = cut.length - 1;
            for (let j = 1; j <= n; j++) P[cut[j]] = [crossX, TU.b + (yTop - TU.b) * (n === 1 ? 1 : (j - 1) / (n - 1))];
        }
        const dirOf = (i) => (i < B - 2 ? [-1, 0] : i <= B + 1 || (i < K && below(P[i])) ? [0, 1] : i < K ? [stacked ? -1 : 1, 0] : [0, -1]);
        // The crest must stay past the rise; the wave after it is squeezed toward the exit rather than folding back
        let rise = -Infinity;
        for (let i = B + 1; i < K; i++) rise = Math.max(rise, P[i][0]);
        const x0 = DRAWN[K][0] * w, xr = rise + w * 0.03;
        if (!stacked && xr > x0) {
            for (let i = K; i < last; i++) {
                P[i][0] = xr + (DRAWN[i][0] * w - x0) / (w - x0) * (w - xr);
                if (SK && P[i][0] > SK.l && P[i][1] > SK.t) P[i][1] = SK.t;
            }
        }

        const rects = [words, list].filter(Boolean);
        for (let it = 0; it < 40; it++) {
            const push = P.map(() => 0);
            for (let i = 0; i < last; i++) {
                for (let j = 0; j <= 16; j++) {
                    const q = crPoint(P, i, j / 16);
                    let need = 0;
                    rects.forEach((r) => { need = Math.max(need, m - rectDist(q[0], q[1], r)); });
                    if (need <= 0) continue;
                    push[i] = Math.max(push[i], need + 1);
                    push[i + 1] = Math.max(push[i + 1], need + 1);
                }
            }
            if (!push.some(Boolean)) break;
            for (let i = 1; i < last; i++) {
                if (!push[i]) continue;
                const d = dirOf(i);
                let x = Math.max(0, Math.min(w, P[i][0] + d[0] * push[i]));
                // The rise never leaves its gap: past it is the skills (or, stacked, the descent)
                if (i > B + 1 && i < K && d[0]) x = stacked ? Math.max(x, Math.min(crossX, P[i][0])) : Math.min(x, Math.max(hi, P[i][0]));
                P[i][0] = x;
                P[i][1] = Math.max(0, Math.min(h, P[i][1] + d[1] * push[i]));
            }
        }

        const route = createRoute(P);
        let minClear = Infinity, s0 = 0, s1 = route.L, seen = false;
        for (let i = 0; i < route.xs.length; i++) {
            const x = route.xs[i], y = route.ys[i];
            rects.forEach((r) => { minClear = Math.min(minClear, rectDist(x, y, r)); });
            const ok = x >= inset && x <= w - inset && y >= inset && y <= h - inset;
            if (ok && !seen) {
                seen = true;
                s0 = route.cum[i];
            }
            if (ok) s1 = route.cum[i];
        }
        let moved = 0;
        P.forEach((p, i) => { moved = Math.max(moved, Math.hypot(p[0] - DRAWN[i][0] * w, p[1] - DRAWN[i][1] * h)); });
        return { route, pts: P, s0, s1, box: rects.reduce((a, r) => unite(a, r), null), clear: m, minClear, moved, stacked, ok: minClear >= m - 1 };
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

    // The ribbon's broken-screen fill: every `cell`-px grid cell within `half` + a cell of the route gets a colour, so the
    // band clipped out of it has no holes. Seeded, so the same stage always breaks the same way; s is where along the
    // route a cell is first reached. Mostly signal red (the colour the line was drawn in) in shifting zones of stuck RGB
    // sub-pixels, burn-in and dead clusters, with scanline streaks (a cell often repeats its left neighbour) and tear rows.
    // Kinds: 0 dead, 1 RGB sub-pixels, 2 magenta, 3 cyan, 4 green, 5 red, 6 deep red, 7 hot white, 8 light red, 9 maroon,
    // 10 blue.
    const RIBBON_ZONES = [
        [0.55, [2, 5, 1, 1, 0.5, 36, 26, 2, 14, 12, 0.5]],    // signal red
        [0.27, [3, 26, 9, 9, 7, 16, 12, 4, 6, 5, 3]],         // stuck sub-pixels
        [0.18, [9, 8, 2, 4, 1, 20, 16, 13, 9, 16, 2]],        // burn-in
    ];
    function ribbonCells(route, o) {
        const rnd = mulberry32(o.seed || 0x5ced04);
        const c = o.cell, R = o.half + c;
        const owned = new Map(), cells = [];
        const key = (gx, gy) => (gx + 4096) * 8192 + (gy + 4096);
        for (let s = 0; s <= route.L; s += c * 0.4) {
            const p = route.atS(s);
            const gx0 = Math.floor((p.x - R) / c), gx1 = Math.floor((p.x + R) / c);
            const gy0 = Math.floor((p.y - R) / c), gy1 = Math.floor((p.y + R) / c);
            for (let gx = gx0; gx <= gx1; gx++) {
                for (let gy = gy0; gy <= gy1; gy++) {
                    const k = key(gx, gy);
                    if (owned.has(k) || Math.hypot((gx + 0.5) * c - p.x, (gy + 0.5) * c - p.y) > R) continue;
                    const cell = { gx, gy, s, k: 5 };
                    owned.set(k, cell);
                    cells.push(cell);
                }
            }
        }
        const pick = (weights) => {
            let r = rnd() * weights.reduce((x, y) => x + y, 0);
            for (let i = 0; i < weights.length; i++) if ((r -= weights[i]) < 0) return i;
            return 5;
        };
        let zone = RIBBON_ZONES[0][1], zoneUntil = -1;
        cells.forEach((cell) => {
            if (cell.s >= zoneUntil) {
                const r = rnd();
                zone = r < RIBBON_ZONES[0][0] ? RIBBON_ZONES[0][1] : r < RIBBON_ZONES[0][0] + RIBBON_ZONES[1][0] ? RIBBON_ZONES[1][1] : RIBBON_ZONES[2][1];
                zoneUntil = cell.s + 40 + rnd() * 120;
            }
            const left = owned.get(key(cell.gx - 1, cell.gy));
            cell.k = left && left.s <= cell.s && rnd() < 0.32 ? left.k : pick(zone);
        });
        const run = (gx, gy, n, k) => {
            for (let i = 0; i < n; i++) {
                const t = owned.get(key(gx + i, gy));
                if (t) t.k = k;
            }
        };
        cells.forEach((cell) => {
            const r = rnd();
            if (r < 0.006) {
                const n = 2 + Math.floor(rnd() * 3);
                run(cell.gx, cell.gy, n, 0);
                if (rnd() < 0.5) run(cell.gx, cell.gy + 1, n - 1, 0);
            } else if (r < 0.0095) {
                const t = rnd();
                run(cell.gx, cell.gy, 3 + Math.floor(rnd() * 6), t < 0.45 ? 7 : t < 0.75 ? 3 : 1);
            }
        });
        return cells;
    }

    if (typeof window === 'undefined' && typeof module === 'object' && module && module.exports) {
        module.exports = { createIntent, createZone, createRoute, planRoute, ribbonCells, DRAWN };
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
    const ROUTE_EDGE = 36;            // inside pixel-bug's viewport clamp (24 / 30px), so it's never pushed off its route
    const APPROACH_MAX = 2600;        // ms a detent's travel waits for GLITCH to land on the route before going anyway
    const APP_URL = '/wp-content/themes/lamalama2025/dist/assets/app-DjHRamTc.js';

    const st = { travel: 0, travelT: 0, wheel: 0, angle: 0 };
    const rail = { p: 0, tl: 0, tr: 0, sl: 0, sr: 0 };
    // GLITCH's progress along the route: detent k of N rests at k / (N - 1), so detent 1 is the start and N the end
    const path = { t: 0 };
    const dmgCanvas = track.querySelector('.sk-damage');
    const dmgCtx = dmgCanvas ? dmgCanvas.getContext('2d') : null;
    const texC = doc.createElement('canvas'), maskC = doc.createElement('canvas'), redC = doc.createElement('canvas'), cyanC = doc.createElement('canvas');
    const texCtx = texC.getContext('2d'), maskCtx = maskC.getContext('2d', { willReadFrequently: true });
    const redCtx = redC.getContext('2d'), cyanCtx = cyanC.getContext('2d');
    let route = null, plan = null, keep = { words: null, list: null }, ribbon = [], routeKey = '';
    let cellDev = 5, cellCss = 5, ribbonW = 20, dmgScale = 1, pathTween = null, pathGoal = 0, pathDir = 1, dmgDrawn = -1, dmgDirty = true;
    let arrived = false, approachSince = 0, pendingT = null;
    let flickCells = null, nextFlicker = 0;
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
        keep = { words: unite(kick, title), list: set };

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

    // ---------- the route and the broken-screen ribbon GLITCH leaves on it

    // The ribbon is 1.8vw wide (12px at least) on a grid of whole backing pixels about seven cells across it, and the route
    // keeps its centre line that half-width plus 0.8vw (8px at least) off the words. The backing store is capped at 2x since
    // the look is deliberately coarse.
    function buildTrail() {
        const w = stage.clientWidth, h = stage.clientHeight;
        if (!w || !h) return;
        const scale = Math.min(2, root.devicePixelRatio || 1);
        const key = [w, h, scale].concat(...[keep.words, keep.list].filter(Boolean).map((r) => [r.l, r.t, r.r, r.b].map(Math.round))).join(',');
        if (key === routeKey) return;
        routeKey = key;
        dmgScale = scale;
        ribbonW = Math.max(12, w * 0.018);
        cellDev = Math.max(2, Math.round(Math.max(3, ribbonW / 7) * scale));
        cellCss = cellDev / scale;
        plan = planRoute({ w, h, words: keep.words, list: keep.list, clear: ribbonW / 2 + Math.max(8, w * 0.008), inset: ROUTE_EDGE });
        route = plan.route;
        ribbon = ribbonCells(route, { cell: cellCss, half: ribbonW / 2, seed: 0x5ced04 });
        flickCells = null;
        dmgDirty = true;
        if (!dmgCanvas) return;
        dmgCanvas.width = Math.round(w * scale);
        dmgCanvas.height = Math.round(h * scale);
        const gw = Math.ceil(w / cellCss) + 1, gh = Math.ceil(h / cellCss) + 1;
        [maskC, redC, cyanC].forEach((c) => {
            c.width = gw;
            c.height = gh;
        });
        texC.width = gw * cellDev;
        texC.height = gh * cellDev;
        paintTexture();
    }

    const RIB_FILL = ['#3b0710', '', '#ff1fd0', '#18f0ff', '#22ff5a', '#ff1e2d', '#d90018', '#fff6f0', '#ff4a3d', '#99000f', '#2a4bff'];
    const SUB = ['#ff0000', '#00ff00', '#0000ff'];

    // The fill, painted once per layout: every cell the ribbon can cover, stuck sub-pixels as three hard stripes
    function paintTexture() {
        const ctx = texCtx, cd = cellDev, w3 = Math.max(1, Math.floor(cd / 3));
        ctx.clearRect(0, 0, texC.width, texC.height);
        for (let k = 0; k < RIB_FILL.length; k++) {
            if (k === 1) {
                for (let sp = 0; sp < 3; sp++) {
                    ctx.fillStyle = SUB[sp];
                    ribbon.forEach((c) => { if (c.k === 1) ctx.fillRect(c.gx * cd + sp * w3, c.gy * cd, sp === 2 ? cd - 2 * w3 : w3, cd); });
                }
                continue;
            }
            ctx.fillStyle = RIB_FILL[k];
            ribbon.forEach((c) => { if (c.k === k) ctx.fillRect(c.gx * cd, c.gy * cd, cd, cd); });
        }
    }

    function tint(ctx, color) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, maskC.width, maskC.height);
        ctx.drawImage(maskC, 0, 0);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, maskC.width, maskC.height);
        ctx.globalCompositeOperation = 'source-over';
    }

    // The ribbon up to arc length sNow: a round-capped stroke at one pixel per cell, hardened to whole cells, scaled up
    // without smoothing so its edge steps cell by cell, then filled with the broken-screen texture (source-in), the
    // flicker painted only where the ribbon is (source-atop), and a red/cyan ghost slipped out either side behind it.
    function drawTrail(sNow) {
        const ctx = dmgCtx;
        ctx.clearRect(0, 0, dmgCanvas.width, dmgCanvas.height);
        if (!route || sNow <= 0) return;
        const m = maskCtx, k = 1 / cellCss;
        m.clearRect(0, 0, maskC.width, maskC.height);
        m.lineWidth = ribbonW * k;
        m.lineCap = 'round';
        m.lineJoin = 'round';
        m.strokeStyle = '#fff';
        m.beginPath();
        const end = Math.min(sNow, route.L);
        for (let s = 0; s < end; s += cellCss) {
            const p = route.atS(s);
            if (s === 0) m.moveTo(p.x * k, p.y * k);
            else m.lineTo(p.x * k, p.y * k);
        }
        const q = route.atS(end);
        m.lineTo(q.x * k, q.y * k);
        m.stroke();
        const img = m.getImageData(0, 0, maskC.width, maskC.height), d = img.data;
        for (let i = 3; i < d.length; i += 4) {
            d[i - 3] = d[i - 2] = d[i - 1] = 255;
            d[i] = d[i] >= 128 ? 255 : 0;
        }
        m.putImageData(img, 0, 0);
        tint(redCtx, '#ff0040');
        tint(cyanCtx, '#00e5ff');

        const cd = cellDev, cw = maskC.width * cd, ch = maskC.height * cd, fr = Math.max(1, Math.round(1.5 * dmgScale));
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(maskC, 0, 0, cw, ch);
        ctx.globalCompositeOperation = 'source-in';
        ctx.drawImage(texC, 0, 0);
        if (flickCells) {
            ctx.globalCompositeOperation = 'source-atop';
            flickCells.forEach((f) => {
                ctx.fillStyle = f[3];
                ctx.fillRect(f[0] * cd, f[1] * cd, f[2] * cd, cd);
            });
        }
        ctx.globalCompositeOperation = 'destination-over';
        ctx.globalAlpha = 0.6;
        ctx.drawImage(redC, -fr, 0, cw, ch);
        ctx.drawImage(cyanC, fr, 0, cw, ch);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    }

    // A few cells die or burn white and come back, and once in a while a scanline tears across; throttled, and only
    // while the stage is seen
    function flicker(sNow, t) {
        if (t < nextFlicker) return false;
        nextFlicker = t + 110 + Math.random() * 90;
        let lo = 0, hi = ribbon.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (ribbon[mid].s <= sNow) lo = mid + 1;
            else hi = mid;
        }
        const n = lo;
        flickCells = [];
        if (!n) return true;
        const count = Math.min(16, Math.ceil(n * 0.004));
        for (let i = 0; i < count; i++) {
            const c = ribbon[Math.floor(Math.random() * n)];
            flickCells.push([c.gx, c.gy, 1, Math.random() < 0.6 ? '#120205' : '#fff6f0']);
        }
        if (Math.random() < 0.08) {
            const c = ribbon[Math.floor(Math.random() * n)];
            flickCells.push([c.gx - 2, c.gy, 4 + Math.floor(Math.random() * 5), Math.random() < 0.5 ? '#fff6f0' : '#18f0ff']);
        }
        return true;
    }

    // GLITCH rides the route between points a ROUTE_EDGE inset from the viewport (the drawn line runs edge to edge), at
    // the live path progress, facing along the tangent in the direction it's travelling. The ribbon grows to t * L, so
    // it leaves the top edge as GLITCH sets off and reaches the right edge as it arrives. Viewport coordinates, read per
    // bug frame so it stays glued to the stage; it flies while a detent is moving it. `avoid` is the words' box, so its
    // approach flight bends around them rather than across.
    function routeTarget() {
        if (!route) return null;
        const r = stage.getBoundingClientRect();
        const p = route.atS(plan.s0 + path.t * (plan.s1 - plan.s0));
        const moving = !!(pathTween && pathTween.isActive());
        const T = plan.box;
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
        if (dmgCtx && route && visible) {
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
        if (dmgCtx && route) drawTrail(route.L);
        const sync = () => {
            if (!route || typeof root.__pixelBugLeash !== 'function') return;
            const r = stage.getBoundingClientRect();
            const e = route.atS(plan.s1);
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
                if (dmgCtx && route) drawTrail(route.L);
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
