(function () {
    'use strict';

    const Lab = window.Lab;
    const P = Lab.projects;
    const N = P.length;

    Lab.cursor();
    Lab.dock({ num: '06', name: 'Meer study', hint: 'Scroll to step through' });

    const section = document.getElementById('m6');
    const stepsEl = document.getElementById('m6Steps');
    const titleEl = document.getElementById('m6Title');
    const descEl = document.getElementById('m6Desc');
    const numEl = document.getElementById('m6Num');
    const ring = document.getElementById('m6RingCircle');
    const bg = document.getElementById('m6Bg');
    const view = document.getElementById('m6View');
    section.style.setProperty('--n', N);

    const RING_C = 2 * Math.PI * 35;
    ring.style.strokeDasharray = RING_C;
    ring.style.strokeDashoffset = RING_C;

    /* ---------- Reveal: Canvas2D port of the row-hover MESH_FS ---------- */
    const PRESETS = [
        { colsFactor: 8, noiseFactor: 0.071 },
        { colsFactor: 3, noiseFactor: 0.071 },
        { colsFactor: 7, noiseFactor: 0.055 },
        { colsFactor: 4, noiseFactor: 0.045 }
    ];
    const NOISE_RATIO = 1.6;
    const MEDIA_RATIO = 16 / 9;
    const PIXEL_STEPS = 20;
    const DUR_ALPHA = 1000;
    const DUR_PIXEL = 1350;

    const mod289 = (x) => x - Math.floor(x / 289) * 289;
    const permute = (x) => mod289((x * 34 + 1) * x);
    function snoise(vx, vy) {
        const Cx = 0.211324865405187, Cy = 0.366025403784439, Cz = -0.577350269189626, Cw = 0.024390243902439;
        let ix = Math.floor(vx + (vx + vy) * Cy), iy = Math.floor(vy + (vx + vy) * Cy);
        const x0x = vx - ix + (ix + iy) * Cx, x0y = vy - iy + (ix + iy) * Cx;
        const i1x = x0x > x0y ? 1 : 0, i1y = 1 - i1x;
        const x1x = x0x + Cx - i1x, x1y = x0y + Cx - i1y;
        const x2x = x0x + Cz, x2y = x0y + Cz;
        ix = mod289(ix); iy = mod289(iy);
        const p0 = permute(permute(iy) + ix);
        const p1 = permute(permute(iy + i1y) + ix + i1x);
        const p2 = permute(permute(iy + 1) + ix + 1);
        let m0 = Math.max(0.5 - (x0x * x0x + x0y * x0y), 0);
        let m1 = Math.max(0.5 - (x1x * x1x + x1y * x1y), 0);
        let m2 = Math.max(0.5 - (x2x * x2x + x2y * x2y), 0);
        m0 *= m0; m0 *= m0; m1 *= m1; m1 *= m1; m2 *= m2; m2 *= m2;
        const fr = (p) => 2 * (p * Cw - Math.floor(p * Cw)) - 1;
        const q0 = fr(p0), q1 = fr(p1), q2 = fr(p2);
        const h0 = Math.abs(q0) - 0.5, h1 = Math.abs(q1) - 0.5, h2 = Math.abs(q2) - 0.5;
        const a0 = q0 - Math.floor(q0 + 0.5), a1 = q1 - Math.floor(q1 + 0.5), a2 = q2 - Math.floor(q2 + 0.5);
        m0 *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h0 * h0);
        m1 *= 1.79284291400159 - 0.85373472095314 * (a1 * a1 + h1 * h1);
        m2 *= 1.79284291400159 - 0.85373472095314 * (a2 * a2 + h2 * h2);
        return 130 * (m0 * (a0 * x0x + h0 * x0y) + m1 * (a1 * x1x + h1 * x1y) + m2 * (a2 * x2x + h2 * x2y));
    }

    const grids = PRESETS.map((pr) => {
        const cols = 8 * pr.colsFactor, rows = Math.round(cols / NOISE_RATIO);
        const a = new Float32Array(cols * rows);
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) a[y * cols + x] = (snoise((x + 1) * pr.noiseFactor, y * pr.noiseFactor) + 1) * 0.5;
        }
        const mask = document.createElement('canvas');
        mask.width = cols; mask.height = rows;
        const mg = mask.getContext('2d');
        return { pr, cols, rows, a, mask, mg, img: mg.createImageData(cols, rows) };
    });

    const low = document.createElement('canvas');
    const lowG = low.getContext('2d');

    const easeOut2 = (t) => 1 - Math.pow(1 - t, 3);
    const easeIn1 = (t) => t * t;
    const easeOut3 = (t) => 1 - Math.pow(1 - t, 4);
    const smooth = (a, b, x) => { const t = Lab.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

    function srcOf(card) {
        const v = card.video;
        if (v && v.readyState >= 2 && v.videoWidth) return { el: v, w: v.videoWidth, h: v.videoHeight };
        const im = card.img;
        if (im && im.complete && im.naturalWidth) return { el: im, w: im.naturalWidth, h: im.naturalHeight };
        return null;
    }

    function cover(sw, sh, dw, dh) {
        const s = Math.max(dw / sw, dh / sh);
        const w = dw / s, h = dh / s;
        return [(sw - w) / 2, (sh - h) / 2, w, h];
    }

    function drawPixelated(g, src, W, H, np, colsFactor) {
        const colsT = 8 * colsFactor, rowsT = colsT / MEDIA_RATIO;
        const nc = Math.max(1, Math.round(colsT * 0.3 + (colsT * PIXEL_STEPS - colsT * 0.3) * np));
        const nr = Math.max(1, Math.round(rowsT * 0.3 + (rowsT * PIXEL_STEPS - rowsT * 0.3) * np));
        const [sx, sy, sw, sh] = cover(src.w, src.h, W, H);
        const k = smooth(0.9, 1, np);
        if (k < 1) {
            const lw = Math.min(nc, W), lh = Math.min(nr, H);
            if (low.width !== lw || low.height !== lh) { low.width = lw; low.height = lh; }
            lowG.imageSmoothingEnabled = true;
            lowG.drawImage(src.el, sx, sy, sw, sh, 0, 0, lw, lh);
            g.imageSmoothingEnabled = false;
            g.globalAlpha = 1;
            g.drawImage(low, 0, 0, lw, lh, 0, 0, W, H);
        }
        if (k > 0) {
            g.imageSmoothingEnabled = true;
            g.globalAlpha = k;
            g.drawImage(src.el, sx, sy, sw, sh, 0, 0, W, H);
            g.globalAlpha = 1;
        }
    }

    function applyMask(g, grid, prog, W, H) {
        const d = grid.img.data, a = grid.a;
        for (let i = 0; i < a.length; i++) d[i * 4 + 3] = (prog > 0.002 && a[i] < prog) ? 255 : 0;
        grid.mg.putImageData(grid.img, 0, 0);
        g.globalCompositeOperation = 'destination-in';
        g.imageSmoothingEnabled = false;
        g.drawImage(grid.mask, 0, 0, W, H);
        g.globalCompositeOperation = 'source-over';
    }

    /* ---------- Cards ---------- */
    let dpr = Math.min(1.5, window.devicePixelRatio || 1);
    let vw = innerWidth, vh = innerHeight;

    const cards = P.map((p, i) => {
        const el = document.createElement('div');
        el.className = 'm6-step';
        el.style.zIndex = String(N - i);
        const media = document.createElement('div');
        media.className = 'm6-media';
        const first = p.media[0];
        const isVideo = /\.mp4$/i.test(first);
        const ph = Lab.placeholder(p, 640, 400);
        let img = null, video = null;
        const poster = Lab.poster(p);
        img = new Image();
        img.alt = '';
        img.decoding = 'async';
        img.draggable = false;
        img.src = isVideo ? (poster || ph) : first;
        img.onerror = () => { img.onerror = null; img.src = ph; };
        media.appendChild(img);
        if (isVideo) {
            video = document.createElement('video');
            video.muted = true; video.loop = true; video.playsInline = true;
            video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
            video.preload = 'metadata';
            video.src = first + '#t=0.1';
            video.addEventListener('loadeddata', () => { el.classList.add('has-video'); card.dirty = true; });
            media.appendChild(video);
        }
        img.addEventListener('load', () => { card.dirty = true; });
        const canvas = document.createElement('canvas');
        canvas.className = 'm6-reveal';
        const g = canvas.getContext('2d');
        el.append(media, canvas);
        stepsEl.appendChild(el);
        el.addEventListener('click', () => { if (el.classList.contains('is-active') && p.url) window.open(p.url, '_blank', 'noopener'); });
        const card = {
            p, i, el, img, video, canvas, g,
            mode: 'mosaic', dirty: true, t0: 0, grid: grids[i % grids.length],
            cur: { y: 0, s: 0, o: 0 }, from: null, to: null, tStart: 0
        };
        return card;
    });

    function sizeCanvases() {
        const W = Math.round(vw * 0.45 * dpr), H = Math.round(vh * 0.5 * dpr);
        cards.forEach((c) => { if (c.canvas.width !== W || c.canvas.height !== H) { c.canvas.width = W; c.canvas.height = H; c.dirty = true; } });
    }

    function setMode(card, mode, now) {
        card.mode = mode;
        card.dirty = true;
        card.el.classList.toggle('is-sharp', mode === 'sharp');
        if (mode === 'reveal') { card.t0 = now; card.g.clearRect(0, 0, card.canvas.width, card.canvas.height); }
    }

    function renderCard(card, now) {
        const W = card.canvas.width, H = card.canvas.height, g = card.g;
        if (card.mode === 'sharp') return;
        const src = srcOf(card);
        if (card.mode === 'mosaic') {
            if (!card.dirty || !src) return;
            card.dirty = false;
            g.clearRect(0, 0, W, H);
            drawPixelated(g, src, W, H, 0, card.grid.pr.colsFactor);
            return;
        }
        const el = now - card.t0;
        const pe = easeOut2(Lab.clamp(el / DUR_ALPHA, 0, 1));
        const pp = easeIn1(Lab.clamp(el / DUR_PIXEL, 0, 1));
        if (pe >= 1 && pp >= 1) { setMode(card, 'sharp', now); return; }
        g.clearRect(0, 0, W, H);
        if (!src) return;
        drawPixelated(g, src, W, H, Math.floor(pp * PIXEL_STEPS) / PIXEL_STEPS, card.grid.pr.colsFactor);
        applyMask(g, card.grid, pe, W, H);
    }

    /* ---------- Meer's offset states ---------- */
    function Mp(r) {
        if (r === 0) return { y: 0.25, s: 1, o: 1 };
        if (r === -1) return { y: -0.10, s: 0.3, o: 0.4 };
        if (r <= -2) return { y: -0.25, s: 0, o: 0 };
        if (r === 1) return { y: 0.60, s: 0.3, o: 0.4 };
        return { y: 0.80, s: 0.1, o: 0.1 };
    }

    function target(card, st, now) {
        const to = card.to;
        if (to && to.y === st.y && to.s === st.s && to.o === st.o) return;
        card.from = { ...card.cur };
        card.to = st;
        card.tStart = now;
        if (Lab.reduced) { card.cur = { ...st }; card.from = null; }
    }

    function stepTween(card, now) {
        if (card.from) {
            const k = easeOut3(Lab.clamp((now - card.tStart) / 600, 0, 1));
            const f = card.from, t = card.to;
            card.cur.y = f.y + (t.y - f.y) * k;
            card.cur.s = f.s + (t.s - f.s) * k;
            card.cur.o = f.o + (t.o - f.o) * k;
            if (k >= 1) card.from = null;
        }
        const c = card.cur;
        card.el.style.transform = 'translate3d(0,' + (c.y * vh).toFixed(2) + 'px,0) scale(' + c.s.toFixed(4) + ')';
        card.el.style.opacity = c.o.toFixed(3);
    }

    cards.forEach((c, i) => { const st = Mp(i); c.cur = { ...st }; c.to = st; stepTween(c, 0); });

    /* ---------- Text: split words, staggered rise ---------- */
    const words = (s) => String(s).split(/\s+/).filter(Boolean).map((w) => '<span class="m6-word">' + Lab.esc(w) + '</span>').join('');
    function describe(p) {
        const head = p.client + ', 20' + p.year + '.';
        if (!p.awards.length) return head;
        return head + ' Recognised by ' + p.awards.map((a) => a[0]).join(', ') + '.';
    }
    function PM(i) {
        const p = P[i];
        titleEl.innerHTML = words(p.title);
        descEl.innerHTML = words(describe(p));
        const tw = titleEl.querySelectorAll('.m6-word');
        const dw = descEl.querySelectorAll('.m6-word');
        tw.forEach((w, k) => { w.style.transitionDuration = '0.45s'; w.style.transitionDelay = (k * 35) + 'ms'; });
        const dStart = Math.max(0, (tw.length - 1) * 35 + 450 - 200);
        dw.forEach((w, k) => { w.style.transitionDuration = '0.35s'; w.style.transitionDelay = (dStart + k * 18) + 'ms'; });
        void titleEl.offsetWidth;
        titleEl.classList.add('is-in');
        descEl.classList.add('is-in');
    }
    function resetText() {
        titleEl.classList.remove('is-in');
        descEl.classList.remove('is-in');
    }

    /* ---------- Blurred backdrop ---------- */
    const bgG = bg.getContext('2d');
    bg.width = 96; bg.height = 54;
    let bgCard = null, bgOn = false, bgSwap = 0;
    function CM(card) {
        clearTimeout(bgSwap);
        bg.style.transitionDuration = '0.25s';
        bg.style.opacity = '0';
        bgSwap = setTimeout(() => {
            bgCard = card;
            drawBg();
            bg.style.transitionDuration = '0.6s';
            if (bgOn) bg.style.opacity = '1';
        }, 250);
    }
    function drawBg() {
        if (!bgCard) return;
        const src = srcOf(bgCard);
        if (!src) return;
        const [sx, sy, sw, sh] = cover(src.w, src.h, bg.width, bg.height);
        bgG.drawImage(src.el, sx, sy, sw, sh, 0, 0, bg.width, bg.height);
    }
    function setBgVisible(on) {
        if (on === bgOn) return;
        bgOn = on;
        clearTimeout(bgSwap);
        bg.style.transitionDuration = '0.5s';
        bg.style.opacity = on && bgCard ? '1' : '0';
    }

    /* ---------- Active step ---------- */
    let active = -1;
    function playOnly(card) {
        cards.forEach((c) => {
            if (!c.video) return;
            if (c === card && !Lab.reduced) {
                c.video.preload = 'auto';
                const pr = c.video.play();
                if (pr && pr.catch) pr.catch(() => {});
            } else if (!c.video.paused) c.video.pause();
        });
    }

    function setActive(idx, now) {
        const prev = active;
        active = idx;
        cards.forEach((c, i) => {
            c.el.classList.toggle('is-active', i === idx);
            if (i === idx) {
                setMode(c, Lab.reduced ? 'sharp' : 'reveal', now);
            } else if (i < idx) {
                if (c.mode !== 'sharp') setMode(c, 'sharp', now);
            } else if (c.mode !== 'mosaic') {
                setMode(c, 'mosaic', now);
            }
        });
        if (idx < 0) { playOnly(null); return; }
        playOnly(cards[idx]);
        resetText();
        requestAnimationFrame(() => PM(idx));
        CM(cards[idx]);
        if (prev !== idx) Lab.rehit();
    }

    /* ---------- VIEW follower ---------- */
    let viewOn = false;
    Lab.hover('.m6-step.is-active', {
        enter: () => { viewOn = true; view.classList.add('is-on'); },
        leave: () => { viewOn = false; view.classList.remove('is-on'); }
    });

    /* ---------- Loop ---------- */
    let secTop = 0;
    function measure() {
        vw = innerWidth; vh = innerHeight;
        dpr = Math.min(1.5, window.devicePixelRatio || 1);
        secTop = section.getBoundingClientRect().top + window.scrollY;
        sizeCanvases();
    }
    measure();
    addEventListener('resize', measure, { passive: true });
    Lab.fontsReady().then(measure);

    let armed = false, lastNum = '';
    Lab.tick((dt, now) => {
        const sy = window.scrollY;
        const rel = sy - secTop;
        const progress = Lab.clamp(rel / (N * vh), 0, 1);
        const e = Math.min(progress * N, N - 1);
        const t = Math.floor(e);
        const n = e - t;

        if (!armed && rel > -vh * 0.45) armed = true;
        if (armed && rel < -vh * 0.9) {
            armed = false;
            setActive(-1, now);
            titleEl.innerHTML = words('My work');
            descEl.innerHTML = words('Scroll down for more');
        }
        if (armed && t !== active) setActive(t, now);

        setBgVisible(rel >= -1 && rel <= N * vh);
        if (bgOn && bgCard && bgCard.video && !bgCard.video.paused) drawBg();

        const base = Math.max(0, active);
        for (const c of cards) {
            target(c, Mp(c.i - base), now);
            stepTween(c, now);
            renderCard(c, now);
        }

        ring.style.strokeDashoffset = (RING_C * (1 - (armed ? n : 0))).toFixed(2);
        const num = Lab.pad(base + 1);
        if (num !== lastNum) { numEl.textContent = num; lastNum = num; }

        if (Lab.pointer.has) {
            view.style.transform = 'translate3d(' + (Lab.pointer.x - 40).toFixed(1) + 'px,' + (Lab.pointer.y - 35).toFixed(1) + 'px,0)';
        }
    });
})();
