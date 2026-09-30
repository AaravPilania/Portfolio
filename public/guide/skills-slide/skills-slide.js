// Projects -> Skills: row 16's asterisk drops straight down its own column into slide 04, then turns like a scroll wheel.
// Each detent is one arm (60°) and swaps in the next category with Meer Mohsin's "legacy" per-character rise.
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
    const cats = [...doc.querySelectorAll('#skLegacy .sk-cat')];
    const N = cats.length;

    const CAT_LINES = [
        'frontend. react 19, gsap, three.js. and still nobody can center me.',
        'backend. fastapi and postgres. i live in the logs now.',
        'ai / ml. pytorch found me in the training data. rude.',
        'seven languages. i only speak segfault.',
        'git, docker, ollama. git blame still says it was me.',
    ];
    const IDLE_LINE = 'scroll me. i\'m a wheel now.';

    const ARM = Math.PI / 3;          // one detent: the asterisk's six arms repeat every 60°
    const HOLD = 1.1;                 // timeline seconds each category rests at its detent
    const STEP_VH = 1.15;             // viewport heights of scroll per category
    const STRIDE_REF = ARM * 1.5;     // rad/s that counts as a full walking stride for the bug

    const st = { travel: 0, travelT: 0, wheel: 0, bug: 0, angle: 0, vel: 0 };
    let W = 0, H = 0, S = 0, cx = 0, srcY = 0, srcS = 0.03;
    let pinST = null, tl = null, total = 1, frame = '', sayTimer = null, say = null, active = -1;
    const inStart = [];

    // Meer's split: every glyph is its own inline-block inside an overflow mask; spaces become nbsp so widths hold
    function splitInto(parent, text, whole) {
        const chars = [];
        const groups = whole ? [text] : text.split(' ');
        groups.forEach((g, gi) => {
            const mk = doc.createElement('span');
            mk.className = 'mk';
            for (const c of g) {
                const ch = doc.createElement('span');
                ch.className = 'ch';
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
        cat.querySelectorAll('li').forEach((li) => {
            const t = li.textContent.trim();
            li.setAttribute('aria-label', t);
            li.textContent = '';
            items.push(...splitInto(li, t, true));
        });
        return { title: titleChars, items };
    });

    // Meer's per-glyph stagger, capped: our skill lists run 2-3x his glyph count and would otherwise swallow the detent
    const perGlyph = (each, n, cap) => Math.min(each, cap / Math.max(1, n - 1));

    function buildTimeline() {
        tl = gsap.timeline({ paused: true });
        const titleIn = [], outStart = [];
        parts.forEach((p, i) => {
            const first = i === 0;
            const t0 = tl.duration();
            const dur = first ? 1 : 0.6;
            const ease = first ? 'power1.out' : 'power4.out';
            inStart[i] = t0;
            tl.fromTo(p.title, { yPercent: 120 }, { yPercent: 0, stagger: 0.03, duration: dur, ease, immediateRender: true }, t0);
            tl.fromTo(p.items, { yPercent: 120 }, { yPercent: 0, stagger: perGlyph(0.04, p.items.length, 1.8), duration: 0.6, ease, immediateRender: true }, t0);
            titleIn[i] = t0 + dur + 0.03 * (p.title.length - 1);
            const rest = tl.duration() + HOLD;
            if (i < N - 1) {
                outStart[i] = rest;
                tl.to(p.title, { yPercent: -120, stagger: 0.02, duration: 1, ease: 'power1.out' }, rest);
                tl.to(p.items, { yPercent: -120, stagger: perGlyph(0.02, p.items.length, 0.9), duration: 1, ease: 'power1.out' }, rest);
            } else {
                tl.to({}, { duration: HOLD }, tl.duration());
            }
        });
        // The wheel turns one arm per category, landing as that category's title settles
        parts.forEach((p, i) => {
            const a = i === 0 ? 0 : outStart[i - 1];
            tl.fromTo(st, { wheel: i }, { wheel: i + 1, duration: titleIn[i] - a, ease: 'power2.inOut', immediateRender: false }, a);
        });
        total = tl.duration();
        const detents = parts.map((p, i) => (i < N - 1 ? outStart[i] - HOLD * 0.5 : total - HOLD * 0.5) / total);
        return [0].concat(detents, [1]);
    }

    function measure() {
        W = sec.clientWidth;
        H = sec.clientHeight;
        S = Math.round(Math.min(W, window.innerHeight) * (W < 650 ? 0.7 : 0.58));
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
        const on = st.travel > 0.0005;
        star.style.opacity = on ? 1 : 0;
        src.classList.toggle('is-detached', on);
        star.style.transform = 'translate3d(' + (cx - S / 2) + 'px,' + (srcY * (1 - e)) + 'px,0) rotate(' + (60 * e + st.angle * 180 / Math.PI) + 'deg) scale(' + (srcS + (1 - srcS) * e) + ')';

        // Bug starts in the top V of the star (same x as its centre) and rides the wheel; x is clamped so the left arc stays on screen
        const th = st.angle - Math.PI / 2;
        const R = S * 0.44 + 40;
        const bx = Math.max(34, Math.min(W - 34, cx + R * Math.cos(th)));
        const by = Math.max(40, Math.min(H - 40, H / 2 + R * Math.sin(th)));
        const m = Math.max(-1, Math.min(1, st.vel / STRIDE_REF));
        const head = th + Math.PI / 2 + (Math.PI / 2) * m;
        bugEl.style.opacity = st.bug;
        bugEl.style.transform = 'translate3d(' + bx + 'px,' + by + 'px,0) rotate(' + head + 'rad) scale(' + (1 + (1 - st.bug) * 0.6) + ')';
        const am = Math.abs(m);
        drawBug(am > 0.05 ? (Math.floor(now / (140 / Math.max(0.4, am))) % 2 ? 'a' : 'b') : 'mid');

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

    function speak(text, hold) {
        clearTimeout(sayTimer);
        ghost.textContent = text;
        typed.textContent = reduced ? text : '';
        bubble.classList.toggle('is-done', reduced);
        bubble.classList.add('is-on');
        say = { text, t0: performance.now(), n: -1, bw: bubble.offsetWidth, bh: bubble.offsetHeight };
        if (hold) sayTimer = setTimeout(hush, text.length * 28 + hold);
    }

    function hush() {
        clearTimeout(sayTimer);
        bubble.classList.remove('is-on');
        say = null;
    }

    function onProgress(self) {
        const t = self.progress * total;
        let next = -1;
        for (let i = 0; i < N; i++) if (t >= inStart[i] + 0.3) next = i;
        if (next === active) return;
        active = next;
        if (active >= 0) speak(CAT_LINES[active], 2600);
    }

    function init() {
        if (reduced) {
            doc.documentElement.classList.add('is-reduced');
            st.travel = 1;
            st.bug = 1;
            measure();
            speak(IDLE_LINE, 0);
            render(0);
            window.addEventListener('resize', () => {
                measure();
                render(0);
            });
            return;
        }

        gsap.registerPlugin(ScrollTrigger);
        const snaps = buildTimeline();
        ScrollTrigger.create({
            trigger: sec, start: 'top bottom', end: 'top top',
            onUpdate: (self) => { st.travelT = self.progress; },
        });
        pinST = ScrollTrigger.create({
            trigger: sec, start: 'top top', end: () => '+=' + Math.round(window.innerHeight * STEP_VH * N),
            pin: true, scrub: 0.7, animation: tl, invalidateOnRefresh: true,
            snap: { snapTo: snaps, duration: { min: 0.35, max: 0.9 }, delay: 0.08, ease: 'power3.inOut' },
            onEnter: () => gsap.to(st, { bug: 1, duration: 0.45, ease: 'steps(4)', overwrite: 'auto' }),
            onLeaveBack: () => {
                gsap.to(st, { bug: 0, duration: 0.3, ease: 'steps(3)', overwrite: 'auto' });
                active = -1;
                hush();
            },
            onUpdate: onProgress,
        });
        ScrollTrigger.addEventListener('refresh', measure);
        measure();

        gsap.ticker.add((time, dt) => {
            const s = Math.max(1, Math.min(dt, 50)) / 1000;
            st.travel += (st.travelT - st.travel) * (1 - Math.exp(-s * 14));
            if (Math.abs(st.travelT - st.travel) < 1e-4) st.travel = st.travelT;
            const a = st.wheel * ARM;
            st.vel += ((a - st.angle) / s - st.vel) * (1 - Math.exp(-s * 10));
            st.angle = a;
            render(time * 1000);
        });

        if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => ScrollTrigger.refresh());
    }

    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
