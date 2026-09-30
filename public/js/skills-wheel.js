// Projects -> Skills: row 16's asterisk drops straight down its own column into slide 04, then turns like a scroll wheel.
// Each detent is one arm (60°) and swaps in the next category with Meer Mohsin's "legacy" per-character rise.
// GLITCH (pixel-bug.js) is leashed to the star's rim while the stage is stuck, then handed back to wandering.
(function () {
    'use strict';
    const doc = document;
    const track = doc.getElementById('skWheel');
    if (!track || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scroller = doc.querySelector('.js-scroller');
    const stage = track.querySelector('.sk__stage');
    const star = track.querySelector('.sk-star');
    const container = track.parentElement;
    const cats = [...track.querySelectorAll('.sk-cat')];
    const N = cats.length;
    const rows = doc.querySelectorAll('#section-projects .projects__entry');
    const srcRow = rows[rows.length - 1] || null;
    const srcIndex = srcRow && srcRow.querySelector('.projects__entry-index');

    const CAT_LINES = [
        'frontend. react 19, gsap, three.js. and still nobody can center me.',
        'backend. fastapi and postgres. i live in the logs now.',
        'ai / ml. pytorch found me in the training data. rude.',
        'seven languages. i only speak segfault.',
        'git, docker, ollama. git blame still says it was me.',
    ];

    const ARM = Math.PI / 3;          // one detent: the asterisk's six arms repeat every 60°
    const HOLD = 1.1;                 // timeline seconds each category rests at its detent
    const STRIDE_REF = ARM * 1.5;     // rad/s that counts as a full walking stride for the bug

    const st = { travel: 0, travelT: 0, wheel: 0, angle: 0, vel: 0 };
    let W = 0, H = 0, S = 0, cx = 0, srcY = 0, srcS = 0.03;
    let tl = null, total = 1, active = -1, visible = false, drawn = -1, detached = false;
    let wantLeash = false, leashed = false;
    const inStart = [];

    const viewW = () => (scroller ? scroller.clientWidth : doc.documentElement.clientWidth);
    const say = (text) => { if (typeof window.__pixelBugSay === 'function') window.__pixelBugSay(text); };

    // Meer's split: every glyph is its own inline-block inside an overflow mask; spaces become nbsp so widths hold
    function splitInto(parent, text, whole) {
        const chars = [];
        const groups = whole ? [text] : text.split(' ');
        groups.forEach((g, gi) => {
            const mk = doc.createElement('span');
            mk.className = 'sk-mk';
            for (const c of g) {
                const ch = doc.createElement('span');
                ch.className = 'sk-ch';
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
        // The track breaks out of the grid to the scroller's full width, so the star is cut by the viewport's left edge
        const cr = container.getBoundingClientRect();
        const pl = parseFloat(getComputedStyle(container).paddingLeft) || 0;
        W = viewW();
        track.style.setProperty('--sk-x', Math.round(-(cr.left + pl)) + 'px');
        track.style.setProperty('--sk-w', W + 'px');
        H = stage.clientHeight;
        S = Math.round(Math.min(W, window.innerHeight) * (W < 650 ? 0.7 : 0.58));
        track.style.setProperty('--sk-S', S + 'px');

        // Row 16's ::before: a 0.8em box flush left in the index cell, vertically centred. Under 650px the index is
        // display:none, so the star leaves from the row's left edge instead.
        let size = 12, sx = W * 0.06, sy = track.getBoundingClientRect().top;
        const ir = srcIndex && srcIndex.getBoundingClientRect();
        if (ir && ir.width > 0) {
            size = 0.8 * parseFloat(getComputedStyle(srcIndex).fontSize);
            sx = ir.left + size / 2;
            sy = ir.top + ir.height / 2;
        } else if (srcRow) {
            const rr = srcRow.getBoundingClientRect();
            sx = rr.left + size / 2;
            sy = rr.top + rr.height / 2;
        }
        cx = sx - stage.getBoundingClientRect().left;
        if (reduced) return;
        // Before it sticks the stage rides the track's top edge, so the star's start offset is measured from there
        srcY = sy - (track.getBoundingClientRect().top + H / 2);
        srcS = size / S;
    }

    const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

    function render() {
        const e = ease(st.travel);
        const on = st.travel > 0.0005;
        star.style.opacity = on ? 1 : 0;
        if (on !== detached) {
            detached = on;
            if (srcIndex) srcIndex.classList.toggle('sk-detached', on);
        }
        star.style.transform = 'translate3d(' + (cx - S / 2) + 'px,' + (srcY * (1 - e)) + 'px,0) rotate(' + (60 * e + st.angle * 180 / Math.PI) + 'deg) scale(' + (srcS + (1 - srcS) * e) + ')';
    }

    // GLITCH starts in the top V of the star and rides the wheel; x is clamped so the left arc stays on screen.
    // Viewport coordinates, read per bug frame so it stays glued to the stage.
    function orbit() {
        const r = stage.getBoundingClientRect();
        const th = st.angle - Math.PI / 2;
        const R = S * 0.44 + 40;
        const m = Math.max(-1, Math.min(1, st.vel / STRIDE_REF));
        return {
            x: r.left + Math.max(34, Math.min(W - 34, cx + R * Math.cos(th))),
            y: r.top + Math.max(40, Math.min(H - 40, H / 2 + R * Math.sin(th))),
            heading: th + (Math.PI / 2) * m,
        };
    }

    function leashOn() {
        wantLeash = true;
    }

    function leashOff() {
        wantLeash = false;
        active = -1;
        if (leashed && typeof window.__pixelBugLeash === 'function') window.__pixelBugLeash(null);
        leashed = false;
        say('');
    }

    function onProgress(self) {
        const t = self.progress * total;
        let next = -1;
        for (let i = 0; i < N; i++) if (t >= inStart[i] + 0.3) next = i;
        if (next === active) return;
        active = next;
        if (active >= 0 && leashed) say(CAT_LINES[active]);
    }

    function init() {
        if (reduced) {
            st.travel = 1;
            measure();
            render();
            window.addEventListener('resize', () => {
                measure();
                render();
            }, { passive: true });
            return;
        }

        gsap.registerPlugin(ScrollTrigger);
        const snaps = buildTimeline();
        const scr = scroller || undefined;
        ScrollTrigger.create({
            trigger: track, scroller: scr, start: 'top bottom', end: 'top top',
            onUpdate: (self) => { st.travelT = self.progress; },
            onRefresh: (self) => { st.travelT = self.progress; },
        });
        ScrollTrigger.create({
            trigger: track, scroller: scr, start: 'top bottom', end: 'bottom top',
            onToggle: (self) => { visible = self.isActive; },
        });
        // The CSS sticky stage does the pinning (the site's own sticky-hero pattern), so this trigger only scrubs and snaps
        ScrollTrigger.create({
            trigger: track, scroller: scr, start: 'top top', end: 'bottom bottom',
            scrub: 0.7, animation: tl, invalidateOnRefresh: true,
            snap: { snapTo: snaps, duration: { min: 0.35, max: 0.9 }, delay: 0.08, ease: 'power3.inOut' },
            onEnter: leashOn,
            onEnterBack: leashOn,
            onLeave: leashOff,
            onLeaveBack: leashOff,
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
            if (visible || st.travel !== drawn) {
                render();
                drawn = st.travel;
            }
            // pixel-bug mounts after the intro, so the hand-over waits for its API rather than racing it
            if (wantLeash && !leashed && typeof window.__pixelBugLeash === 'function') {
                window.__pixelBugLeash(orbit);
                leashed = true;
                if (active >= 0) say(CAT_LINES[active]);
            }
        });

        if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => ScrollTrigger.refresh());
    }

    init();
})();
