// Projects -> Skills: row 16's asterisk drops straight down its own column into slide 04, spins once the slide pins,
// GLITCH orbits it, and a single Lusion ribbon carrying the stack draws itself in with scroll.
(function () {
    'use strict';
    const doc = document;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const $ = (s, r) => (r || doc).querySelector(s);

    const sec = $('#section-skills');
    const src = $('#sourceStar');
    const star = $('#bigStar');
    const host = $('#skRibbons');
    const bugEl = $('#skBug');
    const cvs = bugEl.querySelector('canvas');
    const ctx = cvs.getContext('2d');
    const bubble = $('#skBubble');
    const ghost = bubble.querySelector('.pb-ghost');
    const typed = bubble.querySelector('.pb-type');

    const CATS = [...doc.querySelectorAll('#skData li')].map((li) => ({
        tag: li.dataset.tag, items: li.textContent.split(',').map((s) => s.trim()),
    }));
    // Lusion's section-2 ribbon traced from lusion.co (1024x504 frames), normalised to the slide
    const PTS = [[-0.06, 0.14], [0.12, 0.1], [0.27, 0.22], [0.31, 0.46], [0.26, 0.68], [0.12, 0.74], [0.05, 0.6], [0.12, 0.42],
        [0.3, 0.3], [0.46, 0.1], [0.56, 0.06], [0.68, 0.24], [0.8, 0.27], [0.91, 0.25], [0.96, 0.45], [0.97, 0.72], [1.04, 1.06]];
    const NS = 'http://www.w3.org/2000/svg';
    const TEXT_SPEED = 60;
    const DRAW_SPAN = 0.7;
    const rb = { tube: null, mask: null, tp: null, svg: null, L: 0, seq: 1, draw: 0, drawT: 0 };

    const LINES = [
        'orbiting his stack. small universe, big bundle.',
        'react 19. i\'m still on 0.0.1-beta.',
        'pytorch trained a model to find bugs. it found me. twice.',
        'fastapi is fast. i have six legs. we\'re even.',
        'gsap does the easing. i do the queasing.',
        'docker? i live in a container too. it\'s called a div.',
        'SELECT * FROM crumbs WHERE free = true;',
        'RAG: retrieval augmented glitching.',
        'c++ has pointers. i have antennae. same energy.',
        'multi-agent pipeline. i\'m the agent of chaos.',
        'git blame says it was me. git blame is right.',
        'three.js renders in 3d. i\'m two pixels deep.',
    ];

    const OMEGA = Math.PI * 2 / 16;
    const st = { travel: 0, travelT: 0, angle: 0, speed: 0, bug: 0, revealed: false };
    let W = 0, H = 0, S = 0, cx = 0;
    let srcY = 0, srcS = 0.03;
    let pinST = null, frame = '', lineIdx = 0, sayTimer = null, say = null;

    function sv(tag, attrs, parent) {
        const n = doc.createElementNS(NS, tag);
        for (const k in attrs) n.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(n);
        return n;
    }

    // Uniform Catmull-Rom through the traced points, emitted as cubic beziers
    function pathD() {
        const p = PTS.map(([u, v]) => [u * W, v * H]);
        const f = (n) => n.toFixed(1);
        let d = 'M' + f(p[0][0]) + ',' + f(p[0][1]);
        for (let i = 0; i < p.length - 1; i++) {
            const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
            d += 'C' + f(p1[0] + (p2[0] - p0[0]) / 6) + ',' + f(p1[1] + (p2[1] - p0[1]) / 6) + ' '
                + f(p2[0] - (p3[0] - p1[0]) / 6) + ',' + f(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + f(p2[0]) + ',' + f(p2[1]);
        }
        return d;
    }

    function fillText(parent) {
        CATS.forEach((cat) => {
            const t = sv('tspan', { class: 'rb-tag' }, parent);
            t.textContent = '[ ' + cat.tag + ' ]\u2002';
            const s = sv('tspan', {}, parent);
            s.textContent = cat.items.join(' \u2022 ') + '\u2003\u2003';
        });
    }

    function buildRibbon() {
        host.textContent = '';
        const thick = Math.max(22, W * 0.0215);
        const d = pathD();
        const svg = sv('svg', { class: 'sk-ribbon', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H });
        const defs = sv('defs', {}, svg);
        const g = sv('linearGradient', { id: 'rbGrad', gradientUnits: 'userSpaceOnUse', x1: 0, y1: H * 0.2, x2: W, y2: H * 0.5 }, defs);
        sv('stop', { offset: 0, 'stop-color': '#3a3ff0' }, g);
        sv('stop', { offset: 0.55, 'stop-color': '#4a5ff8' }, g);
        sv('stop', { offset: 1, 'stop-color': '#5b82ff' }, g);
        sv('path', { id: 'rbPath', d }, defs);
        const m = sv('mask', { id: 'rbMask', maskUnits: 'userSpaceOnUse', x: -W, y: -H, width: W * 3, height: H * 3 }, defs);
        rb.mask = sv('path', { d, fill: 'none', stroke: '#fff', 'stroke-width': thick + 2, 'stroke-linecap': 'round' }, m);
        rb.tube = sv('path', { d, fill: 'none', stroke: 'url(#rbGrad)', 'stroke-width': thick, 'stroke-linecap': 'round' }, svg);
        host.appendChild(svg);
        rb.L = rb.tube.getTotalLength();
        [rb.tube, rb.mask].forEach((p) => p.setAttribute('stroke-dasharray', rb.L + ' ' + (rb.L + thick * 2)));

        const fs = (thick * 0.44).toFixed(1);
        const probe = sv('text', { class: 'rb-text', 'font-size': fs }, svg);
        fillText(probe);
        rb.seq = probe.getComputedTextLength() || 1;
        probe.remove();
        const text = sv('text', { class: 'rb-text', 'font-size': fs, 'dominant-baseline': 'central', mask: 'url(#rbMask)' }, svg);
        rb.tp = sv('textPath', { href: '#rbPath', startOffset: 0 }, text);
        const reps = Math.ceil(rb.L / rb.seq) + 2;
        for (let i = 0; i < reps; i++) fillText(rb.tp);
        rb.svg = svg;
    }

    function measure() {
        W = sec.clientWidth;
        H = sec.clientHeight;
        S = Math.round(Math.min(W, H) * (W < 650 ? 0.7 : 0.58));
        sec.style.setProperty('--S', S + 'px');
        // Row 16's ::before: a 0.8em box flush left in the index cell, vertically centred
        const r = src.getBoundingClientRect();
        const size = 0.8 * parseFloat(getComputedStyle(src).fontSize);
        cx = r.left + size / 2;
        if (reduced) return;
        const secTop = pinST ? pinST.start : sec.getBoundingClientRect().top + window.scrollY;
        srcY = r.top + window.scrollY + r.height / 2 - secTop - H / 2;
        srcS = size / S;
    }

    const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

    function drawBug(pose) {
        if (pose === frame || !window.__pixelBugSprite) return;
        frame = pose;
        ctx.clearRect(0, 0, 24, 30);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(window.__pixelBugSprite({ legs: pose, antL: 'out', antR: 'out' }), 0, 0);
    }

    function render(now) {
        const e = ease(st.travel);
        const rot = 60 * e + st.angle * 180 / Math.PI;
        const on = st.travel > 0.0005;
        star.style.opacity = on ? 1 : 0;
        src.classList.toggle('is-detached', on);
        star.style.transform = 'translate3d(' + (cx - S / 2) + 'px,' + (srcY * (1 - e)) + 'px,0) rotate(' + rot + 'deg) scale(' + (srcS + (1 - srcS) * e) + ')';

        if (rb.svg) {
            // A zero-length dash still paints a round-cap dot, so the ribbon stays hidden until it has length
            rb.svg.style.opacity = rb.draw > 0.002 ? 1 : 0;
            const off = rb.L * (1 - rb.draw);
            rb.tube.style.strokeDashoffset = off;
            rb.mask.style.strokeDashoffset = off;
            if (!reduced && rb.draw > 0.002) rb.tp.setAttribute('startOffset', -((now / 1000 * TEXT_SPEED) % rb.seq));
        }

        // Bug starts in the top V of the star (same x as its centre) and turns with it; x is clamped so the left arc stays on screen
        const th = st.angle - Math.PI / 2;
        const R = S * 0.44 + 40;
        const bx = Math.max(34, Math.min(W - 34, cx + R * Math.cos(th)));
        const by = Math.max(40, Math.min(H - 40, H / 2 + R * Math.sin(th)));
        const head = th + Math.PI / 2 + (Math.PI / 2) * Math.min(1, st.speed);
        bugEl.style.opacity = st.bug;
        bugEl.style.transform = 'translate3d(' + bx + 'px,' + by + 'px,0) rotate(' + head + 'rad) scale(' + (1 + (1 - st.bug) * 0.6) + ')';
        drawBug(st.speed > 0.05 ? (Math.floor(now / (140 / Math.max(0.4, st.speed))) % 2 ? 'a' : 'b') : 'mid');

        if (say) {
            if (!reduced) {
                const n = Math.min(say.text.length, Math.floor((now - say.t0) / 28));
                if (n !== say.n) {
                    say.n = n;
                    typed.textContent = say.text.slice(0, n);
                    bubble.classList.toggle('is-done', n >= say.text.length);
                }
            }
            let x = bx - say.bw * 0.3, y = by - 44 - say.bh;
            const below = y < 56;
            if (below) y = by + 44;
            x = Math.max(12, Math.min(W - say.bw - 12, x));
            bubble.classList.toggle('is-below', below);
            bubble.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
            bubble.style.setProperty('--tail', Math.max(8, Math.min(say.bw - 20, bx - x - 4)) + 'px');
        }
    }

    function speak(text) {
        ghost.textContent = text;
        typed.textContent = reduced ? text : '';
        bubble.classList.toggle('is-done', reduced);
        bubble.classList.add('is-on');
        say = { text, t0: performance.now(), n: -1, bw: bubble.offsetWidth, bh: bubble.offsetHeight };
    }

    function hush() {
        bubble.classList.remove('is-on');
        say = null;
    }

    function chatter(delay) {
        clearTimeout(sayTimer);
        sayTimer = setTimeout(() => {
            const text = LINES[lineIdx % LINES.length];
            lineIdx++;
            speak(text);
            sayTimer = setTimeout(() => {
                hush();
                chatter(3200 + Math.random() * 3600);
            }, text.length * 28 + 2600);
        }, delay);
    }

    function spinOn() {
        st.revealed = true;
        gsap.to(st, { speed: 1, duration: 1.6, ease: 'power2.inOut', overwrite: 'auto' });
        gsap.to(st, { bug: 1, duration: 0.45, ease: 'steps(4)' });
        chatter(1400);
    }

    function spinOff() {
        st.revealed = false;
        gsap.to(st, { speed: 0, duration: 0.9, ease: 'power2.out', overwrite: 'auto' });
        gsap.to(st, { bug: 0, duration: 0.3, ease: 'steps(3)' });
        clearTimeout(sayTimer);
        hush();
    }

    function init() {
        if (reduced) {
            doc.documentElement.classList.add('is-reduced');
            st.travel = 1;
            st.bug = 1;
            rb.draw = 1;
            measure();
            buildRibbon();
            speak(LINES[0]);
            render(0);
            window.addEventListener('resize', () => {
                measure();
                buildRibbon();
                render(0);
            });
            return;
        }

        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.create({
            trigger: sec, start: 'top bottom', end: 'top top',
            onUpdate: (self) => { st.travelT = self.progress; },
        });
        // Ribbon draws over the first 70% of the pin, starting exactly when the spin starts
        pinST = ScrollTrigger.create({
            trigger: sec, start: 'top top', end: '+=150%', pin: true,
            onEnter: spinOn,
            onLeaveBack: spinOff,
            onUpdate: (self) => { rb.drawT = Math.min(1, self.progress / DRAW_SPAN); },
        });
        ScrollTrigger.addEventListener('refresh', () => {
            measure();
            buildRibbon();
        });
        measure();
        buildRibbon();

        gsap.ticker.add((time, dt) => {
            const s = Math.min(dt, 50) / 1000;
            const k = 1 - Math.exp(-s * 14);
            st.travel += (st.travelT - st.travel) * k;
            if (Math.abs(st.travelT - st.travel) < 1e-4) st.travel = st.travelT;
            rb.draw += (rb.drawT - rb.draw) * k;
            if (Math.abs(rb.drawT - rb.draw) < 1e-4) rb.draw = rb.drawT;
            st.angle += st.speed * OMEGA * s;
            render(time * 1000);
        });

        if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => ScrollTrigger.refresh());
    }

    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
