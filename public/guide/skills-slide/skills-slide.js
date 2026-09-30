// Projects -> Skills: row 16's asterisk detaches, lands in slide 04, spins once the slide pins; GLITCH orbits it and the stack rises in.
(function () {
    'use strict';
    const doc = document;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const $ = (s, r) => (r || doc).querySelector(s);

    const sec = $('#section-skills');
    const src = $('#sourceStar');
    const star = $('#bigStar');
    const ink = $('#starInk');
    const list = $('#skList');
    const stage = list.parentElement;
    const bugEl = $('#skBug');
    const cvs = bugEl.querySelector('canvas');
    const ctx = cvs.getContext('2d');
    const bubble = $('#skBubble');
    const ghost = bubble.querySelector('.pb-ghost');
    const typed = bubble.querySelector('.pb-type');

    const TAGS = [...list.querySelectorAll('.sk-tag')].map((t) => t.textContent.trim());
    const ITEMS = [...list.querySelectorAll('.sk-text')].map((p) => p.textContent.split(',').map((s) => s.trim()));

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
        'typescript would\'ve caught me. he picked javascript that day.',
    ];

    const OMEGA = Math.PI * 2 / 16;   // rad/s at full spin speed
    const st = { travel: 0, travelT: 0, angle: 0, speed: 0, bug: 0, revealed: false };
    let W = 0, H = 0, S = 0;
    let srcRel = { x: 0, y: 0, s: 0.03 };
    let pinST = null, reveal = null, frame = '', lineIdx = 0, sayTimer = null;
    let say = null;

    function el(tag, cls) {
        const n = doc.createElement(tag);
        n.className = cls;
        return n;
    }

    // Masked-line split: units are grouped by rendered offsetTop so each visual line gets its own overflow mask
    function buildList() {
        list.querySelectorAll('.sk-row').forEach((row, i) => {
            const tag = row.querySelector('.sk-tag');
            tag.textContent = '';
            const tIn = doc.createElement('span');
            tIn.textContent = TAGS[i];
            tag.appendChild(tIn);

            const p = row.querySelector('.sk-text');
            p.textContent = '';
            const units = ITEMS[i].map((item, k, a) => {
                const u = el('span', 'w');
                u.textContent = item;
                u.style.whiteSpace = 'nowrap';
                if (k < a.length - 1) {
                    const s = el('span', 'sep');
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
            lines.forEach((ws) => {
                const m = el('span', 'ln-mask'), l = el('span', 'ln');
                ws.forEach((u, k) => {
                    l.appendChild(u);
                    if (k < ws.length - 1) l.appendChild(doc.createTextNode(' '));
                });
                m.appendChild(l);
                p.appendChild(m);
            });
        });
        ink.textContent = '';
        const clone = stage.cloneNode(true);
        clone.querySelector('ul').removeAttribute('id');
        clone.setAttribute('aria-hidden', 'true');
        ink.appendChild(clone);
    }

    function buildReveal() {
        if (reveal) reveal.kill();
        const rowsA = [...list.querySelectorAll('.sk-row')];
        const rowsB = [...ink.querySelectorAll('.sk-row')];
        reveal = gsap.timeline({ paused: true });
        rowsA.forEach((row, i) => {
            const pair = [row, rowsB[i]];
            const at = i * 0.14;
            reveal.fromTo(pair, { '--rule': 0 }, { '--rule': 1, duration: 1.1, ease: 'expo.inOut' }, at);
            reveal.fromTo(pair.map((r) => r.querySelector('.sk-tag > span')), { yPercent: 115 }, { yPercent: 0, duration: 1, ease: 'expo.out' }, at + 0.12);
            const la = row.querySelectorAll('.ln'), lb = rowsB[i].querySelectorAll('.ln');
            la.forEach((l, k) => {
                reveal.fromTo([l, lb[k]], { yPercent: 112, rotation: 3.5 },
                    { yPercent: 0, rotation: 0, duration: 1.25, ease: 'expo.out' }, at + 0.08 + k * 0.09);
            });
        });
        reveal.progress(st.revealed ? 1 : 0);
    }

    function measure() {
        W = sec.clientWidth;
        H = sec.clientHeight;
        S = Math.round(Math.min(W, H) * (W < 650 ? 0.64 : 0.5));
        sec.style.setProperty('--S', S + 'px');
        const left = W / 2 - S / 2, top = H / 2 - S / 2;
        ink.style.width = W + 'px';
        ink.style.height = H + 'px';
        ink.style.left = -left + 'px';
        ink.style.top = -top + 'px';
        ink.style.transformOrigin = (W / 2) + 'px ' + (H / 2) + 'px';
        if (reduced) return;
        // Row 16's ::before: a 0.8em box flush left in the index cell, vertically centred
        const r = src.getBoundingClientRect();
        const size = 0.8 * parseFloat(getComputedStyle(src).fontSize);
        const secTop = pinST ? pinST.start : sec.getBoundingClientRect().top + window.scrollY;
        srcRel = {
            x: r.left + size / 2 - W / 2,
            y: r.top + window.scrollY + r.height / 2 - secTop - H / 2,
            s: size / S,
        };
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
        const deg = st.angle * 180 / Math.PI;
        const rot = 60 * e + deg;
        star.style.opacity = st.travel > 0.0005 ? 1 : 0;
        src.classList.toggle('is-detached', st.travel > 0.0005);
        star.style.transform = 'translate3d(' + (srcRel.x * (1 - e)) + 'px,' + (srcRel.y * (1 - e)) + 'px,0) rotate(' + rot + 'deg) scale(' + (srcRel.s + (1 - srcRel.s) * e) + ')';
        ink.style.opacity = st.travel > 0.999 ? 1 : 0;
        ink.style.transform = 'rotate(' + (-rot) + 'deg)';

        // Bug sits in the top V between two arms and turns with the star, heading easing from outward to tangent
        const th = st.angle - Math.PI / 2;
        const R = S * 0.44 + 40;
        const bx = W / 2 + R * Math.cos(th), by = H / 2 + R * Math.sin(th);
        const head = th + Math.PI / 2 + (Math.PI / 2) * Math.min(1, st.speed);
        const pop = 1 + (1 - st.bug) * 0.6;
        bugEl.style.opacity = st.bug;
        bugEl.style.transform = 'translate3d(' + bx + 'px,' + by + 'px,0) rotate(' + head + 'rad) scale(' + pop + ')';
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
        gsap.to(st, { bug: 1, duration: 0.45, ease: 'steps(4)', overwrite: false });
        chatter(1400);
    }

    function spinOff() {
        st.revealed = false;
        reveal.timeScale(1.8).reverse();
        gsap.to(st, { speed: 0, duration: 0.9, ease: 'power2.out', overwrite: 'auto' });
        gsap.to(st, { bug: 0, duration: 0.3, ease: 'steps(3)', overwrite: false });
        clearTimeout(sayTimer);
        hush();
    }

    function init() {
        buildList();
        if (reduced) {
            doc.documentElement.classList.add('is-reduced');
            st.travel = 1;
            st.bug = 1;
            measure();
            render(0);
            speak(LINES[0]);
            render(0);
            window.addEventListener('resize', () => {
                buildList();
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
        ScrollTrigger.addEventListener('refreshInit', () => {
            buildList();
            buildReveal();
        });
        ScrollTrigger.addEventListener('refresh', measure);
        measure();

        gsap.ticker.add((time, dt) => {
            const k = 1 - Math.exp(-Math.min(dt, 50) / 1000 * 14);
            st.travel += (st.travelT - st.travel) * k;
            if (Math.abs(st.travelT - st.travel) < 1e-4) st.travel = st.travelT;
            st.angle += st.speed * OMEGA * Math.min(dt, 50) / 1000;
            render(time * 1000);
        });

        if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => ScrollTrigger.refresh());
    }

    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
