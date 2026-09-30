// Projects -> Skills: row 16's asterisk drops straight down its own column into slide 04, spins once the slide pins,
// GLITCH orbits it, and Lusion-style ribbons carrying the stack sweep in one by one.
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

    const TONES = { sun: '#FFED29', ultra: '#2f3bf5', paper: '#f4f2ea', peri: '#5b74ff', bone: '#b9b5a8' };
    const CATS = [...doc.querySelectorAll('#skData li')].map((li) => ({
        tag: li.dataset.tag, tone: li.dataset.tone, items: li.textContent.split(',').map((s) => s.trim()),
    }));
    const TILTS = [-4, -1.5, 2.5, 4.5, -3, -0.5, 3.5, 1.5, -4.5, -2];
    const PX_PER_S = 70;

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
    let pinST = null, reveal = null, frame = '', lineIdx = 0, sayTimer = null, say = null, lastW = 0;

    function el(tag, cls, text) {
        const n = doc.createElement(tag);
        n.className = cls;
        if (text != null) n.textContent = text;
        return n;
    }

    function fillSeq(seq, cat, flip) {
        seq.appendChild(el('span', 'rb-tag', '[ ' + cat.tag + ' ]'));
        const items = flip ? cat.items.slice().reverse() : cat.items;
        items.forEach((it) => {
            seq.appendChild(el('span', 'rb-item', it));
            seq.appendChild(el('i', 'rb-star'));
        });
    }

    // Two ribbons per category; both halves of a track are built identically so translate(-50%) loops seamlessly
    function buildRibbons() {
        host.textContent = '';
        let n = 0;
        CATS.forEach((cat, ci) => {
            for (let k = 0; k < 2; k++) {
                const rb = el('div', 'rb');
                rb.dataset.tone = cat.tone;
                rb.style.setProperty('--tone', TONES[cat.tone]);
                rb.style.setProperty('--tilt', TILTS[n % TILTS.length] + 'deg');
                const band = el('div', 'rb-band');
                const track = el('div', 'rb-track');
                const a = el('div', 'rb-seq');
                fillSeq(a, cat, k === 1);
                track.appendChild(a);
                band.appendChild(track);
                rb.appendChild(band);
                host.appendChild(rb);
                const need = band.offsetWidth * 1.05;
                const unit = a.innerHTML;
                let guard = 0;
                while (a.offsetWidth < need && guard++ < 12) a.insertAdjacentHTML('beforeend', unit);
                const b = a.cloneNode(true);
                b.setAttribute('aria-hidden', 'true');
                track.appendChild(b);
                track.style.setProperty('--dur', (a.offsetWidth / PX_PER_S).toFixed(2) + 's');
                track.style.setProperty('--dir', (ci + k) % 2 ? 'reverse' : 'normal');
                n++;
            }
        });
    }

    // Stroke-draw entrance: each band sweeps in along its own tilt, round cap leading, alternating sides
    function buildReveal() {
        if (reveal) reveal.kill();
        const bands = [...host.querySelectorAll('.rb-band')];
        reveal = gsap.timeline({ paused: true });
        bands.forEach((b, i) => {
            const from = (i % 2 ? 1 : -1) * W * 1.6;
            reveal.fromTo(b, { x: from }, { x: 0, duration: 1.3, ease: 'expo.out' }, i * 0.1);
        });
        reveal.progress(st.revealed ? 1 : 0);
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
        reveal.timeScale(1).play();
        gsap.to(st, { speed: 1, duration: 1.6, ease: 'power2.inOut', overwrite: 'auto' });
        gsap.to(st, { bug: 1, duration: 0.45, ease: 'steps(4)' });
        chatter(1400);
    }

    function spinOff() {
        st.revealed = false;
        reveal.timeScale(1.8).reverse();
        gsap.to(st, { speed: 0, duration: 0.9, ease: 'power2.out', overwrite: 'auto' });
        gsap.to(st, { bug: 0, duration: 0.3, ease: 'steps(3)' });
        clearTimeout(sayTimer);
        hush();
    }

    function init() {
        buildRibbons();
        lastW = window.innerWidth;
        if (reduced) {
            doc.documentElement.classList.add('is-reduced');
            st.travel = 1;
            st.bug = 1;
            measure();
            speak(LINES[0]);
            render(0);
            window.addEventListener('resize', () => {
                buildRibbons();
                measure();
                render(0);
            });
            return;
        }

        gsap.registerPlugin(ScrollTrigger);
        measure();
        buildReveal();
        ScrollTrigger.create({
            trigger: sec, start: 'top bottom', end: 'top top',
            onUpdate: (self) => { st.travelT = self.progress; },
        });
        pinST = ScrollTrigger.create({
            trigger: sec, start: 'top top', end: '+=150%', pin: true,
            onEnter: spinOn,
            onLeaveBack: spinOff,
        });
        ScrollTrigger.addEventListener('refreshInit', () => {
            if (window.innerWidth === lastW) return;
            lastW = window.innerWidth;
            buildRibbons();
        });
        ScrollTrigger.addEventListener('refresh', () => {
            measure();
            buildReveal();
        });
        measure();

        gsap.ticker.add((time, dt) => {
            const s = Math.min(dt, 50) / 1000;
            st.travel += (st.travelT - st.travel) * (1 - Math.exp(-s * 14));
            if (Math.abs(st.travelT - st.travel) < 1e-4) st.travel = st.travelT;
            st.angle += st.speed * OMEGA * s;
            render(time * 1000);
        });

        if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => { lastW = 0; ScrollTrigger.refresh(); });
    }

    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
