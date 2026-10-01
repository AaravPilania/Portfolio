// Contact page: a Google Calendar week that refines into a 15-minute slot mosaic, books "I'M BUSY RN" glyph by glyph,
// coarsens back to a week, plays a dance clip through the event palette while the grid refines again, and coarsens into an
// ordinary week before the loop. Every change is a hard state swap on the 137 BPM grid; one 17 s cycle locked to the
// soundtrack loop.
(() => {
    'use strict';

    const LOOP = 17;
    const BEAT = 60 / 137.01;
    const T0 = 0.09; // first kick of the audio excerpt
    const STEP = BEAT / 8; // a 32nd note: the pace of the resolution steps
    const beat = (n) => T0 + n * BEAT;
    const DANCE_FPS = 30;
    const GLYPH_BEATS = [2, 2.5, 3, 4, 5, 5.5, 6.5, 7, 8]; // I ' M  B U S Y  R N
    const T = {
        refine: beat(1), empty: beat(1) + 3 * STEP, text: beat(GLYPH_BEATS[0]), textFull: beat(GLYPH_BEATS[8]),
        coarsen: beat(9.5), coarse: beat(9.5) + 3 * STEP, dance: beat(11), refine3: beat(17), refine5: beat(17.5),
        fine: beat(19), outro: beat(37), outroCoarse: beat(37) + 3 * STEP, week: beat(37.5),
    };
    const GLYPH_T = new Float64Array(GLYPH_BEATS.map(beat));

    // Google Calendar event colours; order matches DISPLAY in scratch/calendar/build-dance.js
    const PALETTE = ['#53b44b', '#0b8043', '#616161', '#fbfbfb', '#a6c1f6', '#7986cb', '#5482eb', '#3f51b5', '#039be5',
        '#d50000', '#f4511e', '#f6bf26', '#e67c73'];
    const NP = PALETTE.length;
    const FIELD = 0, BASIL = 1;
    const COL = { field: 0, basil: 1, graphite: 2, lavender: 5, blueberry: 7, peacock: 8, tomato: 9, tangerine: 10, banana: 11, flamingo: 12 };
    const GAP_BG = '#d4f5da';
    const rgbOf = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const DARK_INK = PALETTE.map((h) => { const [r, g, b] = rgbOf(h); return 0.299 * r + 0.587 * g + 0.114 * b > 125; });
    const INK = ['rgba(255,255,255,0.9)', 'rgba(32,33,36,0.78)'];

    const DAYS = [['Sun', 19], ['Mon', 20], ['Tue', 21], ['Wed', 22], ['Thu', 23], ['Fri', 24], ['Sat', 25]];
    const TODAY = 1;
    const NOW_HOUR = 12.5;
    const SUB = 7; // sub-columns per day at full resolution

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
        return { day, s, e: s + min / 15, title, c: COL[colour] };
    });
    const FILLERS = ['Hold', 'Prep', 'Email', 'Busy', 'Read', 'Notes'];
    // Mosaic titles: whole on day-wide events, truncated to a few letters on the slot grid
    const TITLES = ['Sync', 'Focus Time', 'Lunch', '1:1', 'Standup', 'Design Review', 'Q3 Planning', 'All Hands', 'Code Review',
        'Retro', 'Deep Work', 'Coffee Chat', 'Hiring Sync', 'Office Hours', 'Planning', 'Gym', 'Weekly', 'Product Review',
        'Mentoring', 'Team Lunch', 'Demo', 'Email', 'Notes', 'Prep'];

    // Block glyphs: '#' is a booked slot (one sub-column by 15 minutes)
    const GLYPHS = {
        I: ['######', '######', '..##..', '..##..', '..##..', '..##..', '######', '######'],
        "'": ['##', '##', '#.', '..', '..', '..', '..', '..'],
        M: ['##......##', '###....###', '####..####', '##.####.##', '##..##..##', '##......##', '##......##', '##......##'],
        B: ['#######.', '########', '##....##', '#######.', '#######.', '##....##', '########', '#######.'],
        U: ['##....##', '##....##', '##....##', '##....##', '##....##', '##....##', '########', '.######.'],
        S: ['.#######', '########', '##......', '#######.', '.#######', '......##', '########', '#######.'],
        Y: ['##......##', '###....###', '.###..###.', '..######..', '...####...', '....##....', '....##....', '....##....'],
        R: ['#######.', '########', '##....##', '########', '#######.', '##..###.', '##...###', '##....##'],
        N: ['##.....##', '###....##', '####...##', '##.##..##', '##..##.##', '##...####', '##....###', '##.....##'],
    };
    const LINES = ["I'M", 'BUSY', 'RN'];

    // Resolution levels: S sub-columns per day, q slots per cell
    const LV = [
        { S: 7, q: 1 }, // 0 full
        { S: 5, q: 1 }, // 1
        { S: 3, q: 2 }, // 2
        { S: 2, q: 4 }, // 3 hour-merged
        { S: 1, q: 4 }, // 4 one column per day, hour cells
        { S: 1, q: 1 }, // 5 one column per day, 15-minute slices
        { S: 3, q: 1 }, // 6
    ];
    const M_WEEK = 0, M_EMPTY = 1, M_TEXT = 2, M_DANCE = 3, M_WEEKGRID = 4;

    const canvas = document.getElementById('gcCanvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    const daysEl = document.getElementById('gcDays');
    const timesEl = document.getElementById('gcTimes');
    const snack = document.getElementById('gcSnack');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let G = null;          // layout
    let dance = null;      // { w, h, n, frames: Uint8Array(n*w*h) } in PALETTE indices
    let lastKey = -1;
    let wallStart = performance.now();

    // ---------------------------------------------------------------- layout
    function layout() {
        const vw = window.innerWidth, vh = window.innerHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const mobile = vw < 700;
        const top = mobile ? 52 : 56, dayH = mobile ? 50 : 58, gutter = mobile ? 34 : 56;
        const y0 = top + dayH, gw = vw - gutter, gh = vh - y0;
        const pitch = gw / (7 * SUB);
        // The reel's slots are ~0.9 as tall as a sub-column is wide; keep that as far as 8-12 visible hours allow
        const hours = Math.max(8, Math.min(12, Math.round(gh / (4 * pitch * 0.91))));
        const startHour = Math.max(7, Math.min(9, Math.round(12.5 - hours / 2)));
        const R = hours * 4, slotH = gh / R, dayW = gw / 7;
        const ys = new Int32Array(R + 1);
        for (let r = 0; r <= R; r++) ys[r] = Math.round(r * slotH * dpr);
        const gx = Math.max(1, Math.round(pitch * dpr * 0.11));
        const gy = Math.max(1, Math.round(slotH * dpr * 0.1));
        const fs = Math.max(7, Math.min(11, Math.round(Math.min(pitch, slotH) * 0.33)));
        G = {
            vw, vh, dpr, mobile, top, dayH, gutter, y0, gw, gh, pitch, hours, startHour, R, slotH, dayW, ys, gx, gy, fs,
            W: Math.round(vw * dpr), H: Math.round(gh * dpr),
            cr: pitch * dpr >= 24 ? 2 : 1,
            padX: Math.max(1, Math.round(2.5 * dpr)), padY: Math.max(1, Math.round(2 * dpr)),
            labelH: Math.ceil(fs * 1.3 * dpr),
        };
        G.levels = LV.map(buildLevel);

        canvas.width = G.W;
        canvas.height = G.H;
        canvas.style.width = vw + 'px';
        canvas.style.height = gh + 'px';
        const root = document.documentElement.style;
        root.setProperty('--gc-top', top + 'px');
        root.setProperty('--gc-dayh', dayH + 'px');
        root.setProperty('--gc-gutter', gutter + 'px');

        let html = '<div class="gc-tz">GMT+05:30</div>';
        for (let d = 0; d < 7; d++) {
            html += `<div class="gc-day${d === TODAY ? ' is-today' : ''}"><span class="gc-day__name">${DAYS[d][0]}</span><span class="gc-day__num">${DAYS[d][1]}</span></div>`;
        }
        daysEl.innerHTML = html;
        let th = '';
        for (let h = 0; h < hours; h++) {
            const hh = startHour + h;
            th += `<div class="gc-time" style="top:${(h * 4 * slotH).toFixed(2)}px">${((hh + 11) % 12) + 1} ${hh < 12 ? 'AM' : 'PM'}</div>`;
        }
        timesEl.innerHTML = th;

        const cells = 7 * SUB * R;
        G.evC = new Uint8Array(cells); G.evX = new Int32Array(cells); G.evY = new Int32Array(cells);
        G.evW = new Int32Array(cells); G.evH = new Int32Array(cells); G.evT = new Uint8Array(cells); G.evR = new Uint8Array(cells);
        G.order = new Uint16Array(cells); G.bucket = new Uint16Array(NP + 1);
        G.cellCol = new Uint8Array(cells); G.cellKey = new Int16Array(cells);
        G.fine = new Uint8Array(cells); G.fineFrame = -1;
        G.votes = new Uint16Array(NP);

        buildWeek();
        buildGlyphs();
        buildSampler();
        buildAtlas();
        G.weekCache = null;
        lastKey = -1;
    }

    // Column edges, free-time event breaks (random 1-8 slot lengths, realigned every 2 hours) and the fine-column span
    // each cell votes over
    function buildLevel({ S, q }, li) {
        const { gutter, dayW, dpr, R, startHour } = G;
        const C = 7 * S, Rq = R / q;
        const xs = new Int32Array(C + 1);
        for (let k = 0; k <= C; k++) xs[k] = Math.round((gutter + (Math.floor(k / S) + (k % S) / S) * dayW) * dpr);
        const f0 = new Uint8Array(C), f1 = new Uint8Array(C);
        for (let k = 0; k < C; k++) {
            const d = Math.floor(k / S), s = k % S;
            f0[k] = d * SUB + Math.floor(s * SUB / S);
            f1[k] = d * SUB + Math.floor((s + 1) * SUB / S);
        }
        let seed = 97 + li * 131;
        const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        const brkField = new Uint8Array(C * Rq), brkInk = new Uint8Array(C * Rq);
        const fineInk = q === 1 && S >= 5;
        for (let c = 0; c < C; c++) {
            for (let r = 0; r < Rq; r++) {
                const slot = startHour * 4 + r * q;
                if (slot % 8 === 0 || r === 0) {
                    brkField[c * Rq + r] = 1;
                    brkInk[c * Rq + r] = 1;
                    let len = 1;
                    while (r + len < Rq && (startHour * 4 + (r + len) * q) % 8) len++;
                    if (len > 1) {
                        const cuts = len >= 6 ? (rand() < 0.6 ? 1 : 2) : rand() < 0.6 ? 1 : 0;
                        for (let k = 0; k < cuts; k++) brkField[c * Rq + r + 1 + Math.floor(rand() * (len - 1))] = 1;
                    }
                }
                if (fineInk && (slot + c) % 2 === 0) brkInk[c * Rq + r] = 1;
            }
        }
        const labelW = Math.max(1, Math.floor(dayW * dpr / S) - G.gx - G.padX);
        return { S, q, C, Rq, xs, f0, f1, brkField, brkInk, labelW };
    }

    // The ordinary week: events plus free-time fillers so every slot in view is booked
    function buildWeek() {
        const { R, startHour } = G;
        const lo = startHour * 4, hi = lo + R;
        const list = [];
        let fill = 0;
        for (let d = 0; d < 7; d++) {
            const day = EVENTS.filter((e) => e.day === d && e.e > lo && e.s < hi).sort((a, b) => a.s - b.s);
            let at = lo;
            for (const e of day) {
                if (e.s > at) list.push({ day: d, s: at, e: e.s, title: FILLERS[fill++ % FILLERS.length], c: FIELD });
                list.push(e);
                at = Math.max(at, e.e);
            }
            if (at < hi) list.push({ day: d, s: at, e: hi, title: FILLERS[fill++ % FILLERS.length], c: FIELD });
        }
        const id = new Int16Array(7 * R);
        list.forEach((e, i) => {
            for (let s = Math.max(lo, e.s); s < Math.min(hi, e.e); s++) id[e.day * R + s - lo] = i;
        });
        G.week = list;
        G.weekId = id;
        G.weekCol = Uint8Array.from(list, (e) => e.c);
    }

    function buildGlyphs() {
        const { R } = G;
        const C = 7 * SUB;
        const width = (s) => [...s].reduce((w, ch, i) => w + GLYPHS[ch][0].length + (i ? (ch === "'" || s[i - 1] === "'" ? 1 : 2) : 0), 0);
        const gap = Math.max(1, Math.min(6, Math.floor((R - 24) / 4)));
        let y = Math.floor((R - (24 + gap * 2)) / 2);
        const glyph = new Uint8Array(C * R);
        let n = 0;
        for (const line of LINES) {
            let x = Math.round((C - width(line)) / 2);
            [...line].forEach((ch, i) => {
                if (i) x += ch === "'" || line[i - 1] === "'" ? 1 : 2;
                const g = GLYPHS[ch];
                n++;
                for (let gy = 0; gy < 8; gy++) for (let gx = 0; gx < g[0].length; gx++) {
                    const c = x + gx, r = y + gy;
                    if (g[gy][gx] === '#' && c >= 0 && c < C && r >= 0 && r < R) glyph[c * R + r] = n;
                }
                x += g[0].length;
            });
            y += 8 + gap;
        }
        G.glyph = glyph;
    }

    // Each fine cell votes over 3x3 samples of the clip; the clip's 4:3 canvas is fitted to the grid height (overscanning
    // narrow screens up to 1.6x their width)
    function buildSampler() {
        G.samples = null;
        if (!dance) return;
        const { R, gw, gh, pitch, slotH } = G;
        const C = 7 * SUB;
        // Landscape grids are wider than the reel's 1.26 card, so the clip is widened a little to fill comparable ground
        const aspect = dance.w / dance.h * (gw > gh ? 1.15 : 1);
        const dw = Math.min(gh * aspect, gw * 1.6), dh = dw / aspect;
        const vx = (gw - dw) / 2, vy = (gh - dh) / 2;
        const s = new Int32Array(C * R * 9);
        for (let c = 0; c < C; c++) for (let r = 0; r < R; r++) {
            for (let k = 0; k < 9; k++) {
                const px = (c + ((k % 3) + 0.5) / 3) * pitch, py = (r + (Math.floor(k / 3) + 0.5) / 3) * slotH;
                const u = Math.floor((px - vx) / dw * dance.w), v = Math.floor((py - vy) / dh * dance.h);
                s[(c * R + r) * 9 + k] = u < 0 || v < 0 || u >= dance.w || v >= dance.h ? -1 : v * dance.w + u;
            }
        }
        G.samples = s;
        G.fineFrame = -1;
    }

    // Title sprites (both inks) and start-time sprites for every slot, at the widest event width; narrower events blit a
    // left-aligned slice, so the mosaic never calls fillText per frame
    function buildAtlas() {
        const { labelH, fs, dpr, padX, R, startHour } = G;
        const atlas = document.createElement('canvas');
        atlas.width = Math.max(...G.levels.map((l) => l.labelW));
        atlas.height = (TITLES.length + R) * 2 * labelH;
        const a = atlas.getContext('2d');
        a.textBaseline = 'top';
        const dy = Math.round(0.1 * fs * dpr);
        a.font = `500 ${fs * dpr}px Roboto, Arial, sans-serif`;
        TITLES.forEach((t, i) => {
            for (let ink = 0; ink < 2; ink++) { a.fillStyle = INK[ink]; a.fillText(t, 0, (i * 2 + ink) * labelH + dy); }
        });
        a.font = `400 ${fs * dpr}px Roboto, Arial, sans-serif`;
        for (let r = 0; r < R; r++) {
            const min = (startHour * 4 + r) * 15, h = Math.floor(min / 60);
            const t = ((h + 11) % 12) + 1 + ':' + String(min % 60).padStart(2, '0') + (h < 12 ? ' AM' : ' PM');
            for (let ink = 0; ink < 2; ink++) { a.fillStyle = INK[ink]; a.fillText(t, 0, ((TITLES.length + r) * 2 + ink) * labelH + dy); }
        }
        G.atlas = atlas;
        G.minLabelW = Math.round(8 * dpr) - padX;
    }

    // ---------------------------------------------------------------- content
    function danceFine(f) {
        if (G.fineFrame === f) return;
        const { R } = G;
        const n = 7 * SUB * R, s = G.samples, out = G.fine, votes = G.votes;
        const base = f * dance.w * dance.h, fr = dance.frames;
        for (let i = 0; i < n; i++) {
            votes.fill(0);
            for (let k = 0; k < 9; k++) {
                const idx = s[i * 9 + k];
                const v = idx < 0 ? FIELD : fr[base + idx];
                votes[v] += v === FIELD ? 8 : 10;
            }
            let best = 0;
            for (let v = 1; v < NP; v++) if (votes[v] > votes[best]) best = v;
            out[i] = best;
        }
        G.fineFrame = f;
    }

    function textFine(g) {
        const { R } = G;
        const n = 7 * SUB * R, glyph = G.glyph, out = G.fine;
        for (let i = 0; i < n; i++) out[i] = glyph[i] && glyph[i] <= g ? BASIL : FIELD;
        G.fineFrame = -2 - g;
    }

    // Cell colours and merge keys for one level
    function fillCells(lv, mode) {
        const { R } = G;
        const { C, Rq, q, f0, f1 } = lv;
        const col = G.cellCol, key = G.cellKey, fine = G.fine, votes = G.votes;
        for (let c = 0; c < C; c++) {
            const d = Math.floor(c / lv.S);
            for (let r = 0; r < Rq; r++) {
                const i = c * Rq + r;
                if (mode === M_WEEKGRID) {
                    const id = G.weekId[d * R + r * q];
                    col[i] = G.weekCol[id]; key[i] = id;
                } else if (mode === M_EMPTY) {
                    col[i] = FIELD; key[i] = FIELD;
                } else if (lv.S === SUB && q === 1) {
                    col[i] = key[i] = fine[c * R + r];
                } else {
                    votes.fill(0);
                    for (let fc = f0[c]; fc < f1[c]; fc++) for (let fr = r * q; fr < r * q + q; fr++) {
                        const v = fine[fc * R + fr];
                        votes[v] += v === FIELD ? 7 : 10;
                    }
                    let best = 0;
                    for (let v = 1; v < NP; v++) if (votes[v] > votes[best]) best = v;
                    col[i] = key[i] = best;
                }
            }
        }
    }

    // ---------------------------------------------------------------- drawing
    function clearGrid() {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, G.W, G.H);
        const x0 = G.levels[0].xs[0];
        ctx.fillStyle = GAP_BG;
        ctx.fillRect(x0, 0, G.W - x0, G.H);
    }

    function drawMosaic(lv) {
        const { ys, gx, gy, cr, padX, padY, labelH, minLabelW } = G;
        const { C, Rq, q, xs, brkField, brkInk } = lv;
        const col = G.cellCol, key = G.cellKey;
        const EC = G.evC, EX = G.evX, EY = G.evY, EW = G.evW, EH = G.evH, ET = G.evT;
        const gxa = gx >> 1, gxb = gx - gxa, gya = gy >> 1, gyb = gy - gya;
        let n = 0;
        for (let c = 0; c < C; c++) {
            const x = xs[c] + gxb, w = xs[c + 1] - xs[c] - gx;
            let r = 0;
            while (r < Rq) {
                const i0 = c * Rq + r, v = col[i0], k = key[i0], brk = v === FIELD ? brkField : brkInk;
                let e = r + 1;
                while (e < Rq && key[c * Rq + e] === k && !brk[c * Rq + e]) e++;
                const y = ys[r * q] + gyb;
                EC[n] = v; EX[n] = x; EY[n] = y; EW[n] = w;
                EH[n] = ys[e * q] - ys[r * q] - gy - ((e * q + G.startHour * 4) % 4 === 0 && e < Rq ? 1 : 0);
                ET[n] = (c * 7 + r * 13 + k * 5) % TITLES.length;
                G.evR[n] = r * q;
                n++;
                r = e;
            }
        }
        // counting sort by colour so each fill colour is set once
        const bucket = G.bucket, order = G.order;
        bucket.fill(0);
        for (let i = 0; i < n; i++) bucket[EC[i] + 1]++;
        for (let v = 0; v < NP; v++) bucket[v + 1] += bucket[v];
        for (let i = 0; i < n; i++) order[bucket[EC[i]]++] = i;
        let cur = -1;
        for (let j = 0; j < n; j++) {
            const i = order[j];
            if (EC[i] !== cur) { cur = EC[i]; ctx.fillStyle = PALETTE[cur]; }
            const x = EX[i], y = EY[i], w = EW[i], h = EH[i];
            if (w <= cr * 2 || h <= cr * 2) { ctx.fillRect(x, y, w, h); continue; }
            ctx.fillRect(x + cr, y, w - cr * 2, h);
            ctx.fillRect(x, y + cr, w, h - cr * 2);
            if (cr === 2) ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
        }
        const atlas = G.atlas, lw = lv.labelW, ER = G.evR, timeRow = TITLES.length * 2, timed = lv.S <= 3;
        if (lw >= minLabelW) {
            for (let i = 0; i < n; i++) {
                if (EH[i] < labelH * 0.8 + padY) continue;
                const sw = Math.min(lw, EW[i] - padX - 1);
                if (sw <= 0) continue;
                const sh = Math.min(labelH, EH[i] - padY), ink = DARK_INK[EC[i]] ? 1 : 0;
                ctx.drawImage(atlas, 0, (ET[i] * 2 + ink) * labelH, sw, sh, EX[i] + padX, EY[i] + padY, sw, sh);
                if (timed && EH[i] >= labelH * 2 + padY) {
                    ctx.drawImage(atlas, 0, (timeRow + ER[i] * 2 + ink) * labelH, sw, labelH, EX[i] + padX, EY[i] + padY + labelH, sw, labelH);
                }
            }
        } else {
            // too narrow for letters: the title reads as a dash, as it does in the app at this size
            const line = Math.max(1, Math.round(G.dpr * 0.75));
            cur = -1;
            for (let i = 0; i < n; i++) {
                if (EH[i] < padY * 2 + line) continue;
                const ink = DARK_INK[EC[i]] ? 1 : 0;
                if (ink !== cur) { cur = ink; ctx.fillStyle = INK[ink]; }
                ctx.fillRect(EX[i] + 1, EY[i] + padY, Math.max(1, Math.round(EW[i] * 0.6)), line);
            }
        }
    }

    function nowLine() {
        const { dpr, slotH, startHour, R } = G;
        const y = Math.round((NOW_HOUR - startHour) * 4 * slotH * dpr);
        if (y < 0 || y > Math.round(R * slotH * dpr)) return;
        const xs = G.levels[0].xs, x0 = xs[TODAY * SUB], x1 = xs[TODAY * SUB + SUB];
        ctx.fillStyle = '#ea4335';
        ctx.fillRect(x0, y - Math.round(dpr), x1 - x0, Math.max(2, Math.round(2 * dpr)));
        ctx.beginPath();
        ctx.arc(x0, y, 5 * dpr, 0, Math.PI * 2);
        ctx.fill();
    }

    // The ordinary week: whole events with title and time, cached because it is shown on both sides of the loop seam
    function drawWeek() {
        if (!G.weekCache) {
            const off = document.createElement('canvas');
            off.width = G.W; off.height = G.H;
            const c = off.getContext('2d', { alpha: false });
            const { ys, dpr, gx, gy, startHour, R } = G;
            const xs = G.levels[4].xs, lo = startHour * 4;
            c.fillStyle = '#fff';
            c.fillRect(0, 0, G.W, G.H);
            c.fillStyle = GAP_BG;
            c.fillRect(xs[0], 0, G.W - xs[0], G.H);
            const fs = Math.round((G.mobile ? 9 : 12) * dpr), pad = Math.round((G.mobile ? 2 : 6) * dpr);
            c.textBaseline = 'top';
            for (const ev of G.week) {
                const r0 = Math.max(0, ev.s - lo), r1 = Math.min(R, ev.e - lo);
                const x = xs[ev.day] + (gx - (gx >> 1)), w = xs[ev.day + 1] - xs[ev.day] - gx;
                const y = ys[r0] + (gy - (gy >> 1)), h = ys[r1] - ys[r0] - gy;
                c.fillStyle = PALETTE[ev.c];
                c.beginPath();
                if (c.roundRect) c.roundRect(x, y, w, h, Math.min(4 * dpr, h / 3)); else c.rect(x, y, w, h);
                c.fill();
                if (h < fs + 2 * dpr) continue;
                c.save();
                c.beginPath();
                c.rect(x, y, w - pad / 2, h);
                c.clip();
                c.fillStyle = INK[DARK_INK[ev.c] ? 1 : 0];
                c.font = `500 ${fs}px Roboto, Arial, sans-serif`;
                c.fillText(ev.title, x + pad, y + Math.round(3 * dpr));
                if (h >= fs * 2.6 + 4 * dpr) {
                    c.font = `400 ${fs}px Roboto, Arial, sans-serif`;
                    c.fillText(span(ev.s * 15, ev.e * 15), x + pad, y + Math.round(3 * dpr) + fs * 1.3);
                }
                c.restore();
            }
            G.weekCache = off;
        }
        ctx.drawImage(G.weekCache, 0, 0);
    }

    function clock(min, withSuffix) {
        const h = Math.floor(min / 60) % 24, m = min % 60, h12 = ((h + 11) % 12) + 1;
        return h12 + (m ? ':' + String(m).padStart(2, '0') : '') + (withSuffix ? (h < 12 ? 'am' : 'pm') : '');
    }
    function span(a, b) {
        const sameHalf = (Math.floor(a / 60) < 12) === (Math.floor(b / 60) < 12);
        return clock(a, !sameHalf) + ' – ' + clock(b, true);
    }

    // ---------------------------------------------------------------- timeline
    // A scene is (mode, level, argument), packed into one number so the per-frame check allocates nothing
    let sMode = 0, sLevel = 0, sArg = 0;
    const stepIn = (t, from) => Math.floor((t - from) / STEP);
    const COARSEN = [1, 2, 3, 4];

    function scene(t) {
        const ready = dance && G.samples;
        sArg = 0;
        if (t < T.refine || t >= T.week) { sMode = M_WEEK; sLevel = 0; }
        else if (t < T.empty) { sMode = M_WEEKGRID; sLevel = [2, 1, 0][stepIn(t, T.refine)]; }
        else if (t < T.text) { sMode = M_EMPTY; sLevel = 0; }
        else if (t < T.dance || !ready) {
            sMode = M_TEXT;
            let g = 0;
            while (g < 9 && GLYPH_T[g] <= t) g++;
            sArg = g;
            sLevel = t < T.coarsen || t >= T.dance ? 0 : COARSEN[Math.min(3, stepIn(t, T.coarsen))];
        } else {
            sMode = M_DANCE;
            sArg = Math.max(0, Math.min(dance.n - 1, Math.floor((t - T.dance) * DANCE_FPS)));
            sLevel = t < T.refine3 ? 5 : t < T.refine5 ? 6 : t < T.fine ? 1 : t < T.outro ? 0 : COARSEN[Math.min(3, stepIn(t, T.outro))];
        }
        return sMode * 100000 + sLevel * 10000 + sArg;
    }

    function cycleTime(now) {
        const a = window.CalendarAudio && CalendarAudio.timeAt(now);
        const raw = a !== null && a !== undefined ? a : (now - wallStart) / 1000;
        const len = (window.CalendarAudio && CalendarAudio.loopLength()) || LOOP;
        return ((raw % len) + len) % len;
    }

    function render(t) {
        const key = scene(t);
        if (key === lastKey) return false;
        lastKey = key;
        if (sMode === M_WEEK) drawWeek();
        else {
            const lv = G.levels[sLevel];
            if (sMode === M_DANCE) danceFine(sArg);
            else if (sMode === M_TEXT && G.fineFrame !== -2 - sArg) textFine(sArg);
            fillCells(lv, sMode);
            clearGrid();
            drawMosaic(lv);
        }
        nowLine();
        return true;
    }

    // ?t=<seconds> pins the cycle to one moment (stills, debugging)
    let frozen = parseFloat(new URLSearchParams(location.search).get('t'));
    if (!Number.isFinite(frozen)) frozen = null;

    // Rolling cost of render() on frames that drew, and rAF deltas, for the perf check
    const PERF_N = 4096;
    const perfDraw = new Float32Array(PERF_N), perfDelta = new Float32Array(PERF_N);
    let perfI = 0, perfJ = 0, lastTs = 0;

    function tick(ts) {
        const a = performance.now();
        const drew = render(reduceMotion.matches ? T.textFull : frozen !== null ? frozen : cycleTime(ts));
        if (drew) perfDraw[perfI++ % PERF_N] = performance.now() - a;
        if (lastTs) perfDelta[perfJ++ % PERF_N] = ts - lastTs;
        lastTs = ts;
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
        if (String.fromCharCode(buf[0], buf[1], buf[2], buf[3]) !== 'GCD2') return;
        const w = dv.getUint16(5, true), h = dv.getUint16(7, true), n = dv.getUint16(9, true), np = buf[13];
        // Map the file's palette onto ours by nearest colour so the two can never drift apart silently
        const ours = PALETTE.map(rgbOf), remap = new Uint8Array(256);
        for (let i = 0; i < np; i++) {
            const r = buf[14 + i * 3], g = buf[15 + i * 3], b = buf[16 + i * 3];
            let best = 0, bd = 1e9;
            ours.forEach(([R, Gg, B], j) => { const d = (r - R) ** 2 + (g - Gg) ** 2 + (b - B) ** 2; if (d < bd) { bd = d; best = j; } });
            remap[i] = best;
        }
        const p = 14 + np * 3, size = w * h;
        const raw = buf.subarray(p, p + n * size), frames = new Uint8Array(n * size);
        for (let i = 0; i < size; i++) frames[i] = raw[i];
        for (let i = size; i < n * size; i++) frames[i] = raw[i] ^ frames[i - size];
        for (let i = 0; i < n * size; i++) frames[i] = remap[frames[i]];
        dance = { w, h, n, frames };
        if (G) { buildSampler(); lastKey = -1; }
    }

    // ---------------------------------------------------------------- boot
    layout();
    let resizeRaf = 0;
    window.addEventListener('resize', () => {
        cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(layout);
    });
    reduceMotion.addEventListener?.('change', () => { lastKey = -1; });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { buildAtlas(); G.weekCache = null; lastKey = -1; });

    loadDance('data/calendar-dance.bin').catch(() => {});

    if (window.CalendarAudio) {
        CalendarAudio.onStart(() => {
            snack.hidden = true;
            lastKey = -1;
        });
        CalendarAudio.init('audio/calendar-loop.mp3', LOOP).catch(() => {});
        // Only surface the hint if the browser actually held autoplay back
        setTimeout(() => { if (CalendarAudio.isBlocked()) snack.hidden = false; }, 900);
    }

    const pct = (arr, count, p) => {
        const a = Array.from(arr.subarray(0, Math.min(count, PERF_N))).sort((x, y) => x - y);
        return a.length ? +a[Math.min(a.length - 1, Math.floor(a.length * p))].toFixed(2) : null;
    };
    window.__calendarContact = {
        P: T, LOOP, BEAT,
        time: () => cycleTime(performance.now()),
        scene: (t) => { scene(t); return ['week', 'empty', 'text', 'dance', 'weekgrid'][sMode] + '@' + LV[sLevel].S + 'x' + LV[sLevel].q + ':' + sArg; },
        freeze: (t) => { frozen = t; lastKey = -1; },
        bench: (t) => { const a = performance.now(); lastKey = -1; render(t); return performance.now() - a; },
        ready: () => !!(dance && G.samples),
        perfReset: () => { perfI = 0; perfJ = 0; lastTs = 0; },
        perf: () => ({
            draws: perfI, drawP50: pct(perfDraw, perfI, 0.5), drawP95: pct(perfDraw, perfI, 0.95), drawMax: pct(perfDraw, perfI, 1),
            frames: perfJ, rafP50: pct(perfDelta, perfJ, 0.5), rafP95: pct(perfDelta, perfJ, 0.95), rafMax: pct(perfDelta, perfJ, 1),
            over33: Array.from(perfDelta.subarray(0, Math.min(perfJ, PERF_N))).filter((d) => d > 33.4).length,
        }),
    };
    requestAnimationFrame(tick);
})();
