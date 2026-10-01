// Contact page: a Google Calendar week that splits into a slot grid, books "I'M BUSY RN", plays a dance clip quantized
// to the event palette, then merges back into an ordinary week. One 17 s cycle locked to the soundtrack loop.
(() => {
    'use strict';

    const LOOP = 17;
    const BEAT = 60 / 137.01;
    const T0 = 0.09; // first kick of the audio excerpt
    const beat = (n) => T0 + n * BEAT;
    const P = {
        split2: beat(4), split5: beat(5), split10: beat(6), flood: beat(7),
        letters: beat(8), lettersDone: beat(11.5), dance: beat(16),
        danceEnd: beat(32), merge5: beat(33), merge2: beat(34), normal: beat(35),
    };
    const STEP = BEAT / 8; // 32nd note: the pace meetings get booked at

    // Display colours; order matches the codebook in scratch/calendar/build-dance.js
    const PALETTE = ['#58b450', '#0b8043', '#556857', '#616161', '#708a74', '#a79b8e', '#fafafa', '#d5f1f7', '#f3efd4',
        '#f2d3ad', '#e67c73', '#f4511e', '#d50000', '#f6bf26', '#039be5', '#3f51b5', '#5469b1', '#7986cb', '#7192e9',
        '#92adf1', '#afc9f8'];
    const FIELD = 0, EMPTY = 255;
    const COL = { field: 0, basil: 1, graphite: 3, flamingo: 10, tangerine: 11, tomato: 12, banana: 13, peacock: 14, blueberry: 15, lavender: 17 };
    const rgbOf = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const INK = PALETTE.map((h) => {
        const [r, g, b] = rgbOf(h);
        return 0.299 * r + 0.587 * g + 0.114 * b > 170 ? 'rgba(60,64,67,0.62)' : 'rgba(255,255,255,0.88)';
    });

    const DAYS = [['Sun', 19], ['Mon', 20], ['Tue', 21], ['Wed', 22], ['Thu', 23], ['Fri', 24], ['Sat', 25]];
    const TODAY = 1;
    const NOW_MIN = 11 * 60 + 48;

    // [day, start, minutes, title, colour]
    const EVENTS = [
        [0, '6:30', 60, 'Run', 'field'], [0, '8:00', 60, 'Sync', 'field'], [0, '9:00', 150, 'Focus Time', 'field'],
        [0, '11:30', 60, 'Lunch', 'field'], [0, '13:00', 150, 'Design Review', 'field'], [0, '16:00', 120, 'All Hands', 'field'],
        [0, '18:30', 90, 'Dinner w/ Sam', 'flamingo'],
        [1, '7:00', 60, 'Gym', 'field'], [1, '8:00', 120, 'Focus Time', 'field'], [1, '10:00', 105, 'Sync', 'field'],
        [1, '12:00', 105, 'Design Review', 'field'], [1, '14:00', 90, 'Lunch & Learn', 'field'], [1, '15:45', 135, '1:1', 'field'],
        [1, '18:00', 60, 'Side Project', 'blueberry'], [1, '19:30', 90, 'Climbing', 'field'],
        [2, '8:00', 90, 'Weekly', 'basil'], [2, '9:30', 30, 'Q3 Planning', 'tomato'], [2, '10:30', 30, 'Office Hours', 'banana'],
        [2, '11:00', 30, 'Hiring Sync', 'basil'], [2, '11:30', 30, 'Design Review', 'tomato'], [2, '12:00', 150, 'Deep Work', 'field'],
        [2, '14:30', 90, 'Retro', 'field'], [2, '16:00', 120, 'Code Review', 'field'], [2, '18:30', 60, 'Groceries', 'graphite'],
        [3, '6:00', 60, 'Run', 'field'], [3, '8:00', 105, 'Q3 Planning', 'basil'], [3, '9:45', 30, 'Coffee Chat', 'banana'],
        [3, '12:15', 60, 'Lunch', 'basil'], [3, '13:15', 30, 'All Hands', 'peacock'], [3, '13:45', 30, 'Product Review', 'lavender'],
        [3, '14:15', 30, 'Standup', 'blueberry'], [3, '14:45', 30, '1:1', 'basil'], [3, '15:15', 30, 'Bday cake', 'banana'],
        [3, '16:30', 30, 'Space Time', 'tangerine'], [3, '17:00', 75, 'Deep Work', 'field'], [3, '19:00', 120, 'Movie night', 'lavender'],
        [4, '7:00', 60, 'Gym', 'field'], [4, '8:00', 150, 'Planning', 'field'], [4, '10:30', 30, 'Lunch', 'basil'],
        [4, '11:00', 120, 'Focus Time', 'blueberry'], [4, '13:00', 30, '1:1', 'lavender'], [4, '13:30', 60, 'Sync', 'blueberry'],
        [4, '14:30', 60, 'Code Review', 'graphite'], [4, '15:30', 60, 'Standup', 'blueberry'], [4, '16:30', 90, 'Design Crit', 'basil'],
        [4, '18:30', 90, 'Band practice', 'tangerine'],
        [5, '8:00', 75, '1:1', 'field'], [5, '9:15', 105, 'Career Chat', 'field'], [5, '11:00', 90, '1:1', 'blueberry'],
        [5, '12:30', 30, 'Lunch', 'graphite'], [5, '13:00', 30, 'Focus Time', 'blueberry'], [5, '13:30', 120, 'All Hands', 'graphite'],
        [5, '15:30', 60, 'Q3 Planning', 'basil'], [5, '16:30', 30, 'Focus Time', 'graphite'], [5, '17:00', 30, 'All Hands', 'basil'],
        [5, '17:30', 30, 'Design Review', 'graphite'], [5, '19:00', 120, 'Drinks', 'field'],
        [6, '7:00', 60, 'Run', 'field'], [6, '8:00', 120, 'Gym', 'field'], [6, '10:00', 120, '1:1', 'field'], [6, '12:00', 150, 'All Hands', 'field'],
        [6, '14:30', 60, 'Deep Work', 'field'], [6, '15:30', 30, 'Cloud Time', 'basil'], [6, '16:00', 90, 'Mentoring', 'field'],
        [6, '18:00', 120, 'Family dinner', 'flamingo'],
    ].map(([day, start, min, title, colour]) => {
        const [h, m] = start.split(':').map(Number);
        const s = (h * 60 + m) / 15;
        return { day, s, e: s + min / 15, title, c: COL[colour], when: span(h * 60 + m, h * 60 + m + min) };
    });

    function clock(min, withSuffix) {
        const h = Math.floor(min / 60) % 24, m = min % 60, h12 = ((h + 11) % 12) + 1;
        return h12 + (m ? ':' + String(m).padStart(2, '0') : '') + (withSuffix ? (h < 12 ? 'am' : 'pm') : '');
    }
    function span(a, b) {
        const sameHalf = (Math.floor(a / 60) < 12) === (Math.floor(b / 60) < 12);
        return clock(a, !sameHalf) + ' – ' + clock(b, true);
    }

    // Block glyphs: '#' is a booked slot. Two weights; the layout picks the largest that fits the grid.
    const FONTS = {
        big: {
            gap: 2, h: 8, g: {
                I: ['######', '######', '..##..', '..##..', '..##..', '..##..', '######', '######'],
                "'": ['##', '##', '#.', '..', '..', '..', '..', '..'],
                M: ['##......##', '###....###', '####..####', '##.####.##', '##..##..##', '##......##', '##......##', '##......##'],
                B: ['#######.', '########', '##....##', '#######.', '#######.', '##....##', '########', '#######.'],
                U: ['##....##', '##....##', '##....##', '##....##', '##....##', '##....##', '########', '.######.'],
                S: ['.#######', '########', '##......', '#######.', '.#######', '......##', '########', '#######.'],
                Y: ['##......##', '###....###', '.###..###.', '..######..', '...####...', '....##....', '....##....', '....##....'],
                R: ['#######.', '########', '##....##', '########', '#######.', '##..###.', '##...###', '##....##'],
                N: ['##.....##', '###....##', '####...##', '##.##..##', '##..##.##', '##...####', '##....###', '##.....##'],
            },
        },
        // Narrow grids: 2-column stems, rows doubled (sy) so horizontal strokes come out as thick as the vertical ones
        mid: {
            gap: 1, h: 5, g: {
                I: ['####', '.##.', '.##.', '.##.', '####'],
                "'": ['##', '#.', '..', '..', '..'],
                M: ['##...##', '###.###', '##.#.##', '##...##', '##...##'],
                B: ['#####.', '##..##', '#####.', '##..##', '#####.'],
                U: ['##..##', '##..##', '##..##', '##..##', '.####.'],
                S: ['.#####', '##....', '.####.', '....##', '#####.'],
                Y: ['##..##', '##..##', '.####.', '..##..', '..##..'],
                R: ['#####.', '##..##', '#####.', '##.##.', '##..##'],
                N: ['##..##', '###.##', '######', '##.###', '##..##'],
            },
        },
    };
    const LINES = ["I'M", 'BUSY', 'RN'];

    const canvas = document.getElementById('gcCanvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    const daysEl = document.getElementById('gcDays');
    const timesEl = document.getElementById('gcTimes');
    const snack = document.getElementById('gcSnack');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hasRoundRect = 'roundRect' in CanvasRenderingContext2D.prototype;

    let L = null;          // layout
    let dance = null;      // { w, h, fps, frames: Uint8Array[] } in PALETTE indices
    let lastKey = '';
    let wallStart = performance.now();

    // ---------------------------------------------------------------- layout
    function layout() {
        const vw = window.innerWidth, vh = window.innerHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const mobile = vw < 700;
        const days = mobile ? 3 : 7, firstDay = mobile ? TODAY : 0;
        const top = mobile ? 56 : 64, dayH = mobile ? 66 : 80, gutter = mobile ? 44 : 64;
        const y0 = top + dayH, gw = vw - gutter, gh = vh - y0;
        const cols = days * 10, cellW = gw / cols;
        // ~0.9 tall-to-wide slots, whole hours, 10 to 16 of them on screen
        const hours = Math.max(10, Math.min(16, Math.round(gh / (cellW * 0.88) / 4)));
        const rows = hours * 4, slotH = gh / rows;
        const startHour = Math.max(5, 8 - Math.ceil((hours - 10) / 2));
        const xs = new Float64Array(cols + 1), ys = new Float64Array(rows + 1);
        for (let c = 0; c <= cols; c++) xs[c] = Math.round((gutter + c * cellW) * dpr);
        for (let r = 0; r <= rows; r++) ys[r] = Math.round(r * slotH * dpr);
        L = { vw, vh, dpr, mobile, days, firstDay, top, dayH, gutter, y0, gw, gh, cols, rows, cellW, slotH, hours, startHour, xs, ys };

        canvas.width = Math.round(vw * dpr);
        canvas.height = Math.round(gh * dpr);
        canvas.style.width = vw + 'px';
        canvas.style.height = gh + 'px';
        const root = document.documentElement.style;
        root.setProperty('--gc-top', top + 'px');
        root.setProperty('--gc-dayh', dayH + 'px');
        root.setProperty('--gc-gutter', gutter + 'px');
        document.querySelector('.js-view-label').textContent = mobile ? '3 days' : 'Week';

        let html = '<div class="gc-tz">GMT+05:30</div>';
        for (let d = firstDay; d < firstDay + days; d++) {
            html += `<div class="gc-day${d === TODAY ? ' is-today' : ''}"><span class="gc-day__name">${DAYS[d][0]}</span><span class="gc-day__num">${DAYS[d][1]}</span></div>`;
        }
        daysEl.innerHTML = html;
        let th = '';
        for (let h = 1; h < hours; h++) {
            const hh = startHour + h;
            th += `<div class="gc-time" style="top:${(h * 4 * slotH).toFixed(2)}px">${((hh + 11) % 12) + 1} ${hh < 12 ? 'AM' : 'PM'}</div>`;
        }
        timesEl.innerHTML = th;

        buildEventGrid();
        buildLetters();
        buildSampler();
        lastKey = '';
    }

    // Event colour per slot cell: the "pixel calendar" the week turns into at the finest split
    function buildEventGrid() {
        const { cols, rows, startHour, firstDay, days } = L;
        const g = new Uint8Array(cols * rows).fill(EMPTY);
        for (const ev of EVENTS) {
            const d = ev.day - firstDay;
            if (d < 0 || d >= days) continue;
            const r0 = Math.max(0, ev.s - startHour * 4), r1 = Math.min(rows, ev.e - startHour * 4);
            for (let c = d * 10; c < d * 10 + 10; c++) for (let r = r0; r < r1; r++) g[c * rows + r] = ev.c;
        }
        L.events = g;
        L.pixelCal = g.map((v) => (v === EMPTY ? FIELD : v));
    }

    function buildLetters() {
        const { cols, rows, cellW, slotH } = L;
        let font = FONTS.big;
        const width = (f, s) => [...s].reduce((w, ch, i) => w + f.g[ch][0].length + (i ? (ch === "'" || s[i - 1] === "'" ? 1 : f.gap) : 0), 0);
        if (width(font, 'BUSY') > cols * 0.86) font = FONTS.mid;
        const sy = font === FONTS.mid ? Math.max(1, Math.min(3, Math.round(2 * cellW / slotH))) : 1;
        const lineGap = font === FONTS.big ? 3 : 2;
        const lineH = font.h * sy, totalH = lineH * 3 + lineGap * sy * 2;
        let y = Math.round((rows - totalH) * 0.45);
        const mask = new Uint8Array(cols * rows);
        const blocks = [];
        LINES.forEach((line, li) => {
            let x = Math.round((cols - width(font, line)) / 2);
            [...line].forEach((ch, i) => {
                if (i) x += ch === "'" || line[i - 1] === "'" ? 1 : font.gap;
                const g = font.g[ch], gw = g[0].length;
                for (let gx = 0; gx < gw; gx++) {
                    let run = -1;
                    for (let gy = 0; gy <= font.h; gy++) {
                        const on = gy < font.h && g[gy][gx] === '#';
                        if (on && run < 0) run = gy;
                        if (!on && run >= 0) {
                            const c = x + gx, r0 = y + run * sy, r1 = y + gy * sy;
                            if (c >= 0 && c < cols) {
                                for (let r = Math.max(0, r0); r < Math.min(rows, r1); r++) mask[c * rows + r] = 1;
                                blocks.push({ c, r0, r1, line: li });
                            }
                            run = -1;
                        }
                    }
                }
                x += gw;
            });
            y += lineH + lineGap * sy;
        });
        // Lines book in reading order, the blocks inside a line in a scattered order, a few per 32nd note
        let seed = 7;
        const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        blocks.forEach((b) => { b.k = b.line + rand(); });
        blocks.sort((a, b) => a.k - b.k);
        const steps = Math.round((P.lettersDone - P.letters) / STEP);
        blocks.forEach((b, i) => { b.at = P.letters + Math.floor(i * steps / blocks.length) * STEP; });
        L.letterMask = mask;
        L.letterBlocks = blocks;
    }

    // Each grid cell votes over 3x3 samples of the clip; the clip is fitted to the grid height (or overscans narrow screens)
    function buildSampler() {
        L.samples = null;
        if (!dance) return;
        const { cols, rows, cellW, slotH, gw, gh } = L;
        const vw = Math.min(gw * 1.6, gh * dance.w / dance.h), vh = vw * dance.h / dance.w;
        const vx = (gw - vw) / 2, vy = (gh - vh) * 0.4;
        const s = new Int32Array(cols * rows * 9);
        for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
            for (let k = 0; k < 9; k++) {
                const px = (c + ((k % 3) + 0.5) / 3) * cellW, py = (r + (Math.floor(k / 3) + 0.5) / 3) * slotH;
                const u = Math.floor((px - vx) / vw * dance.w), v = Math.floor((py - vy) / vh * dance.h);
                s[(c * rows + r) * 9 + k] = u < 0 || v < 0 || u >= dance.w || v >= dance.h ? -1 : v * dance.w + u;
            }
        }
        L.samples = s;
        L.danceCells = new Uint8Array(cols * rows);
        L.danceFrame = -1;
    }

    function danceCells(f) {
        if (L.danceFrame === f) return L.danceCells;
        const frame = dance.frames[f], s = L.samples, out = L.danceCells, votes = new Float32Array(PALETTE.length);
        for (let i = 0; i < out.length; i++) {
            votes.fill(0);
            for (let k = 0; k < 9; k++) {
                const idx = s[i * 9 + k];
                const v = idx < 0 ? FIELD : frame[idx];
                votes[v] += v === FIELD ? 0.8 : 1;
            }
            let best = 0;
            for (let v = 1; v < votes.length; v++) if (votes[v] > votes[best]) best = v;
            out[i] = best;
        }
        L.danceFrame = f;
        return out;
    }

    // ---------------------------------------------------------------- drawing
    function background() {
        const { dpr, xs, ys, cols, rows, gutter } = L;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#dadce0';
        const lw = Math.max(1, Math.round(dpr));
        const x0 = Math.round((gutter - 8) * dpr);
        for (let r = 4; r < rows; r += 4) ctx.fillRect(x0, ys[r], canvas.width - x0, lw);
        for (let c = 0; c <= cols; c += 10) ctx.fillRect(xs[c], 0, lw, canvas.height);
    }

    function nowLine() {
        const { dpr, xs, slotH, startHour, firstDay, days, rows } = L;
        const d = TODAY - firstDay;
        if (d < 0 || d >= days) return;
        const y = Math.round(((NOW_MIN / 15) - startHour * 4) * slotH * dpr);
        if (y < 0 || y > rows * slotH * dpr) return;
        const x0 = xs[d * 10], x1 = xs[d * 10 + 10];
        ctx.fillStyle = '#ea4335';
        ctx.fillRect(x0, y - Math.round(dpr), x1 - x0, Math.max(2, Math.round(2 * dpr)));
        ctx.beginPath();
        ctx.arc(x0, y, 6 * dpr, 0, Math.PI * 2);
        ctx.fill();
    }

    // Slot cells: free time (field) is booked as 30-minute events bricked across sub-columns, realigning every 2 hours;
    // anything else is its own 15-minute event. Each cell is its own rounded-rect fill: merging thousands of them into
    // one path per colour turns into a multi-contour tessellation on the GPU and stalls frames for ~0.5 s.
    const cellBuf = { v: new Uint8Array(0), x: new Float32Array(0), y: new Float32Array(0), w: new Float32Array(0), h: new Float32Array(0) };
    function drawCells(get) {
        const { cols, rows, xs, ys, dpr, startHour } = L;
        const gap = Math.max(1, Math.round(dpr * 0.75));
        const max = cols * rows;
        if (cellBuf.v.length < max) for (const k in cellBuf) cellBuf[k] = new cellBuf[k].constructor(max);
        const { v: V, x: X, y: Y, w: Wd, h: Ht } = cellBuf;
        let n = 0;
        for (let c = 0; c < cols; c++) {
            const sub = c % 10, x = xs[c] + gap, w = xs[c + 1] - xs[c] - gap * 2;
            let r = 0;
            while (r < rows) {
                const v = get(c, r);
                if (v === EMPTY) { r++; continue; }
                let e = r + 1;
                if (v === FIELD) {
                    while (e < rows && get(c, e) === FIELD && ((startHour * 4 + e) % 8) && ((e + sub) % 2)) e++;
                }
                V[n] = v; X[n] = x; Y[n] = ys[r] + gap; Wd[n] = w; Ht[n] = ys[e] - ys[r] - gap * 2;
                n++;
                r = e;
            }
        }
        const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => V[a] - V[b]);
        let cur = -1;
        for (const i of order) {
            if (V[i] !== cur) { cur = V[i]; ctx.fillStyle = PALETTE[cur]; }
            const rad = Math.min(3 * dpr, Wd[i] / 3, Ht[i] / 3);
            ctx.beginPath();
            if (hasRoundRect) ctx.roundRect(X[i], Y[i], Wd[i], Ht[i], rad); else ctx.rect(X[i], Y[i], Wd[i], Ht[i]);
            ctx.fill();
        }
        const minDash = 7 * dpr, line = Math.max(1, Math.round(dpr)), dx = Math.round(2 * dpr);
        let ink = '';
        for (const i of order) {
            if (Wd[i] < minDash) continue;
            if (INK[V[i]] !== ink) { ink = INK[V[i]]; ctx.fillStyle = ink; }
            ctx.fillRect(X[i] + dx, Y[i] + Math.round(3 * dpr), Math.round(Wd[i] * 0.55), line);
            if (Ht[i] >= 16 * dpr) ctx.fillRect(X[i] + dx, Y[i] + Math.round(7 * dpr), Math.round(Wd[i] * 0.32), line);
        }
    }

    // Whole events (n = 1) or events cut into n sub-columns and hour / half-hour pieces
    function drawEvents(n) {
        const { xs, ys, dpr, rows, startHour, firstDay, days, mobile } = L;
        const gap = Math.max(1, Math.round(dpr * 0.75));
        const cut = n === 1 ? 999 : n === 2 ? 4 : 2;
        const big = n === 1 ? (mobile ? 10 : 12) : n === 2 ? (mobile ? 9 : 11) : 9;
        ctx.textBaseline = 'top';
        for (const ev of EVENTS) {
            const d = ev.day - firstDay;
            if (d < 0 || d >= days) continue;
            const r0 = Math.max(0, ev.s - startHour * 4), r1 = Math.min(rows, ev.e - startHour * 4);
            if (r1 <= r0) continue;
            const pieces = [];
            for (let r = r0; r < r1;) {
                let e = Math.min(r1, (Math.floor((startHour * 4 + r) / cut) + 1) * cut - startHour * 4);
                pieces.push([r, e]);
                r = e;
            }
            const w10 = 10 / n;
            for (let k = 0; k < n; k++) {
                const c0 = d * 10 + k * w10, c1 = c0 + w10;
                const x = xs[c0] + gap, w = xs[c1] - xs[c0] - gap * (n === 1 ? 4 : 2);
                for (const [a, b] of pieces) {
                    const y = ys[a] + gap, h = ys[b] - ys[a] - gap * 2;
                    const rad = Math.min((n === 1 ? 4 : 3) * dpr, w / 3, h / 3);
                    ctx.fillStyle = PALETTE[ev.c];
                    ctx.beginPath();
                    if (hasRoundRect) ctx.roundRect(x, y, w, h, rad); else ctx.rect(x, y, w, h);
                    ctx.fill();
                    const fs = big * dpr, pad = Math.round((n === 1 ? 6 : 4) * dpr);
                    ctx.fillStyle = INK[ev.c];
                    if (h < fs + 3 * dpr || w < 26 * dpr) {
                        if (w >= 7 * dpr) ctx.fillRect(x + 2 * dpr, y + 3 * dpr, Math.round(w * 0.55), Math.max(1, Math.round(dpr)));
                        continue;
                    }
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(x, y, w - pad / 2, h);
                    ctx.clip();
                    const first = a === r0 || n === 1;
                    const two = h >= fs * 2.6 + 4 * dpr;
                    ctx.font = `500 ${fs}px Roboto, Arial, sans-serif`;
                    if (two || !first) {
                        ctx.fillText(ev.title, x + pad, y + Math.round(3 * dpr));
                        if (two && first) {
                            ctx.font = `400 ${fs}px Roboto, Arial, sans-serif`;
                            ctx.fillText(ev.when, x + pad, y + Math.round(3 * dpr) + fs * 1.3);
                        }
                    } else {
                        ctx.fillText(ev.title + ', ' + ev.when.split(' – ')[0], x + pad, y + Math.round(2 * dpr));
                    }
                    ctx.restore();
                }
            }
        }
    }

    // ---------------------------------------------------------------- timeline
    const waveStep = (c, r) => Math.min(7, Math.floor(((c / L.cols) * 0.62 + (r / L.rows) * 0.38) * 8));

    function scene(t) {
        const { cols, rows } = L;
        const waveK = (from) => Math.floor((t - from) / STEP);
        if (t < P.split2 || t >= P.normal) return { key: 'n', draw: () => drawEvents(1) };
        if (t < P.split5) return { key: 's2', draw: () => drawEvents(2) };
        if (t < P.split10) return { key: 's5', draw: () => drawEvents(5) };
        if (t < P.flood) return { key: 'pc', draw: () => drawCells((c, r) => L.pixelCal[c * rows + r]) };
        if (t < P.letters) {
            const k = waveK(P.flood);
            return { key: 'f' + k, draw: () => drawCells((c, r) => (waveStep(c, r) <= k ? FIELD : L.pixelCal[c * rows + r])) };
        }
        const danceReady = dance && L.samples;
        if (t < P.dance || !danceReady) {
            const blocks = L.letterBlocks;
            let n = 0;
            while (n < blocks.length && blocks[n].at <= t) n++;
            return {
                key: 'L' + n, draw: () => {
                    const on = new Uint8Array(cols * rows);
                    for (let i = 0; i < n; i++) { const b = blocks[i]; for (let r = Math.max(0, b.r0); r < Math.min(rows, b.r1); r++) on[b.c * rows + r] = 1; }
                    drawCells((c, r) => (on[c * rows + r] ? COL.basil : FIELD));
                },
            };
        }
        const last = dance.frames.length - 1;
        if (t < P.danceEnd) {
            const f = Math.min(last, Math.floor((t - P.dance) * dance.fps));
            return { key: 'd' + f, draw: () => { const cells = danceCells(f); drawCells((c, r) => cells[c * rows + r]); } };
        }
        if (t < P.merge5) {
            const k = waveK(P.danceEnd);
            return {
                key: 'm' + k, draw: () => {
                    const cells = danceCells(last);
                    drawCells((c, r) => (waveStep(c, r) <= k ? L.pixelCal[c * rows + r] : cells[c * rows + r]));
                },
            };
        }
        if (t < P.merge2) return { key: 's5', draw: () => drawEvents(5) };
        return { key: 's2', draw: () => drawEvents(2) };
    }

    function cycleTime() {
        const a = window.CalendarAudio && CalendarAudio.time();
        const raw = a !== null && a !== undefined ? a : (performance.now() - wallStart) / 1000;
        const len = (window.CalendarAudio && CalendarAudio.loopLength()) || LOOP;
        return ((raw % len) + len) % len;
    }

    function render(t) {
        const s = scene(t);
        if (s.key === lastKey) return;
        lastKey = s.key;
        background();
        s.draw();
        nowLine();
    }

    // ?t=<seconds> pins the cycle to one moment (stills, debugging)
    let frozen = parseFloat(new URLSearchParams(location.search).get('t'));
    if (!Number.isFinite(frozen)) frozen = null;

    function tick() {
        render(reduceMotion.matches ? P.dance - 0.01 : frozen !== null ? frozen : cycleTime());
        requestAnimationFrame(tick);
    }

    // ---------------------------------------------------------------- data
    async function loadDance(url) {
        const res = await fetch(url);
        let buf = new Uint8Array(await res.arrayBuffer());
        if (buf[0] === 0x1f && buf[1] === 0x8b) {
            if (typeof DecompressionStream === 'undefined') return;
            const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
            buf = new Uint8Array(await new Response(stream).arrayBuffer());
        }
        const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
        if (String.fromCharCode(buf[0], buf[1], buf[2], buf[3]) !== 'GCD1') return;
        const w = dv.getUint16(5, true), h = dv.getUint16(7, true), n = dv.getUint16(9, true);
        const fps = dv.getUint16(11, true) / 100, np = buf[13];
        // Map the file's palette onto ours by nearest colour so the two can never drift apart silently
        const ours = PALETTE.map(rgbOf), remap = new Uint8Array(256);
        for (let i = 0; i < np; i++) {
            const r = buf[14 + i * 3], g = buf[15 + i * 3], b = buf[16 + i * 3];
            let best = 0, bd = 1e9;
            ours.forEach(([R, G, B], j) => { const d = (r - R) ** 2 + (g - G) ** 2 + (b - B) ** 2; if (d < bd) { bd = d; best = j; } });
            remap[i] = best;
        }
        let p = 14 + np * 3;
        const frames = [];
        for (let f = 0; f < n; f++) {
            const fr = new Uint8Array(w * h);
            for (let i = 0; i < fr.length;) {
                const run = buf[p++], v = remap[buf[p++]];
                fr.fill(v, i, i + run);
                i += run;
            }
            frames.push(fr);
        }
        dance = { w, h, fps, frames };
        if (L) { buildSampler(); lastKey = ''; }
    }

    // ---------------------------------------------------------------- boot
    layout();
    let resizeRaf = 0;
    window.addEventListener('resize', () => {
        cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(layout);
    });
    reduceMotion.addEventListener?.('change', () => { lastKey = ''; });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { lastKey = ''; });

    loadDance('data/calendar-dance.bin').catch(() => {});

    if (window.CalendarAudio) {
        CalendarAudio.onStart(() => {
            snack.hidden = true;
            lastKey = '';
        });
        CalendarAudio.init('audio/calendar-loop.mp3', LOOP).catch(() => {});
        // Only surface the hint if the browser actually held autoplay back
        setTimeout(() => { if (CalendarAudio.isBlocked()) snack.hidden = false; }, 900);
    }

    window.__calendarContact = {
        P, LOOP, BEAT,
        time: cycleTime,
        scene: (t) => scene(t).key,
        freeze: (t) => { frozen = t; lastKey = ''; },
        bench: (t) => { const a = performance.now(); lastKey = ''; render(t); return performance.now() - a; },
        ready: () => !!(dance && L.samples),
    };
    requestAnimationFrame(tick);
})();
