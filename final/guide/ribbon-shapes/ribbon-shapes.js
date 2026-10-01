// Ribbon shapes: a gallery of route designs for GLITCH's broken-screen ribbon on slide 04. Each card is a mock of the
// slide (asterisk, title + counter, skills, axis line) whose route is built from that card's measured text boxes, so it
// keeps the same clearance rule as the live slide: the ribbon's centre line stays half its width plus 0.8vw off the words.
// ?solo=N shows one design full-viewport, ?sheet=1 lays every design out as a contact sheet, &done=1 jumps to step 05.
(function () {
    'use strict';

    const doc = document;
    const TAU = Math.PI * 2;
    const N = 5;
    const CATS = [
        ['Frontend', ['React 19', 'Vite', 'Tailwind CSS v4', 'Framer Motion', 'GSAP', 'Three.js', 'React Three Fiber', 'PWA']],
        ['Backend', ['FastAPI', 'Node.js', 'REST APIs', 'asyncio', 'PostgreSQL', 'SQLite', 'ChromaDB']],
        ['AI / ML', ['PyTorch', 'scikit-learn', 'SHAP', 'Sentence Transformers', 'RAG', 'LLM Orchestration', 'Multi-Agent Pipelines']],
        ['Languages', ['Python', 'Java', 'JavaScript', 'TypeScript', 'C', 'C++', 'SQL']],
        ['Tools & Technologies', ['Git', 'GitHub', 'Docker', 'Whisper STT', 'Ollama', 'Chrome DevTools Protocol', 'Tesseract OCR']],
    ];
    const qs = new URLSearchParams(location.search);
    const SOLO = parseInt(qs.get('solo'), 10) || 0;
    const SHEET = qs.has('sheet');
    const DONE = qs.has('done');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------- curves and routes

    // Centripetal Catmull-Rom handle (alpha 0.5): a short span next to a long one can't loop or overshoot
    function crHandle(p0, p1, p2) {
        const a = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), b = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
        if (a < 1e-6 || b < 1e-6) return [p1[0] + (p2[0] - p1[0]) / 3, p1[1] + (p2[1] - p1[1]) / 3];
        const sa = Math.sqrt(a), sb = Math.sqrt(b), k = 2 * a + 3 * sa * sb + b, d = 3 * sa * (sa + sb);
        return [(a * p2[0] - b * p0[0] + k * p1[0]) / d, (a * p2[1] - b * p0[1] + k * p1[1]) / d];
    }

    // A pen that lays down a dense polyline (about one point per 3px). Points passed with a truthy third element, and
    // mark(), record where a step lands.
    function pen(x, y) {
        const pts = [[x, y]], marks = [];
        const last = () => pts[pts.length - 1];
        const push = (px, py) => {
            const l = last();
            if (Math.hypot(px - l[0], py - l[1]) > 0.05) pts.push([px, py]);
        };
        const P = {
            pts, marks, picks: null,
            at: last,
            mark() { marks.push(pts.length - 1); return P; },
            line(px, py, m) {
                const [a, b] = last();
                const n = Math.max(1, Math.ceil(Math.hypot(px - a, py - b) / 3));
                for (let i = 1; i <= n; i++) push(a + (px - a) * i / n, b + (py - b) * i / n);
                if (m) P.mark();
                return P;
            },
            lines(list) {
                list.forEach((q) => P.line(q[0], q[1], q[2]));
                return P;
            },
            // Smooth through the list, leaving the current point along the direction it arrived from
            curve(list) {
                const Q = [last().slice()].concat(list);
                const prev = pts.length > 1 ? pts[pts.length - 2] : null;
                for (let i = 0; i < Q.length - 1; i++) {
                    const p1 = Q[i], p2 = Q[i + 1];
                    let p0 = Q[i - 1];
                    if (!p0) {
                        if (prev) {
                            const d = Math.hypot(p1[0] - prev[0], p1[1] - prev[1]) || 1, s = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / d;
                            p0 = [p1[0] - (p1[0] - prev[0]) * s, p1[1] - (p1[1] - prev[1]) * s];
                        } else p0 = p1;
                    }
                    const p3 = Q[i + 2] || p2;
                    const c1 = crHandle(p0, p1, p2), c2 = crHandle(p3, p2, p1);
                    const n = Math.max(4, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 2.5));
                    for (let j = 1; j <= n; j++) {
                        const t = j / n, u = 1 - t;
                        push(u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0],
                            u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1]);
                    }
                    if (p2[2]) P.mark();
                }
                return P;
            },
            arc(cx, cy, rx, ry, a0, a1, m) {
                P.line(cx + rx * Math.cos(a0), cy + ry * Math.sin(a0));
                const n = Math.max(6, Math.ceil(Math.abs(a1 - a0) * Math.max(rx, ry) / 2.5));
                for (let i = 1; i <= n; i++) {
                    const a = a0 + (a1 - a0) * i / n;
                    push(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
                }
                if (m) P.mark();
                return P;
            },
            fn(f, n, m) {
                for (let i = 1; i <= n; i++) {
                    const q = f(i / n);
                    push(q[0], q[1]);
                }
                if (m) P.mark();
                return P;
            },
            // A solid dot (solder pad, node, star): a full turn round the current point, leaving it a radius ahead
            pad(r, cw) {
                const l = last().slice(), pv = pts[pts.length - 2] || [l[0] - 1, l[1]];
                const h = Math.atan2(l[1] - pv[1], l[0] - pv[0]);
                return P.arc(l[0], l[1], r, r, h, h + (cw === false ? -TAU : TAU));
            },
            // A twinkle: four spokes out and back from the current point
            spark(len, tall) {
                const [x0, y0] = last();
                [[0, -tall], [len, 0], [0, tall], [-len, 0]].forEach((d) => {
                    P.line(x0 + d[0], y0 + d[1]);
                    P.line(x0, y0);
                });
                return P;
            },
        };
        return P;
    }

    // The dense polyline, parameterised by arc length; tangent from a short chord so headings don't snap at joints
    function createRoute(pts) {
        const xs = [], ys = [], cum = [];
        let L = 0;
        pts.forEach((p, i) => {
            if (i) L += Math.hypot(p[0] - xs[i - 1], p[1] - ys[i - 1]);
            xs.push(p[0]);
            ys.push(p[1]);
            cum.push(L);
        });
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
        const atS = (s) => {
            const p = pos(s), q0 = pos(s - 5), q1 = pos(s + 5);
            return { x: p[0], y: p[1], a: Math.atan2(q1[1] - q0[1], q1[0] - q0[0]) };
        };
        return { L, atS, xs, ys, cum };
    }

    const rectDist = (x, y, r) => Math.hypot(Math.max(r.l - x, 0, x - r.r), Math.max(r.t - y, 0, y - r.b));
    const unite = (a, b) => (!a ? b : !b ? a : { l: Math.min(a.l, b.l), t: Math.min(a.t, b.t), r: Math.max(a.r, b.r), b: Math.max(a.b, b.b) });
    const boxed = (r) => Object.assign({}, r, { w: r.r - r.l, h: r.b - r.t, cx: (r.l + r.r) / 2, cy: (r.t + r.b) / 2 });
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    function mulberry32(seed) {
        let a = seed | 0;
        return () => {
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // ---------- the broken-screen ribbon (same cells, palette and compositing as the live slide)

    const RIBBON_ZONES = [
        [0.55, [2, 5, 1, 1, 0.5, 36, 26, 2, 14, 12, 0.5]],
        [0.27, [3, 26, 9, 9, 7, 16, 12, 4, 6, 5, 3]],
        [0.18, [9, 8, 2, 4, 1, 20, 16, 13, 9, 16, 2]],
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

    const RIB_FILL = ['#3b0710', '', '#ff1fd0', '#18f0ff', '#22ff5a', '#ff1e2d', '#d90018', '#fff6f0', '#ff4a3d', '#99000f', '#2a4bff'];
    const SUB = ['#ff0000', '#00ff00', '#0000ff'];

    function Ribbon(canvas) {
        this.cv = canvas;
        this.ctx = canvas.getContext('2d');
        this.tex = doc.createElement('canvas');
        this.texCtx = this.tex.getContext('2d');
        this.mask = doc.createElement('canvas');
        this.maskCtx = this.mask.getContext('2d', { willReadFrequently: true });
        this.red = doc.createElement('canvas');
        this.redCtx = this.red.getContext('2d');
        this.cyan = doc.createElement('canvas');
        this.cyanCtx = this.cyan.getContext('2d');
        this.route = null;
        this.cells = [];
        this.flick = null;
        this.nextFlick = 0;
    }

    // Ribbon 1.8% of the stage wide on a grid of whole backing pixels about seven cells across it
    Ribbon.prototype.build = function (route, w, h, scale, rw, seed) {
        this.route = route;
        this.scale = scale;
        this.rw = rw;
        this.cellDev = Math.max(2, Math.round(Math.max(2.5, rw / 7) * scale));
        this.cellCss = this.cellDev / scale;
        this.cells = ribbonCells(route, { cell: this.cellCss, half: rw / 2, seed });
        this.flick = null;
        this.cv.width = Math.round(w * scale);
        this.cv.height = Math.round(h * scale);
        const gw = Math.ceil(w / this.cellCss) + 1, gh = Math.ceil(h / this.cellCss) + 1;
        [this.mask, this.red, this.cyan].forEach((c) => {
            c.width = gw;
            c.height = gh;
        });
        this.tex.width = gw * this.cellDev;
        this.tex.height = gh * this.cellDev;
        const ctx = this.texCtx, cd = this.cellDev, w3 = Math.max(1, Math.floor(cd / 3));
        ctx.clearRect(0, 0, this.tex.width, this.tex.height);
        for (let k = 0; k < RIB_FILL.length; k++) {
            if (k === 1) {
                for (let sp = 0; sp < 3; sp++) {
                    ctx.fillStyle = SUB[sp];
                    this.cells.forEach((c) => { if (c.k === 1) ctx.fillRect(c.gx * cd + sp * w3, c.gy * cd, sp === 2 ? cd - 2 * w3 : w3, cd); });
                }
                continue;
            }
            ctx.fillStyle = RIB_FILL[k];
            this.cells.forEach((c) => { if (c.k === k) ctx.fillRect(c.gx * cd, c.gy * cd, cd, cd); });
        }
    };

    Ribbon.prototype.tint = function (ctx, color) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, this.mask.width, this.mask.height);
        ctx.drawImage(this.mask, 0, 0);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, this.mask.width, this.mask.height);
        ctx.globalCompositeOperation = 'source-over';
    };

    // Round-capped stroke at one pixel per cell up to sNow, hardened to whole cells, scaled up unsmoothed, filled with
    // the texture, flicker on top, red/cyan ghost slipped out behind
    Ribbon.prototype.draw = function (sNow) {
        const ctx = this.ctx, route = this.route;
        ctx.clearRect(0, 0, this.cv.width, this.cv.height);
        if (!route || sNow <= 0) return;
        const m = this.maskCtx, k = 1 / this.cellCss;
        m.clearRect(0, 0, this.mask.width, this.mask.height);
        m.lineWidth = this.rw * k;
        m.lineCap = 'round';
        m.lineJoin = 'round';
        m.strokeStyle = '#fff';
        m.beginPath();
        const end = Math.min(sNow, route.L), step = this.cellCss * 0.75;
        for (let s = 0; s < end; s += step) {
            const p = route.atS(s);
            if (s === 0) m.moveTo(p.x * k, p.y * k);
            else m.lineTo(p.x * k, p.y * k);
        }
        const q = route.atS(end);
        m.lineTo(q.x * k, q.y * k);
        m.stroke();
        const img = m.getImageData(0, 0, this.mask.width, this.mask.height), d = img.data;
        for (let i = 3; i < d.length; i += 4) {
            d[i - 3] = d[i - 2] = d[i - 1] = 255;
            d[i] = d[i] >= 128 ? 255 : 0;
        }
        m.putImageData(img, 0, 0);
        this.tint(this.redCtx, '#ff0040');
        this.tint(this.cyanCtx, '#00e5ff');

        const cd = this.cellDev, cw = this.mask.width * cd, ch = this.mask.height * cd, fr = Math.max(1, Math.round(1.5 * this.scale));
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.mask, 0, 0, cw, ch);
        ctx.globalCompositeOperation = 'source-in';
        ctx.drawImage(this.tex, 0, 0);
        if (this.flick) {
            ctx.globalCompositeOperation = 'source-atop';
            this.flick.forEach((f) => {
                ctx.fillStyle = f[3];
                ctx.fillRect(f[0] * cd, f[1] * cd, f[2] * cd, cd);
            });
        }
        ctx.globalCompositeOperation = 'destination-over';
        ctx.globalAlpha = 0.6;
        ctx.drawImage(this.red, -fr, 0, cw, ch);
        ctx.drawImage(this.cyan, fr, 0, cw, ch);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    };

    Ribbon.prototype.flicker = function (sNow, t) {
        if (t < this.nextFlick) return false;
        this.nextFlick = t + 110 + Math.random() * 90;
        const cells = this.cells;
        let lo = 0, hi = cells.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (cells[mid].s <= sNow) lo = mid + 1;
            else hi = mid;
        }
        const n = lo;
        this.flick = [];
        if (!n) return true;
        const count = Math.min(16, Math.ceil(n * 0.004));
        for (let i = 0; i < count; i++) {
            const c = cells[Math.floor(Math.random() * n)];
            this.flick.push([c.gx, c.gy, 1, Math.random() < 0.6 ? '#120205' : '#fff6f0']);
        }
        if (Math.random() < 0.08) {
            const c = cells[Math.floor(Math.random() * n)];
            this.flick.push([c.gx - 2, c.gy, 4 + Math.floor(Math.random() * 5), Math.random() < 0.5 ? '#fff6f0' : '#18f0ff']);
        }
        return true;
    };

    // ---------- the free space a design can draw in
    // T is every category's counter + title (the union, since the title swaps), K every category's skills column.
    // Bands are centre-line limits: anything inside them keeps the ribbon m clear of the words.
    function frame(W, H, T, K, star) {
        const rw = Math.max(8, W * 0.018);
        const m = rw / 2 + Math.max(6, W * 0.008);
        const e = Math.max(rw, W * 0.024);
        T = boxed(T);
        K = boxed(K);
        const top = { y0: e, y1: Math.min(T.t, K.t) - m - 2 };
        const bot = { y0: Math.max(T.b, K.b) + m + 2, y1: H - e };
        const gap = { x0: T.r + m, x1: K.l - m };
        gap.cx = (gap.x0 + gap.x1) / 2;
        const left = { x0: star.cx + star.R + rw * 0.5, x1: T.l - m - 2 };
        return {
            W, H, rw, m, e, T, K, top, bot, gap, left,
            cx: star.cx, cy: H / 2, R: star.R,
            th: top.y1 - top.y0, bh: bot.y1 - bot.y0, lw: left.x1 - left.x0,
        };
    }

    // ---------- the designs: build(g) returns a pen with five marks (where steps 01..05 land)

    const DESIGNS = [
        {
            id: 'ap-signature', name: 'AP signature',
            desc: 'One cursive stroke under the title signs "AP", and the last step pulls the underline flourish out to the right.',
            build(g) {
                const h = g.bh * 0.9, y0 = g.bot.y0 + g.bh * 0.05, sx = h * 1.12, x0 = g.T.l - g.W * 0.03;
                const X = (u) => x0 + u * sx, Y = (v) => y0 + v * h;
                const P = (u, v, f) => [X(u), Y(v), f];
                const endX = Math.min(g.W - g.e, g.K.r);
                const fx = Math.max(X(1.7), Math.min(X(1.95), endX - g.W * 0.18));
                return pen(X(0), Y(0.92)).mark().curve([
                    P(0.16, 0.68), P(0.31, 0.30), P(0.44, 0.03, 1),
                    P(0.53, 0.32), P(0.61, 0.70), P(0.69, 0.97),
                    P(0.55, 0.75), P(0.36, 0.62), P(0.39, 0.51), P(0.62, 0.49), P(0.86, 0.45, 1),
                    P(1.00, 0.06), P(0.97, 0.55), P(0.94, 0.98), P(1.02, 0.62), P(1.06, 0.12),
                    P(1.27, 0.02), P(1.42, 0.20), P(1.32, 0.42), P(1.07, 0.47, 1),
                    P(1.30, 0.72), [fx, Y(0.88)], [endX - (endX - fx) * 0.3, Y(0.8)], [endX, Y(0.6), 1],
                ]);
            },
        },
        {
            id: 'category-icons', name: 'Category glyphs',
            desc: 'One stroke draws a glyph per category: </>, a database and a neural cluster over the title, then past the asterisk to a >_ prompt and a gear below.',
            build(g) {
                const xa = g.left.x0, xb = g.W - g.e, span = xb - xa;
                const ts = Math.min(g.th * 0.9, span / 3 * 0.62), bs = Math.min(g.bh * 0.9, span / 3 * 0.62);
                const tc = (g.top.y0 + g.top.y1) / 2, bc = (g.bot.y0 + g.bot.y1) / 2;
                const boxes = [
                    { cx: xa + span * 0.83, cy: tc, s: ts }, { cx: xa + span * 0.5, cy: tc, s: ts }, { cx: xa + span * 0.17, cy: tc, s: ts },
                    { cx: xa + span * 0.36, cy: bc, s: bs }, { cx: xa + span * 0.76, cy: bc, s: bs },
                ];
                const pr = g.rw * 0.3;
                const lx = (g.left.x0 + g.left.x1) / 2;
                let p = null;
                const glyph = (i, first, draw) => {
                    const b = boxes[i], s = b.s, x = b.cx - s / 2, y = b.cy - s / 2;
                    const U = (u, v, f) => [x + u * s, y + v * s, f];
                    const band = i < 3 ? g.top : g.bot;
                    const q = U(first[0], first[1]);
                    if (!p) p = pen(q[0], q[1]);
                    else if (i === 3) p.curve([[lx, g.top.y1], [lx, g.bot.y0], [Math.min(q[0] - s * 0.15, lx + s * 0.3), bc], q]);
                    else {
                        const a = p.at();
                        p.curve([[(a[0] + q[0]) / 2, clamp((a[1] + q[1]) / 2 + s * 0.2, band.y0, band.y1)], q]);
                    }
                    draw(U, b, s);
                    p.mark();
                };
                glyph(0, [0.70, 0.84], (U) => {
                    p.lines([U(0.96, 0.5), U(0.70, 0.16), U(0.58, 0.14), U(0.42, 0.86), U(0.30, 0.84), U(0.04, 0.5), U(0.30, 0.16)]);
                });
                glyph(1, [0.92, 0.2], (U, b, s) => {
                    const rx = 0.42 * s, ry = 0.14 * s, top = b.cy - 0.3 * s, bot = b.cy + 0.3 * s;
                    p.arc(b.cx, top, rx, ry, 0, -TAU);
                    p.line(...U(0.92, 0.8));
                    p.arc(b.cx, bot, rx, ry, 0, Math.PI);
                    p.line(...U(0.08, 0.2));
                });
                // Three ringed nodes joined by edges: each ring is entered from the side facing where the stroke came from
                glyph(2, [0.97, 0.5], (U, b, s) => {
                    const rn = 0.14 * s;
                    const nodes = [[0.83, 0.5], [0.24, 0.2], [0.24, 0.8]].map((q) => U(q[0], q[1]));
                    nodes.forEach((c, j) => {
                        const from = j ? nodes[j - 1] : [c[0] + 1, c[1]];
                        const a = Math.atan2(from[1] - c[1], from[0] - c[0]);
                        p.line(c[0] + rn * Math.cos(a), c[1] + rn * Math.sin(a));
                        p.arc(c[0], c[1], rn, rn, a, a + (j === 1 ? -TAU : TAU));
                    });
                    p.line(...U(0.06, 0.8));
                });
                glyph(3, [0.12, 0.18], (U) => {
                    p.lines([U(0.5, 0.5), U(0.12, 0.82), U(0.56, 0.84), U(0.92, 0.84)]);
                });
                glyph(4, [0.03, 0.5], (U, b, s) => {
                    const cx = b.cx, cy = b.cy, ro = 0.47 * s, ri = 0.33 * s;
                    p.fn((t) => {
                        const a = Math.PI + t * TAU;
                        const r = ri + (ro - ri) * clamp((Math.cos(7 * (a - Math.PI)) + 0.2) * 1.8, 0, 1);
                        return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
                    }, 320);
                    p.line(cx, cy);
                    p.pad(pr * 1.4);
                });
                return p;
            },
        },
        {
            id: 'circuit-trace', name: 'Circuit trace',
            desc: 'A PCB trace with 45° bends and a solder pad at every step, running down the gap and plugging into the asterisk like a chip pin.',
            build(g) {
                const pr = g.rw * 0.55, d45 = g.rw * 2.2;
                const yA = g.top.y0 + g.th * 0.32, yB = g.top.y1 - pr * 0.4;
                const gx = g.gap.cx;
                const yC = g.bot.y0 + g.bh * 0.12, yD = g.bot.y0 + g.bh * 0.6;
                const xL = g.left.x1 - g.rw * 0.4, tip = g.cx + g.R * 0.93;
                const dz = Math.min((xL - tip) * 0.45, g.H * 0.08);
                const p = pen(g.W - g.e - g.rw, yA).pad(pr).mark();
                const xs = p.at()[0];
                p.line(Math.min(xs - d45, gx + (yB - yA)), yA);
                p.line(gx, yB);
                p.pad(pr, false).mark();
                p.line(gx, yC);
                p.line(gx - (yD - yC), yD);
                p.line(g.T.l + g.T.w * 0.36, yD);
                p.pad(pr).mark();
                p.line(xL + (yD - (yC + g.bh * 0.06)), yD);
                p.line(xL, yC + g.bh * 0.06);
                p.pad(pr, false).mark();
                p.line(xL, g.cy + dz);
                p.line(xL - dz, g.cy);
                p.line(tip, g.cy, 1);
                return p;
            },
        },
        {
            id: 'infinity', name: 'Infinity loop',
            desc: 'A figure-eight with the title in one lobe and the skills in the other, crossing in the gap between them and closing on step 05.',
            build(g) {
                const T = g.T, K = g.K, o = g.m * 1.3;
                const yt = g.top.y1, yb = g.bot.y0;
                const C = [g.gap.cx, (yt + yb) / 2];
                // Right of the skills there's only the page padding: the lobe runs straight down the middle of what's left
                const w0 = K.r + g.m + 1, w1 = g.W - g.rw * 0.55 - 1;
                const xR = Math.min(K.r + o, Math.max(w0, (w0 + w1) / 2)), oR = xR - K.r;
                return pen(C[0], C[1]).mark().curve([
                    [g.gap.x0, yt],
                    [T.cx, T.t - o],
                    [T.l - o * 0.72, T.t - o * 0.72],
                    [T.l - o, T.cy, 1],
                    [T.l - o * 0.72, T.b + o * 0.72],
                    [T.cx, T.b + o],
                    [g.gap.x0, yb],
                    [C[0], C[1], 1],
                    [g.gap.x1, yt],
                    [K.cx, K.t - o],
                    [K.r + oR * 0.72, K.t - o * 0.72],
                    [xR, K.t + K.h * 0.2],
                    [xR, K.cy, 1],
                    [xR, K.b - K.h * 0.2],
                    [K.r + oR * 0.72, K.b + o * 0.72],
                    [K.cx, K.b + o],
                    [g.gap.x1, yb],
                    [C[0], C[1], 1],
                ]);
            },
        },
        {
            id: 'heartbeat', name: 'Heartbeat',
            desc: 'An ECG trace under the words: one beat per category, rising only in the gaps, and a final big beat beside the asterisk.',
            build(g) {
                const yb = g.bot.y0 + g.bh * 0.55;
                const upLow = yb - g.bot.y0 - 3, dn = (g.bot.y1 - yb) * 0.85;
                const p = pen(g.W - g.e, yb);
                // Drawn right to left, so P sits left of QRS and T right of it, as on a monitor
                const beat = (xc, w, up) => {
                    const x = (f) => xc + w * f;
                    p.line(x(0.5), yb);
                    p.curve([[x(0.4), yb - up * 0.1], [x(0.3), yb - Math.min(up, upLow) * 0.3], [x(0.2), yb]]);
                    p.line(x(0.1), yb);
                    p.line(x(0.06), yb + dn);
                    p.line(x(0), yb - up);
                    p.line(x(-0.05), yb + dn * 0.22);
                    p.line(x(-0.09), yb);
                    p.line(x(-0.18), yb);
                    p.curve([[x(-0.25), yb - Math.min(up, upLow) * 0.2], [x(-0.32), yb - Math.min(up, upLow) * 0.22], [x(-0.39), yb]]);
                    p.line(x(-0.5), yb, 1);
                };
                const roomK = g.K.cx - g.gap.cx;
                beat(g.K.cx, Math.min(g.K.w * 0.85, roomK * 0.95), upLow * 0.8);
                beat(g.gap.cx, Math.min(roomK * 0.95, g.T.w * 0.3), yb - g.cy);
                beat(g.T.l + g.T.w * 0.7, g.T.w * 0.36, upLow * 0.9);
                beat(g.T.l + g.T.w * 0.3, g.T.w * 0.36, upLow);
                const lc = (g.left.x0 + g.left.x1) / 2;
                const x = (f) => lc + g.lw * 1.4 * f;
                p.line(x(0.5), yb);
                p.curve([[x(0.38), yb - upLow * 0.35], [x(0.24), yb]]);
                p.line(x(0.08), yb + dn);
                p.line(x(0), g.top.y0 + g.th * 0.08);
                p.line(x(-0.07), yb + dn * 0.5);
                p.line(x(-0.12), yb);
                p.line(g.e, yb, 1);
                return p;
            },
        },
        {
            id: 'spiral', name: 'Asterisk ripple spiral',
            desc: 'Unwinds from the asterisk\'s hub, then one wider ring arc per step, folding back at the edge like a ripple spreading toward the title.',
            build(g) {
                const cx = g.cx, cy = g.cy;
                const rMax = Math.min(g.left.x1 - cx, cy - g.e, g.H - g.e - cy);
                const r = [0, 0.625, 0.75, 0.875, 1].map((f) => f * rMax);
                const p = pen(cx, cy).mark();
                p.fn((u) => {
                    const a = -Math.PI / 2 + Math.PI * u, rr = r[1] * Math.pow(u, 0.7);
                    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
                }, 160, true);
                for (let k = 2; k <= 4; k++) {
                    const down = k % 2 === 0;
                    const ya = cy + (down ? r[k - 1] : -r[k - 1]), yz = cy + (down ? r[k] : -r[k]);
                    const hr = Math.abs(yz - ya) / 2;
                    p.arc(cx, (ya + yz) / 2, hr, hr, down ? -Math.PI / 2 : Math.PI / 2, down ? -Math.PI * 1.5 : Math.PI * 1.5);
                    if (down) p.arc(cx, cy, r[k], r[k], Math.PI / 2, -Math.PI / 2, true);
                    else p.arc(cx, cy, r[k], r[k], -Math.PI / 2, Math.PI / 2, true);
                }
                return p;
            },
        },
        {
            id: 'constellation', name: 'Constellation',
            desc: 'Five stars, one per category, linked by the ribbon around the title; the last step closes them into a pentagonal constellation.',
            build(g) {
                const V = [
                    [g.left.x1 - g.W * 0.045, g.top.y0 + g.th * 0.5],
                    [g.gap.cx, g.top.y0 + g.th * 0.36],
                    [g.gap.cx, g.bot.y0 + g.bh * 0.45],
                    [g.T.l + g.T.w * 0.24, g.bot.y1 - g.bh * 0.34],
                    [g.left.x0 + g.lw * 0.4, g.cy + g.H * 0.08],
                ];
                const sl = g.rw * 1.7, st = Math.min(g.rw * 2.3, g.th * 0.3);
                const p = pen(V[0][0], V[0][1]).spark(sl, st).mark();
                for (let i = 1; i < 5; i++) {
                    p.line(V[i][0], V[i][1]).spark(sl, st);
                    if (i < 4) p.mark();
                }
                return p.line(V[0][0], V[0][1]).spark(sl * 1.25, st * 1.25).mark();
            },
        },
        {
            id: 'lightning', name: 'Lightning tear',
            desc: 'A jagged bolt rips left across the top, drops past the asterisk with glitch offsets and tears out along the bottom.',
            build(g) {
                const ya = (f) => g.top.y0 + g.th * f, yb = (f) => g.bot.y0 + g.bh * f;
                const xr = g.W - g.e - g.rw * 0.5, xl = g.left.x1;
                const tx = (f) => xr - (xr - xl) * f, bx = (f) => xl + (xr - xl) * f;
                const lx = (f) => g.left.x0 + g.lw * f;
                const p = pen(xr, ya(0.12)).mark();
                p.lines([[tx(0.14), ya(0.8)], [tx(0.1), ya(0.42)], [tx(0.3), ya(0.95)], [tx(0.33), ya(0.95)], [tx(0.27), ya(0.3)],
                    [tx(0.5), ya(0.85)], [tx(0.45), ya(0.2)], [tx(0.7), ya(0.7)], [tx(0.66), ya(0.15)], [tx(0.9), ya(0.75)],
                    [tx(1), ya(1), 1]]);
                const yy = (f) => g.top.y1 + (g.bot.y0 - g.top.y1) * f;
                p.lines([[lx(0.25), yy(0.18)], [lx(0.7), yy(0.3)], [lx(0.78), yy(0.3)], [lx(0.3), yy(0.5), 1], [lx(0.85), yy(0.62)],
                    [lx(0.2), yy(0.8)], [lx(0.28), yy(0.8)], [lx(0.9), yy(1)], [bx(0.02), yb(0.15), 1]]);
                p.lines([[bx(0.12), yb(0.85)], [bx(0.16), yb(0.4)], [bx(0.34), yb(0.95)], [bx(0.31), yb(0.3)], [bx(0.5), yb(0.75)],
                    [bx(0.53), yb(0.75)], [bx(0.48), yb(0.2)], [bx(0.7), yb(0.9)], [bx(0.68), yb(0.35)], [bx(0.88), yb(0.8)],
                    [bx(0.86), yb(0.25)], [xr, yb(0.9), 1]]);
                return p;
            },
        },
        {
            id: 'bow', name: 'Ribbon bow',
            desc: 'The ribbon wraps the title like a gift, comes back to the knot and ties a bow on top, its loose end flying off to the right.',
            build(g) {
                const T = g.T, o = g.m * 1.3;
                const L = T.l - o, Rx = Math.max(T.r + g.m, g.gap.cx), Tt = T.t - o, Tb = T.b + o;
                const oR = Rx - T.r;
                const kx = T.l + T.w * 0.42;
                const lw = Math.min(g.W * 0.085, T.w * 0.3), lh = (Tt - g.top.y0) * 0.9;
                const B = (u, v, f) => [kx + u * lw, Tt + v * lh, f];
                return pen(kx - g.W * 0.07, Tt).mark().curve([
                    [T.l + T.w * 0.08, Tt],
                    [T.l - o * 0.72, T.t - o * 0.72],
                    [L, T.cy],
                    [T.l - o * 0.72, T.b + o * 0.72, 1],
                    [T.cx, Tb],
                    [T.r + oR * 0.72, T.b + o * 0.72],
                    [Rx, T.cy],
                    [T.r + oR * 0.72, T.t - o * 0.72, 1],
                    [T.r - T.w * 0.12, Tt],
                    [kx + lw * 0.5, Tt],
                    [kx, Tt, 1],
                    B(-0.35, -0.72), B(-0.85, -1.0), B(-1.02, -0.55), B(-0.6, -0.16), B(0, 0),
                    B(0.35, -0.72), B(0.85, -1.0), B(1.02, -0.55), B(0.6, -0.16), B(0.08, -0.02),
                    B(0.9, -0.08), B(1.6, -0.42), B(2.1, -0.3), B(2.5, -0.62, 1),
                ]);
            },
        },
        {
            id: 'paper-plane', name: 'Paper-plane loops',
            desc: 'Takes off past the asterisk, loops the loop twice over the title, dives down the gap and lands bottom right.',
            build(g) {
                const ly = (g.top.y0 + g.top.y1) / 2;
                const loop = (p, lx, r) => {
                    const k = 0.34 * r;
                    p.curve([[lx - k * Math.PI - g.W * 0.05, ly + r * 0.96], [lx - k * Math.PI, ly + r]]);
                    p.fn((t) => [lx + k * (t * TAU - Math.PI) + r * Math.sin(t * TAU), ly + r * Math.cos(t * TAU)], 140);
                };
                const p = pen(g.e + g.rw, g.bot.y1 - g.bh * 0.15).mark();
                p.curve([[g.left.x0 + g.lw * 0.25, g.bot.y0 + g.bh * 0.2], [g.left.x0 + g.lw * 0.6, g.cy], [g.left.x1 - g.lw * 0.1, g.top.y1 - g.th * 0.25, 1]]);
                loop(p, g.T.l + g.T.w * 0.22, g.th * 0.4);
                p.mark();
                loop(p, g.T.l + g.T.w * 0.66, g.th * 0.46);
                p.mark();
                p.curve([[g.gap.cx, g.top.y1 - 1], [g.gap.cx, g.bot.y0 + 1], [g.gap.cx + g.W * 0.05, g.bot.y0 + g.bh * 0.62],
                    [g.K.cx, g.bot.y0 + g.bh * 0.74], [g.W - g.e - g.rw, g.bot.y0 + g.bh * 0.55, 1]]);
                return p;
            },
        },
        {
            id: 'growing-sine', name: 'Growing sine',
            desc: 'A signal along the bottom of the slide that gains amplitude with every step, from a flat hum under the asterisk to full swing.',
            build(g) {
                const x0 = g.e + g.rw * 0.5, x1 = g.W - g.e, yc = (g.bot.y0 + g.bot.y1) / 2, A = g.bh / 2 - 3;
                const cyc = 8;
                const amp = (u) => A * (0.1 + 0.9 * Math.pow(u, 1.1));
                const p = pen(x0, yc).mark();
                for (let q = 0; q < 4; q++) {
                    p.fn((t) => {
                        const u = (q + t) / 4;
                        return [x0 + u * (x1 - x0), yc - amp(u) * Math.sin(TAU * cyc * u)];
                    }, 220, true);
                }
                return p;
            },
        },
        {
            id: 'maze', name: 'Maze run',
            desc: 'GLITCH solves a maze under the words, entering past the asterisk and taking the only way out on the right.',
            build(g) {
                const top = Math.max(g.T.b, g.K.b) + Math.max(g.rw * 0.6, g.m - g.rw * 1.15);
                const bottom = g.H - g.e * 0.55;
                const rows = Math.max(2, Math.floor((bottom - top) / (g.rw * 2.3)));
                const c = (bottom - top) / rows;
                const x0 = g.left.x0;
                const cols = Math.max(4, Math.floor((g.W - g.e * 0.6 - c * 0.7 - x0) / c));
                // Recursive backtracker; the seed whose solution winds closest to 2.6x the maze's width wins
                const carve = (seed) => {
                    const rnd = mulberry32(seed);
                    const E = [], S = [], seen = [];
                    for (let i = 0; i < cols * rows; i++) { E.push(true); S.push(true); seen.push(false); }
                    const id = (x, y) => y * cols + x;
                    const stack = [[0, Math.floor(rnd() * rows)]];
                    seen[id(stack[0][0], stack[0][1])] = true;
                    while (stack.length) {
                        const [x, y] = stack[stack.length - 1];
                        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map((d) => [x + d[0], y + d[1]])
                            .filter((q) => q[0] >= 0 && q[0] < cols && q[1] >= 0 && q[1] < rows && !seen[id(q[0], q[1])]);
                        if (!nb.length) { stack.pop(); continue; }
                        const q = nb[Math.floor(rnd() * nb.length)];
                        if (q[0] > x) E[id(x, y)] = false;
                        else if (q[0] < x) E[id(q[0], q[1])] = false;
                        else if (q[1] > y) S[id(x, y)] = false;
                        else S[id(q[0], q[1])] = false;
                        seen[id(q[0], q[1])] = true;
                        stack.push(q);
                    }
                    const rin = Math.floor(rnd() * rows), rout = Math.floor(rnd() * rows);
                    const prev = new Array(cols * rows).fill(-1), q = [id(0, rin)];
                    prev[q[0]] = q[0];
                    while (q.length) {
                        const v = q.shift(), x = v % cols, y = (v - x) / cols;
                        const go = [];
                        if (x < cols - 1 && !E[v]) go.push(v + 1);
                        if (x > 0 && !E[v - 1]) go.push(v - 1);
                        if (y < rows - 1 && !S[v]) go.push(v + cols);
                        if (y > 0 && !S[v - cols]) go.push(v - cols);
                        go.forEach((w) => { if (prev[w] < 0) { prev[w] = v; q.push(w); } });
                    }
                    const path = [];
                    for (let v = id(cols - 1, rout); ; v = prev[v]) {
                        path.unshift(v);
                        if (v === prev[v]) break;
                    }
                    return { E, S, rin, rout, path };
                };
                let best = null;
                for (let seed = 1; seed <= 24; seed++) {
                    const mz = carve(0x4d41 + seed * 7919);
                    const score = Math.abs(mz.path.length - cols * 2.6);
                    if (!best || score < best.score) best = Object.assign(mz, { score });
                }
                const cxy = (v) => [x0 + (v % cols + 0.5) * c, top + (Math.floor(v / cols) + 0.5) * c];
                const p = pen(x0 - c * 0.55, top + (best.rin + 0.5) * c);
                const centres = [];
                best.path.forEach((v) => {
                    const q = cxy(v);
                    p.line(q[0], q[1]);
                    centres.push(p.pts.length - 1);
                });
                p.line(x0 + (cols + 0.55) * c, top + (best.rout + 0.5) * c);
                p.picks = centres;
                p.decor = (ctx) => {
                    ctx.strokeStyle = 'rgba(244, 242, 234, 0.2)';
                    ctx.lineWidth = 1;
                    ctx.lineCap = 'square';
                    ctx.beginPath();
                    const X = (i) => Math.round(x0 + i * c) + 0.5, Y = (j) => Math.round(top + j * c) + 0.5;
                    ctx.moveTo(X(0), Y(0));
                    ctx.lineTo(X(cols), Y(0));
                    ctx.moveTo(X(0), Y(rows));
                    ctx.lineTo(X(cols), Y(rows));
                    for (let j = 0; j < rows; j++) {
                        if (j !== best.rin) { ctx.moveTo(X(0), Y(j)); ctx.lineTo(X(0), Y(j + 1)); }
                        if (j !== best.rout) { ctx.moveTo(X(cols), Y(j)); ctx.lineTo(X(cols), Y(j + 1)); }
                    }
                    for (let j = 0; j < rows; j++) {
                        for (let i = 0; i < cols; i++) {
                            const v = j * cols + i;
                            if (i < cols - 1 && best.E[v]) { ctx.moveTo(X(i + 1), Y(j)); ctx.lineTo(X(i + 1), Y(j + 1)); }
                            if (j < rows - 1 && best.S[v]) { ctx.moveTo(X(i), Y(j + 1)); ctx.lineTo(X(i + 1), Y(j + 1)); }
                        }
                    }
                    ctx.stroke();
                };
                return p;
            },
        },
        {
            id: 'handwritten', name: 'Handwritten "skills"',
            desc: 'The word "skills" lettered in one slanted monoline stroke above the title, a letter or two per step, ending in a swash.',
            build(g) {
                const h = g.th * 0.94, y0 = g.top.y0 + g.th * 0.03, x0 = g.T.l, sl = 0.14;
                const sx = h * 1.22;
                const P = (u, v, f) => [x0 + u * sx + (0.92 - v) * h * sl, y0 + v * h, f];
                const L = (u, v) => p.line(...P(u, v));
                const endU = Math.max(2.0, Math.min(2.4, (Math.min(g.gap.cx, g.W - g.e) - x0) / sx));
                const p = pen(...P(0.05, 0.88)).mark();
                p.curve([P(0.26, 0.93), P(0.40, 0.82), P(0.33, 0.69), P(0.14, 0.62), P(0.09, 0.5), P(0.24, 0.42), P(0.40, 0.47, 1)]);
                p.curve([P(0.50, 0.26), P(0.56, 0.03)]);
                L(0.56, 0.92); L(0.56, 0.68); L(0.84, 0.44); L(0.63, 0.64); L(0.87, 0.92);
                p.mark();
                p.curve([P(0.96, 0.6), P(1.01, 0.44)]);
                L(1.01, 0.92);
                p.curve([P(1.1, 0.52), P(1.16, 0.03)]);
                L(1.16, 0.92);
                p.mark();
                p.curve([P(1.25, 0.52), P(1.31, 0.03)]);
                L(1.31, 0.92);
                p.curve([P(1.42, 0.89), P(1.6, 0.93), P(1.74, 0.82), P(1.67, 0.69), P(1.48, 0.62), P(1.43, 0.5), P(1.58, 0.42), P(1.74, 0.47)]);
                return p.curve([P(1.92, 0.36), P(endU, 0.2, 1)]);
            },
        },
        {
            id: 'double-helix', name: 'Double helix',
            desc: 'Two interleaved strands under the words: out along one, a hairpin at the right, and back along the other to close the helix.',
            build(g) {
                const yc = (g.bot.y0 + g.bot.y1) / 2, A = g.bh / 2 - 3;
                const x0 = Math.max(g.left.x0, g.T.l - g.W * 0.07), x1 = g.W - g.e - A - 2, Lx = x1 - x0, n = 4.25;
                const p = pen(x0, yc).mark();
                const strand = (sgn, u0, u1, m) => p.fn((t) => {
                    const u = u0 + (u1 - u0) * t;
                    return [x0 + u * Lx, yc + sgn * A * Math.sin(TAU * n * u)];
                }, 220, m);
                strand(1, 0, 0.5, true);
                strand(1, 0.5, 1, false);
                p.arc(x1, yc, A, A, Math.PI / 2, -Math.PI / 2, true);
                strand(-1, 1, 0.5, true);
                strand(-1, 0.5, 0, true);
                return p;
            },
        },
    ];

    // ---------- cards

    const STAR_SVG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg stroke='%23000' stroke-width='3.2' stroke-linecap='square'%3E%3Cpath d='M3 12h18'/%3E%3Cpath d='M7.5 4.2l9 15.6'/%3E%3Cpath d='M16.5 4.2l-9 15.6'/%3E%3C/g%3E%3C/svg%3E\")";
    const pad2 = (n) => String(n).padStart(2, '0');
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    function cardHTML(d, i) {
        const cats = CATS.map((c, k) => '<div class="rs-cat' + (k === 0 ? ' is-on' : '') + '" data-k="' + k + '">' +
            '<h3 class="rs-title"><span class="rs-kick">[ ' + pad2(k + 1) + ' / 05 ]</span>' +
            c[0].split(' ').map((w, j) => '<span class="rs-w"><span class="rs-wi" style="--i:' + j + '">' + esc(w) + '</span></span>').join(' ') +
            '</h3><ul class="rs-set">' + c[1].map((s, j) => '<li><span class="rs-li" style="--i:' + j + '">' + esc(s) + '</span></li>').join('') + '</ul></div>').join('');
        return '<header class="rs-meta"><span class="rs-num">' + pad2(i + 1) + '</span><div class="rs-copy"><h2 class="rs-name">' + esc(d.name) + '</h2>' +
            '<p class="rs-desc">' + esc(d.desc) + '</p></div></header>' +
            '<div class="rs-stage">' +
            '<canvas class="rs-decor" aria-hidden="true"></canvas><canvas class="rs-ribbon" aria-hidden="true"></canvas>' +
            '<div class="rs-rail" aria-hidden="true"><i></i><i></i><i></i></div>' +
            '<div class="rs-star" aria-hidden="true"></div>' +
            '<div class="rs-cats">' + cats + '</div>' +
            '<canvas class="rs-bug" width="24" height="30" aria-hidden="true"></canvas>' +
            '</div>' +
            '<footer class="rs-ctrl">' +
            '<button type="button" class="rs-btn" data-act="prev" aria-label="Previous step">[ &larr; ]</button>' +
            '<ol class="rs-ticks">' + CATS.map((c, k) => '<li><button type="button" data-step="' + k + '" aria-label="Step ' + (k + 1) + '">' + pad2(k + 1) + '</button></li>').join('') + '</ol>' +
            '<button type="button" class="rs-btn" data-act="next" aria-label="Next step">[ &rarr; ]</button>' +
            '<button type="button" class="rs-btn rs-btn--auto" data-act="auto" aria-pressed="false">[ auto-play ]</button>' +
            '<span class="rs-hint">&larr; &rarr; while hovered or focused</span>' +
            '</footer>';
    }

    const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

    function Card(d, i, host) {
        const el = doc.createElement('article');
        el.className = 'rs-card';
        el.tabIndex = 0;
        el.id = 'design-' + pad2(i + 1);
        el.setAttribute('aria-label', 'Design ' + pad2(i + 1) + ': ' + d.name);
        el.innerHTML = cardHTML(d, i);
        host.appendChild(el);
        this.d = d;
        this.i = i;
        this.el = el;
        this.stage = el.querySelector('.rs-stage');
        this.star = el.querySelector('.rs-star');
        this.cats = Array.from(el.querySelectorAll('.rs-cat'));
        this.rail = Array.from(el.querySelectorAll('.rs-rail i'));
        this.bug = el.querySelector('.rs-bug');
        this.bugCtx = this.bug.getContext('2d');
        this.decor = el.querySelector('.rs-decor');
        this.ribbon = new Ribbon(el.querySelector('.rs-ribbon'));
        this.ticks = Array.from(el.querySelectorAll('.rs-ticks button'));
        this.autoBtn = el.querySelector('[data-act="auto"]');
        this.step = 0;
        this.s = 0;
        this.anim = null;
        this.auto = false;
        this.nextAt = 0;
        this.heading = null;
        this.pose = '';
        this.visible = false;
        this.started = false;
        this.dirty = true;
        this.report = null;

        el.addEventListener('click', (e) => {
            const b = e.target.closest('button');
            if (!b) return;
            if (b.dataset.step) { this.setAuto(false); this.go(+b.dataset.step); }
            else if (b.dataset.act === 'prev') { this.setAuto(false); this.go(this.step - 1); }
            else if (b.dataset.act === 'next') { this.setAuto(false); this.go(this.step + 1); }
            else if (b.dataset.act === 'auto') this.setAuto(!this.auto);
        });
        el.addEventListener('pointerenter', () => { hovered = this; });
        el.addEventListener('pointerleave', () => { if (hovered === this) hovered = null; });
    }

    Card.prototype.setAuto = function (on) {
        this.auto = on;
        this.autoBtn.setAttribute('aria-pressed', String(on));
        this.autoBtn.textContent = on ? '[ pause ]' : '[ auto-play ]';
        this.nextAt = performance.now() + 500;
    };

    // Mirrors the live slide's measure(): star cut by the left edge, title column from 29% to three gaps short of the
    // widest skills column, title scaled so its widest word fits
    Card.prototype.layout = function () {
        const st = this.stage, W = st.clientWidth, H = st.clientHeight;
        if (!W || !H) return false;
        const S = Math.round(Math.min(W, H) * 0.58), cx = W * 0.03, gap = clamp(W * 0.014, 6, 26);
        st.style.setProperty('--S', S + 'px');
        st.style.setProperty('--cx', cx + 'px');
        const tx = Math.round(Math.max(W * 0.29, cx + S * 9 / 24 + gap * 3));
        st.style.setProperty('--tx', tx + 'px');
        st.style.setProperty('--fit', '1');
        st.style.removeProperty('--tw');
        const sr = st.getBoundingClientRect();
        let setLeft = Infinity;
        this.cats.forEach((c) => { setLeft = Math.min(setLeft, c.querySelector('.rs-set').getBoundingClientRect().left - sr.left); });
        const col = setLeft - gap * 3 - tx;
        st.style.setProperty('--tw', Math.max(0, Math.round(col)) + 'px');
        let widest = 0;
        this.cats.forEach((c) => c.querySelectorAll('.rs-w').forEach((w) => { widest = Math.max(widest, w.getBoundingClientRect().width); }));
        if (widest > 0 && col > 0) st.style.setProperty('--fit', clamp(col / widest, 0.5, 1).toFixed(4));

        const rel = (r) => ({ l: r.left - sr.left, t: r.top - sr.top, r: r.right - sr.left, b: r.bottom - sr.top });
        let T = null, K = null;
        this.geo = this.cats.map((c) => {
            let t = null;
            c.querySelectorAll('.rs-w').forEach((w) => { t = unite(t, rel(w.getBoundingClientRect())); });
            const k = rel(c.querySelector('.rs-set').getBoundingClientRect());
            T = unite(T, unite(t, rel(c.querySelector('.rs-kick').getBoundingClientRect())));
            K = unite(K, k);
            return { tl: t.l, tr: t.r, sl: k.l, sr: k.r };
        });
        this.W = W;
        this.H = H;
        this.gap = gap;
        const g = frame(W, H, T, K, { cx, R: S * 0.375 });
        this.g = g;
        const p = this.d.build(g);
        const route = createRoute(p.pts);
        let marks;
        if (p.picks) {
            marks = [0, 0.25, 0.5, 0.75, 1].map((f, k) => {
                if (k === 0) return 0;
                if (k === 4) return route.L;
                let best = 0, bd = Infinity;
                p.picks.forEach((idx) => { const dd = Math.abs(route.cum[idx] - route.L * f); if (dd < bd) { bd = dd; best = route.cum[idx]; } });
                return best;
            });
        } else marks = p.marks.map((idx) => route.cum[idx]);
        while (marks.length < N) marks.push(route.L);
        marks.length = N;
        marks[N - 1] = Math.min(marks[N - 1], route.L);
        this.route = route;
        this.marks = marks;

        let minClear = Infinity, inside = true;
        for (let j = 0; j < route.xs.length; j++) {
            const x = route.xs[j], y = route.ys[j];
            minClear = Math.min(minClear, rectDist(x, y, g.T), rectDist(x, y, g.K));
            if (x < g.rw * 0.5 || x > W - g.rw * 0.5 || y < g.rw * 0.5 || y > H - g.rw * 0.5) inside = false;
        }
        this.report = {
            n: this.i + 1, id: this.d.id, name: this.d.name, W, H,
            minClear: +minClear.toFixed(1), need: +g.m.toFixed(1), ok: minClear >= g.m - 0.75 && inside, inside,
            L: Math.round(route.L), marks: marks.map(Math.round),
        };

        const scale = Math.min(2, window.devicePixelRatio || 1);
        this.ribbon.build(route, W, H, scale, g.rw, 0x5ced04 + this.i * 131);
        this.decor.width = Math.round(W * scale);
        this.decor.height = Math.round(H * scale);
        const dc = this.decor.getContext('2d');
        dc.setTransform(1, 0, 0, 1, 0, 0);
        dc.clearRect(0, 0, this.decor.width, this.decor.height);
        if (p.decor) {
            dc.setTransform(scale, 0, 0, scale, 0, 0);
            p.decor(dc);
        }
        this.bs = Math.max(1, Math.round(W / 620));
        this.bug.style.width = 24 * this.bs + 'px';
        this.bug.style.height = 30 * this.bs + 'px';
        this.s = this.anim ? this.anim.to : this.marks[this.step];
        if (!this.started && !DONE) this.s = 0;
        this.anim = null;
        this.showCat(this.step);
        this.dirty = true;
        return true;
    };

    Card.prototype.showCat = function (k) {
        this.cats.forEach((c, j) => {
            const on = j === k;
            if (on && !c.classList.contains('is-on')) {
                c.classList.remove('is-in');
                void c.offsetWidth;
                c.classList.add('is-in');
            }
            c.classList.toggle('is-on', on);
        });
        this.ticks.forEach((t, j) => t.classList.toggle('is-on', j === k));
        this.star.style.transform = 'rotate(' + (60 * k) + 'deg)';
        this.renderRail(k);
    };

    // Three full-width segments placed and cut by transform; the line breaks around the words and fills by step
    Card.prototype.renderRail = function (k) {
        const geo = this.geo && this.geo[k];
        if (!geo) return;
        const W = this.W, gp = this.gap;
        let holes = [[geo.tl - gp, geo.tr + gp], [geo.sl - gp, geo.sr + gp]].sort((a, b) => a[0] - b[0]);
        if (holes[1][0] <= holes[0][1]) holes = [[holes[0][0], Math.max(holes[0][1], holes[1][1])]];
        const segs = [];
        let x = 0;
        holes.forEach((h) => { segs.push([x, Math.max(x, h[0])]); x = Math.max(x, h[1]); });
        segs.push([x, Math.max(x, W)]);
        let total = 0;
        segs.forEach((s) => { total += s[1] - s[0]; });
        let left = (k + 1) / N * total;
        this.rail.forEach((el, j) => {
            const s = segs[j];
            const len = s ? s[1] - s[0] : 0;
            const d = Math.max(0, Math.min(len, left));
            left -= d;
            el.style.transform = 'translate3d(' + (s ? s[0] : 0) + 'px,0,0) scaleX(' + (d / W) + ')';
        });
    };

    Card.prototype.go = function (k, now) {
        k = clamp(k, 0, N - 1);
        now = now || performance.now();
        this.started = true;
        this.step = k;
        this.showCat(k);
        const to = this.marks[k], from = this.s;
        if (Math.abs(to - from) < 0.5 || reduced) {
            this.s = to;
            this.anim = null;
            this.dirty = true;
            return 0;
        }
        const dur = clamp(420 + Math.abs(to - from) / this.W * 620, 560, 1050);
        this.anim = { from, to, t0: now, dur };
        return dur;
    };

    Card.prototype.start = function (now) {
        if (this.started) return;
        this.started = true;
        if (DONE) {
            this.step = N - 1;
            this.s = this.marks[N - 1];
            this.showCat(this.step);
            this.dirty = true;
            return;
        }
        this.s = 0;
        this.go(0, now);
    };

    Card.prototype.update = function (now, dt) {
        if (!this.route) return;
        let moving = false, dir = 1;
        if (this.anim) {
            const a = this.anim, u = clamp((now - a.t0) / a.dur, 0, 1);
            this.s = a.from + (a.to - a.from) * ease(u);
            dir = a.to >= a.from ? 1 : -1;
            moving = u < 1;
            this.dirty = true;
            if (!moving) this.anim = null;
        }
        if (this.auto && !this.anim && now >= this.nextAt) {
            const hold = this.step === N - 1 ? 1600 : 1200;
            const dur = this.go(this.step === N - 1 ? 0 : this.step + 1, now);
            this.nextAt = now + Math.max(hold, dur + 250);
        }
        if (this.ribbon.flicker(this.s, now)) this.dirty = true;
        if (this.dirty) {
            this.dirty = false;
            this.ribbon.draw(this.s);
        }

        // GLITCH: along the tangent (turned round when reversing), turning at a capped rate, pixel art snapped to 22.5°
        const p = this.route.atS(this.s);
        const want = p.a + (dir < 0 ? Math.PI : 0);
        if (this.heading === null || reduced) this.heading = want;
        else if (moving) {
            const da = Math.atan2(Math.sin(want - this.heading), Math.cos(want - this.heading));
            this.heading += clamp(da, -14 * dt, 14 * dt);
        }
        const deg = Math.round((this.heading + Math.PI / 2) * 180 / Math.PI / 22.5) * 22.5;
        const bs = this.bs, sc = moving ? 1.16 : 1;
        const tx = Math.round(p.x - 12 * bs), ty = Math.round(p.y - 15 * bs);
        this.bug.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0) rotate(' + deg + 'deg) scale(' + sc + ')';
        this.bug.style.opacity = this.started ? 1 : 0;
        const pose = moving ? (Math.floor(now / 70) % 2 ? 'f1' : 'f2') : 'rest';
        if (pose !== this.pose && window.__pixelBugSprite) {
            this.pose = pose;
            const ctx = this.bugCtx;
            ctx.clearRect(0, 0, 24, 30);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(window.__pixelBugSprite(moving ? { legs: 'a', fly: pose === 'f1' ? 1 : 2 } : { legs: 'mid' }), 0, 0);
        }
    };

    // ---------- page

    let cards = [];
    let hovered = null;

    function nav(card, d) {
        card.setAuto(false);
        card.go(card.step + d);
    }

    function init() {
        const host = doc.getElementById('rsGallery');
        if (!host) return;
        if (SOLO) doc.body.classList.add('is-solo');
        if (SHEET) doc.body.classList.add('is-sheet');
        doc.documentElement.style.setProperty('--rs-star', STAR_SVG);
        DESIGNS.forEach((d, i) => {
            if (SOLO && SOLO !== i + 1) return;
            cards.push(new Card(d, i, host));
        });
        const count = doc.getElementById('rsCount');
        if (count) count.textContent = String(DESIGNS.length);

        const relayout = () => cards.forEach((c) => c.layout());
        relayout();
        let rq = 0;
        const ro = new ResizeObserver(() => {
            cancelAnimationFrame(rq);
            rq = requestAnimationFrame(relayout);
        });
        cards.forEach((c) => ro.observe(c.stage));

        const io = new IntersectionObserver((list) => {
            list.forEach((en) => {
                const c = cards.find((k) => k.el === en.target);
                if (!c) return;
                c.visible = en.isIntersecting;
                if (c.visible) c.start(performance.now());
            });
        }, { threshold: 0.25 });
        cards.forEach((c) => io.observe(c.el));
        if (DONE || SOLO || SHEET) cards.forEach((c) => { c.visible = true; c.start(performance.now()); });

        doc.addEventListener('keydown', (e) => {
            const k = e.key;
            const d = k === 'ArrowRight' || k === 'ArrowDown' ? 1 : k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 0;
            if (!d) return;
            const focused = cards.find((c) => c.el.contains(doc.activeElement));
            const c = focused || hovered;
            if (!c) return;
            e.preventDefault();
            nav(c, d);
        });

        let last = performance.now(), frames = 0;
        const tick = (now) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            cards.forEach((c) => { if (c.visible) c.update(now, dt); });
            if (++frames === 3) {
                window.__ribbonReport = cards.map((c) => c.report);
                window.__ribbonReady = true;
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    const ready = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
    Promise.all([ready, new Promise((r) => (doc.readyState === 'loading' ? doc.addEventListener('DOMContentLoaded', r) : r()))])
        .then(() => Promise.all(['700 40px Brier', '400 16px PP-Mori', '500 11px "IBM Plex Mono"'].map((f) => doc.fonts.load(f).catch(() => null))))
        .then(init);
})();
