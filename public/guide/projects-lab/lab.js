(function () {
    'use strict';

    const root = document.documentElement;
    const mqReduced = matchMedia('(prefers-reduced-motion: reduce)');

    const Lab = window.Lab = {
        reduced: mqReduced.matches,
        projects: window.PL_PROJECTS || [],
        pointer: { x: -1, y: -1, has: false },
        scrollV: 0
    };

    root.classList.toggle('pl-reduced', Lab.reduced);
    mqReduced.addEventListener('change', (e) => {
        Lab.reduced = e.matches;
        root.classList.toggle('pl-reduced', e.matches);
    });

    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    Lab.esc = esc;
    Lab.pad = (n) => String(n).padStart(2, '0');
    Lab.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    Lab.damp = (dt, rate) => 1 - Math.exp(-dt * rate);
    Lab.poster = (p) => p.media.find((m) => /\.(jpe?g|png|webp)$/i.test(m)) || null;
    Lab.video = (p) => p.media.find((m) => /\.mp4$/i.test(m)) || null;
    Lab.awardsText = (p) => p.awards.map((a) => '(' + a[0] + ')').join(' ');

    Lab.hash = (str) => {
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
        return h >>> 0;
    };
    Lab.rand = (seed) => () => {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    /* ---------- Ticker ---------- */
    const tickers = new Set();
    let lastT = performance.now();
    let lastScrollY = window.scrollY;
    function frame(now) {
        const dt = Math.min(0.064, Math.max(0.001, (now - lastT) / 1000));
        lastT = now;
        const sy = window.scrollY;
        const raw = (sy - lastScrollY) / dt;
        lastScrollY = sy;
        Lab.scrollV += (raw - Lab.scrollV) * Lab.damp(dt, 10);
        if (Math.abs(Lab.scrollV) < 0.5) Lab.scrollV = 0;
        tickers.forEach((fn) => fn(dt, now));
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    Lab.tick = (fn) => { tickers.add(fn); return () => tickers.delete(fn); };

    /* ---------- Hover with re-hit-test ---------- */
    const hovers = [];
    let hitQueued = false;
    function runHit() {
        hitQueued = false;
        const { x, y, has } = Lab.pointer;
        const target = has ? document.elementFromPoint(x, y) : null;
        for (const h of hovers) {
            const next = target ? target.closest(h.selector) : null;
            if (next === h.current) continue;
            const prev = h.current;
            h.current = next;
            if (prev && h.leave) h.leave(prev);
            if (next && h.enter) h.enter(next);
        }
    }
    Lab.rehit = () => {
        if (hitQueued) return;
        hitQueued = true;
        requestAnimationFrame(runHit);
    };
    Lab.hover = (selector, handlers = {}) => {
        const h = { selector, enter: handlers.enter, leave: handlers.leave, current: null };
        hovers.push(h);
        Lab.rehit();
        return h;
    };

    addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        Lab.pointer.x = e.clientX;
        Lab.pointer.y = e.clientY;
        if (!Lab.pointer.has) { Lab.pointer.has = true; root.classList.add('pl-pointer-in'); }
        Lab.rehit();
    }, { passive: true });
    addEventListener('scroll', Lab.rehit, { passive: true, capture: true });
    addEventListener('wheel', Lab.rehit, { passive: true });
    addEventListener('resize', Lab.rehit, { passive: true });
    root.addEventListener('pointerleave', () => {
        Lab.pointer.has = false;
        root.classList.remove('pl-pointer-in');
        Lab.rehit();
    });

    /* ---------- Cursor ---------- */
    Lab.cursorState = () => {};
    Lab.cursor = () => {
        if (!matchMedia('(pointer: fine)').matches) return;
        root.classList.add('pl-has-cursor');
        const dot = document.createElement('div');
        dot.className = 'site-cursor-dot';
        const label = document.createElement('div');
        label.className = 'js-cursor-label pl-cursor-label';
        document.body.append(dot, label);

        let x = -100, y = -100, lx = -100, ly = -100, s = 0.23, ts = 0.23;
        let primed = false;
        Lab.cursorState = (ring, text) => {
            ts = ring ? 1 : 0.23;
            dot.classList.toggle('is-ring', !!ring);
            if (text) { label.textContent = '[ ' + text + ' ]'; label.classList.add('is-on'); }
            else label.classList.remove('is-on');
        };
        Lab.tick((dt) => {
            if (!Lab.pointer.has) return;
            const px = Lab.pointer.x, py = Lab.pointer.y;
            if (!primed) { x = lx = px; y = ly = py; primed = true; }
            const kd = Lab.reduced ? 1 : Lab.damp(dt, 38);
            const kl = Lab.reduced ? 1 : Lab.damp(dt, 14);
            x += (px - x) * kd; y += (py - y) * kd;
            lx += (px - lx) * kl; ly += (py - ly) * kl;
            s += (ts - s) * (Lab.reduced ? 1 : Lab.damp(dt, 16));
            dot.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) scale(' + s.toFixed(3) + ')';
            label.style.transform = 'translate3d(' + (lx + 20).toFixed(2) + 'px,' + (ly + 16).toFixed(2) + 'px,0)';
        });
        Lab.hover('[data-cursor]', {
            enter: (el) => Lab.cursorState(true, el.dataset.cursor || null),
            leave: () => Lab.cursorState(false)
        });
    };

    /* ---------- Dock ---------- */
    Lab.dock = ({ num, name, hint }) => {
        const nav = document.createElement('nav');
        nav.className = 'pl-dock';
        nav.setAttribute('aria-label', 'Projects lab');
        nav.innerHTML =
            '<a class="pl-dock__back" href="/guide/projects-lab.html" data-cursor="BACK">&larr; Lab</a>' +
            '<span class="pl-dock__num">' + esc(num) + '<i>/06</i></span>' +
            '<span class="pl-dock__name">' + esc(name) + '</span>' +
            (hint ? '<span class="pl-dock__hint">' + esc(hint) + '</span>' : '');
        document.body.appendChild(nav);
        const grain = document.createElement('div');
        grain.className = 'pl-grain';
        grain.setAttribute('aria-hidden', 'true');
        document.body.appendChild(grain);
        return nav;
    };

    /* ---------- Odometer text ---------- */
    Lab.roll = (text) => {
        let i = 0;
        return Array.from(String(text)).map((ch) => {
            if (ch === ' ') return '<span class="pl-roll__sp" aria-hidden="true"> </span>';
            const c = esc(ch);
            return '<span class="pl-roll" aria-hidden="true" style="--i:' + (i++) + '"><span>' + c + '</span><span>' + c + '</span></span>';
        }).join('') + '<span class="pl-sr">' + esc(text) + '</span>';
    };

    /* ---------- Dithered graph-paper placeholder ---------- */
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const phCache = new Map();
    Lab.placeholder = (p, w = 480, h = 300) => {
        const id = p.key + ':' + w + 'x' + h;
        if (phCache.has(id)) return phCache.get(id);
        const rnd = Lab.rand(Lab.hash(p.key));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const g = c.getContext('2d');
        g.fillStyle = '#121316';
        g.fillRect(0, 0, w, h);

        const cell = 3;
        const lw = Math.ceil(w / cell), lh = Math.ceil(h / cell);
        const low = document.createElement('canvas');
        low.width = lw; low.height = lh;
        const lg = low.getContext('2d');
        const img = lg.createImageData(lw, lh);
        const cx = rnd() * lw, cy = rnd() * lh;
        const rad = Math.max(lw, lh) * (0.5 + rnd() * 0.45);
        const ang = rnd() * Math.PI * 2, freq = 0.05 + rnd() * 0.08, phase = rnd() * 10;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        for (let y = 0; y < lh; y++) {
            for (let x = 0; x < lw; x++) {
                const d = Math.hypot(x - cx, y - cy) / rad;
                const wave = 0.5 + 0.5 * Math.sin((x * ca + y * sa) * freq + phase);
                const v = (1 - d) * 0.78 + wave * 0.22;
                const t = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
                if (v > t) {
                    const o = (y * lw + x) * 4;
                    img.data[o] = 244; img.data[o + 1] = 242; img.data[o + 2] = 234; img.data[o + 3] = 120;
                }
            }
        }
        lg.putImageData(img, 0, 0);
        g.imageSmoothingEnabled = false;
        g.drawImage(low, 0, 0, lw * cell, lh * cell);

        g.lineWidth = 1;
        for (let x = 0.5; x < w; x += 12) {
            g.strokeStyle = (Math.round(x - 0.5) % 60 === 0) ? 'rgba(244,242,234,0.14)' : 'rgba(244,242,234,0.05)';
            g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
        }
        for (let y = 0.5; y < h; y += 12) {
            g.strokeStyle = (Math.round(y - 0.5) % 60 === 0) ? 'rgba(244,242,234,0.14)' : 'rgba(244,242,234,0.05)';
            g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
        }

        g.strokeStyle = '#FFED29';
        g.lineWidth = 1.5;
        const m = 14, k = 10;
        [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]].forEach(([x, y, sx, sy]) => {
            g.beginPath(); g.moveTo(x, y + k * sy); g.lineTo(x, y); g.lineTo(x + k * sx, y); g.stroke();
        });

        const fs = Math.round(h * 0.075);
        g.fillStyle = '#f4f2ea';
        g.font = '500 ' + fs + 'px "IBM Plex Mono", monospace';
        g.textBaseline = 'alphabetic';
        g.fillText(String(p.title).toUpperCase(), m + 8, h - m - 8);
        g.fillStyle = '#FFED29';
        g.textAlign = 'right';
        g.fillText('//' + p.year, w - m - 8, m + fs + 4);
        g.textAlign = 'left';
        g.fillStyle = 'rgba(244,242,234,0.5)';
        g.font = '500 ' + Math.round(fs * 0.62) + 'px "IBM Plex Mono", monospace';
        g.fillText('NO SIGNAL — ' + String(p.client).toUpperCase(), m + 8, m + fs + 2);

        const url = c.toDataURL('image/png');
        phCache.set(id, url);
        return url;
    };

    /* ---------- Media element ---------- */
    const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => en.target._plIO && en.target._plIO(en.isIntersecting));
    }, { rootMargin: '25% 25%' });

    Lab.media = (p, opts = {}) => {
        const el = document.createElement('div');
        el.className = 'pl-media' + (opts.className ? ' ' + opts.className : '');
        const ph = Lab.placeholder(p, opts.phW || 480, opts.phH || 300);
        const poster = Lab.poster(p);
        const vsrc = Lab.video(p);

        const img = new Image();
        img.alt = '';
        img.decoding = 'async';
        img.draggable = false;
        if (!opts.eager) img.loading = 'lazy';
        img.src = poster || ph;
        if (poster) img.onerror = () => { img.onerror = null; img.src = ph; };
        el.appendChild(img);
        if (!poster && vsrc) el.classList.add('is-vonly');

        let video = null;
        let wantPlay = false;
        const ensureVideo = () => {
            if (video || !vsrc) return video;
            video = document.createElement('video');
            video.muted = true; video.loop = true; video.playsInline = true;
            video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
            video.preload = poster ? 'auto' : 'metadata';
            video.addEventListener('loadeddata', () => el.classList.add('has-video'), { once: true });
            video.addEventListener('error', () => el.classList.remove('has-video', 'is-playing'), { once: true });
            video.src = poster ? vsrc : vsrc + '#t=0.1';
            el.appendChild(video);
            return video;
        };
        el.plPlay = () => {
            wantPlay = true;
            const v = ensureVideo();
            if (!v) return;
            el.classList.add('is-playing');
            const pr = v.play();
            if (pr && pr.catch) pr.catch(() => {});
        };
        el.plPause = () => {
            wantPlay = false;
            if (!video) return;
            el.classList.remove('is-playing');
            video.pause();
        };
        el.plVideo = ensureVideo;
        el.plProject = p;
        el._plIO = (visible) => {
            if (visible && !poster) ensureVideo();
            if (opts.autoplay === 'visible' && !Lab.reduced) {
                if (visible) el.plPlay(); else if (wantPlay) el.plPause();
            }
        };
        io.observe(el);
        return el;
    };

    Lab.fontsReady = () => (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
})();
