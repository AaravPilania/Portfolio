// Projects -> Skills: row 16's asterisk drops straight down its own column into slide 04, spins once the slide pins,
// GLITCH orbits it, and the five skill rows rise in over the Lama Lama particle backdrop.
(function () {
    'use strict';
    const doc = document;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const $ = (s, r) => (r || doc).querySelector(s);

    const sec = $('#section-skills');
    const src = $('#sourceStar');
    const star = $('#bigStar');
    const bugEl = $('#skBug');
    const cvs = bugEl.querySelector('canvas');
    const ctx = cvs.getContext('2d');
    const bubble = $('#skBubble');
    const ghost = bubble.querySelector('.pb-ghost');
    const typed = bubble.querySelector('.pb-type');

    const rows = [...doc.querySelectorAll('#skRows .sk-row')];
    const SKILLS = rows.map((r) => r.querySelector('.sk-skills').textContent.split(',').map((s) => s.trim()));
    const HEADS = rows.map((r) => r.querySelector('.sk-head').textContent.trim());

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
    let pinST = null, reveal = null, frame = '', lineIdx = 0, sayTimer = null, say = null;

    function wrapLine(parent, nodes) {
        const m = doc.createElement('span'), l = doc.createElement('span');
        m.className = 'ln-mask';
        l.className = 'ln';
        nodes.forEach((n, k) => {
            l.appendChild(n);
            if (k < nodes.length - 1) l.appendChild(doc.createTextNode(' '));
        });
        m.appendChild(l);
        parent.appendChild(m);
    }

    // Masked-line split: skill units are grouped by rendered offsetTop so each visual line gets its own overflow mask
    function buildRows() {
        rows.forEach((row, i) => {
            const h = row.querySelector('.sk-head');
            h.textContent = '';
            wrapLine(h, [doc.createTextNode(HEADS[i])]);
            const idx = row.querySelector('.sk-idx');
            const n = idx.textContent.trim();
            idx.textContent = '';
            wrapLine(idx, [doc.createTextNode(n)]);

            const p = row.querySelector('.sk-skills');
            p.textContent = '';
            const units = SKILLS[i].map((item, k, all) => {
                const u = doc.createElement('span');
                u.style.whiteSpace = 'nowrap';
                u.textContent = item;
                if (k < all.length - 1) {
                    const s = doc.createElement('span');
                    s.className = 'sep';
                    s.textContent = ' /';
                    u.appendChild(s);
                }
                return u;
            });
            units.forEach((u, k) => {
                p.appendChild(u);
                if (k < units.length - 1) p.appendChild(doc.createTextNode(' '));
            });
            const lines = [];
            let top = null;
            units.forEach((u) => {
                const t = u.offsetTop;
                if (top === null || Math.abs(t - top) > 2) { lines.push([]); top = t; }
                lines[lines.length - 1].push(u);
            });
            p.textContent = '';
            lines.forEach((ws) => wrapLine(p, ws));
        });
    }

    function buildReveal() {
        if (reveal) reveal.kill();
        reveal = gsap.timeline({ paused: true });
        rows.forEach((row, i) => {
            const at = i * 0.14;
            reveal.fromTo(row, { '--rule': 0 }, { '--rule': 1, duration: 1.1, ease: 'expo.inOut' }, at);
            reveal.fromTo(row.querySelectorAll('.sk-idx .ln, .sk-head .ln'), { yPercent: 112, rotation: 3.5 },
                { yPercent: 0, rotation: 0, duration: 1.25, ease: 'expo.out' }, at + 0.06);
            row.querySelectorAll('.sk-skills .ln').forEach((l, k) => {
                reveal.fromTo(l, { yPercent: 112, rotation: 3.5 }, { yPercent: 0, rotation: 0, duration: 1.25, ease: 'expo.out' }, at + 0.14 + k * 0.08);
            });
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
        buildRows();
        if (reduced) {
            doc.documentElement.classList.add('is-reduced');
            st.travel = 1;
            st.bug = 1;
            measure();
            speak(LINES[0]);
            render(0);
            window.addEventListener('resize', () => {
                buildRows();
                measure();
                render(0);
            });
            return;
        }

        gsap.registerPlugin(ScrollTrigger);
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
        ScrollTrigger.addEventListener('refreshInit', buildRows);
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

        if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => ScrollTrigger.refresh());
    }

    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
