// Projects -> Skills: row 16's asterisk drops straight down its own column into slide 04, then turns like a wheel.
// While the stage is stuck, one gesture (wheel flick, trackpad swipe, touch swipe, key) is one 60° detent and one
// category swap; the first detent up and the last detent down hand the page back to normal scrolling.
// GLITCH (pixel-bug.js) is leashed to the star's rim while the stage is stuck, then handed back to wandering.
(function (root) {
    'use strict';

    // Gesture classifier. Times are ms. A gesture ends after GAP of wheel silence, on a direction change, or when a
    // delta surges well above the decaying tail (a new swipe landing on top of trackpad inertia).
    function createIntent(opt) {
        const o = opt || {};
        const GAP = o.gap || 180;
        const LOCK = o.lock || 860;
        const WHEEL_MIN = o.wheelMin || 6;
        const TOUCH_MIN = o.touchMin || 32;
        const TAU = 100;
        let last = -Infinity, dir = 0, acc = 0, peak = 0, tail = 0, spent = false, firedAt = -Infinity, lockUntil = -Infinity;
        let touchY = null, touchSpent = false;

        const fire = (d, t) => {
            spent = true;
            touchSpent = true;
            firedAt = t;
            lockUntil = t + LOCK;
            return d;
        };

        return {
            locked: (t) => t < lockUntil,
            // Entering the stage owns whatever gesture carried the page there, so its inertia can't skip category one
            claim(t) {
                spent = true;
                touchSpent = true;
                firedAt = t;
                lockUntil = t + LOCK;
            },
            wheel(dy, t) {
                const mag = Math.abs(dy);
                if (!mag) return 0;
                const d = dy > 0 ? 1 : -1;
                if (d !== dir && mag < 4 && t - last <= GAP) {
                    last = t;
                    return 0;
                }
                const decayed = tail * Math.exp(-(t - last) / TAU);
                const fresh = t - last > GAP || d !== dir || (mag >= 16 && mag > decayed * 2.5);
                last = t;
                tail = Math.max(mag, decayed);
                if (fresh) {
                    dir = d;
                    acc = 0;
                    peak = 0;
                    spent = false;
                }
                acc += mag;
                peak = Math.max(peak, mag);
                if (t < lockUntil) return 0;
                if (!spent) return acc >= WHEEL_MIN ? fire(d, t) : 0;
                // A mouse wheel that keeps spinning at full strength is new intent; trackpad inertia decays well below its peak
                if (t - firedAt > LOCK + 250 && peak >= 30 && mag >= peak * 0.8) return fire(d, t);
                return 0;
            },
            touchStart(y) {
                touchY = y;
                touchSpent = false;
            },
            touchMove(y, t) {
                if (touchY === null || touchSpent) return 0;
                const dy = touchY - y;
                if (Math.abs(dy) < TOUCH_MIN || t < lockUntil) return 0;
                return fire(dy > 0 ? 1 : -1, t);
            },
            touchEnd() {
                touchY = null;
            },
            key(d, t) {
                return t < lockUntil ? 0 : fire(d, t);
            },
        };
    }

    // Pin zone [A, B] in scroller pixels; detent k rests at A + (B - A) * k / (n - 1).
    function createZone(n, opt) {
        const o = opt || {};
        const TOL = o.tol || 4;
        const DEV = o.dev || 6;
        const z = { pinned: false, step: 0, guard: false, A: 0, B: 0 };
        let prev = null;

        const offset = (k) => Math.round(z.A + (z.B - z.A) * k / (n - 1));
        const nearest = (y) => Math.max(0, Math.min(n - 1, Math.round((y - z.A) / (z.B - z.A) * (n - 1))));
        const inside = (y) => y > z.A + TOL && y < z.B - TOL;
        const engage = (k) => {
            z.pinned = true;
            z.step = k;
            z.guard = false;
            return { type: 'engage', step: k, y: offset(k) };
        };

        z.offset = offset;
        z.frame = (y, A, B, drag, anim) => {
            const moved = A !== z.A || B !== z.B;
            z.A = A;
            z.B = B;
            const p = prev;
            prev = y;
            if (B - A < n) return null;
            if (z.pinned) {
                if (moved) return { type: 'snap', y: offset(z.step) };
                // Anything else moving the page (scrollbar, find-in-page, another script) wins; stepping resumes on re-entry
                if (!anim && Math.abs(y - offset(z.step)) > DEV) {
                    z.pinned = false;
                    z.guard = true;
                    return { type: 'release', external: true };
                }
                return null;
            }
            if (drag) return null;
            if (z.guard) {
                if (inside(y)) return null;
                z.guard = false;
            }
            if (p !== null && p < A && y >= A && y <= B) return engage(0);
            if (p !== null && p > B && y <= B && y >= A) return engage(n - 1);
            if (inside(y)) return engage(nearest(y));
            return null;
        };
        z.input = (d) => {
            if (!z.pinned || !d) return null;
            const to = z.step + d;
            if (to < 0 || to > n - 1) {
                z.pinned = false;
                return { type: 'release', dir: d, y: d < 0 ? z.A : z.B };
            }
            z.step = to;
            return { type: 'step', step: to, y: offset(to) };
        };
        z.external = () => {
            const was = z.pinned;
            z.pinned = false;
            z.guard = true;
            return was ? { type: 'release', external: true } : null;
        };
        z.unguard = () => {
            z.guard = false;
        };
        z.desired = (y) => {
            if (z.pinned) return z.step;
            if (y <= z.A + TOL) return -1;
            if (y >= z.B - TOL) return n - 1;
            return nearest(y);
        };
        return z;
    }

    if (typeof window === 'undefined' && typeof module === 'object' && module && module.exports) {
        module.exports = { createIntent, createZone };
        return;
    }

    const doc = root.document;
    const track = doc.getElementById('skWheel');
    if (!track || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    const reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const narrowMq = root.matchMedia ? root.matchMedia('(max-width: 700px)') : null;

    const scroller = doc.querySelector('.js-scroller');
    const stage = track.querySelector('.sk__stage');
    const star = track.querySelector('.sk-star');
    const railSegs = [...track.querySelectorAll('.sk-rail__seg')];
    const container = track.parentElement;
    const cats = [...track.querySelectorAll('.sk-cat')];
    const N = cats.length;
    const rows = doc.querySelectorAll('#section-projects .projects__entry');
    const srcRow = rows[rows.length - 1] || null;
    const srcIndex = srcRow && srcRow.querySelector('.projects__entry-index');
    if (!scroller || !stage || !star || N < 2) return;

    const CAT_LINES = [
        'frontend. react 19, gsap, three.js. and still nobody can center me.',
        'backend. fastapi and postgres. i live in the logs now.',
        'ai / ml. pytorch found me in the training data. rude.',
        'seven languages. i only speak segfault.',
        'git, docker, ollama. git blame still says it was me.',
    ];

    const ARM = Math.PI / 3;          // one detent: the asterisk's six arms repeat every 60°
    const STRIDE_REF = ARM * 1.5;     // rad/s that counts as a full walking stride for the bug
    const LOCK = 0.86;                // s a detent owns the input; the swap below settles inside it
    const T_OUT = 0.24, CAP_OUT = 0.06, T_IN = 0.52, CAP_IN = 0.12;
    const SHIFT = 135;                // % of a glyph's line box; clears the mask's 0.12em/0.2em padding either way
    const SETTLE = 0.45;              // s to settle onto a detent after the page carries into the stage
    // Detents sit 0.3 viewports apart: under pixel-bug's 1200px/s fast-scroll threshold at this ease and LOCK
    const STEP_VH = 0.3;
    const APP_URL = '/wp-content/themes/lamalama2025/dist/assets/app-DjHRamTc.js';

    const st = { travel: 0, travelT: 0, wheel: 0, angle: 0, vel: 0 };
    const rail = { p: 0, tl: 0, tr: 0, sl: 0, sr: 0 };
    let W = 0, H = 0, S = 0, cx = 0, srcY = 0, srcS = 0.03, A = 0, B = 0, gapPx = 18;
    let geo = [];
    let visible = false, drawn = -1, detached = false, railDirty = true;
    let wantLeash = false, leashed = false;
    let shown = -1, swap = null, spin = null, fill = null;
    let appMod = null, nativeTween = null, animUntil = 0, dragging = false, nudgeAfterTouch = 0;

    const now = () => performance.now();
    const viewW = () => scroller.clientWidth;
    const say = (text) => { if (typeof root.__pixelBugSay === 'function') root.__pixelBugSay(text); };
    const easeScroll = (t) => 0.5 - Math.cos(Math.PI * t) / 2;

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
        const set = cat.querySelector('.sk-set');
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
        set.querySelectorAll('li').forEach((li) => {
            const t = li.textContent.trim();
            li.setAttribute('aria-label', t);
            li.textContent = '';
            items.push(...splitInto(li, t, true));
        });
        return { cat, title: titleChars, items, all: titleChars.concat(items), titleEl: title, setEl: set };
    });

    // ---------- scrolling: the bundle's Lenis when it runs one, the bare .js-scroller otherwise (touch-first devices)

    // Same URL the bundle's module graph resolves, so this is the running module instance; its `n` export is the live App
    function loadApp() {
        import(APP_URL).then((m) => { appMod = m; }).catch(() => {});
    }
    const lenisOf = () => {
        const app = appMod && appMod.n;
        const s = app && app.instances && app.instances.get('scroller');
        return (s && s.lenis) || null;
    };

    function scrollTo(y, dur) {
        const lenis = lenisOf();
        animUntil = now() + dur * 1000 + 120;
        if (lenis) {
            lenis.scrollTo(y, dur > 0 ? { duration: dur, easing: easeScroll, force: true } : { immediate: true, force: true });
            return;
        }
        if (nativeTween) nativeTween.kill();
        nativeTween = null;
        if (dur <= 0) {
            scroller.scrollTop = y;
            return;
        }
        const o = { y: scroller.scrollTop };
        nativeTween = gsap.to(o, { y, duration: dur, ease: 'sine.inOut', onUpdate: () => { scroller.scrollTop = o.y; } });
    }

    // Stopped Lenis still runs forced scrollTo; overflow:hidden is what halts iOS momentum on the bare scroller
    function hold(on) {
        const lenis = lenisOf();
        if (on) {
            if (lenis) lenis.stop();
            else scroller.style.setProperty('overflow-y', 'hidden', 'important');
            return;
        }
        if (lenis) lenis.start();
        scroller.style.removeProperty('overflow-y');
    }

    function nudge(d) {
        const y = scroller.scrollTop + d * H * 0.45;
        const lenis = lenisOf();
        if (lenis) lenis.scrollTo(y, { duration: 0.9 });
        else scrollTo(y, 0.7);
    }

    // ---------- the swap: outgoing glyphs clear their masks before the incoming set rises into the same masks

    const each = (cap, n, rev) => ({ each: Math.min(0.016, cap / Math.max(1, n - 1)), from: rev ? 'end' : 'start' });

    function show(k, dir) {
        const from = shown;
        shown = k;
        if (swap) swap.kill();
        parts.forEach((p, i) => { if (i !== from && i !== k) gsap.set(p.all, { yPercent: SHIFT }); });
        swap = gsap.timeline();
        const rev = dir < 0;
        let at = 0;
        if (from >= 0) {
            const p = parts[from];
            const to = rev ? SHIFT : -SHIFT;
            swap.to(p.title, { yPercent: to, duration: T_OUT, ease: 'power2.in', stagger: each(CAP_OUT, p.title.length, rev) }, 0);
            swap.to(p.items, { yPercent: to, duration: T_OUT, ease: 'power2.in', stagger: each(CAP_OUT, p.items.length, rev) }, 0);
            at = T_OUT + CAP_OUT;
        }
        if (k >= 0) {
            const p = parts[k];
            gsap.set(p.all, { yPercent: rev ? -SHIFT : SHIFT });
            swap.to(p.title, { yPercent: 0, duration: T_IN, ease: 'power4.out', stagger: each(CAP_IN, p.title.length, rev) }, at);
            swap.to(p.items, { yPercent: 0, duration: T_IN, ease: 'power4.out', stagger: each(CAP_IN, p.items.length, rev) }, at);
        }
        if (spin) spin.kill();
        spin = gsap.to(st, { wheel: k + 1, duration: 0.9, ease: 'back.out(1.2)' });
        if (fill) fill.kill();
        const g = geo[Math.max(k, 0)];
        fill = gsap.to(rail, Object.assign({ p: (k + 1) / N, duration: 0.9, ease: 'power3.out', onUpdate: () => { railDirty = true; } }, g || {}));
        if (k >= 0 && leashed) say(CAT_LINES[k]);
    }

    // ---------- geometry

    // Caps sit off-centre in their line box by (ascent - descent - capHeight) / 2; shifting by it puts the ink on the axis
    let inkCtx = null;
    function inkShift(el) {
        if (!inkCtx) inkCtx = doc.createElement('canvas').getContext('2d');
        if (!inkCtx) return 0;
        const cs = getComputedStyle(el);
        inkCtx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        const m = inkCtx.measureText('H');
        if (!m.fontBoundingBoxAscent || !m.actualBoundingBoxAscent) return 0;
        return (m.fontBoundingBoxAscent - m.fontBoundingBoxDescent - m.actualBoundingBoxAscent) / 2;
    }

    function spanX(els, left) {
        let a = Infinity, b = -Infinity;
        els.forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.width <= 0) return;
            a = Math.min(a, r.left - left);
            b = Math.max(b, r.right - left);
        });
        return a < b ? [a, b] : [0, 0];
    }

    // --sk-h drives the track's scroll length, so it changes only on resize, ahead of ScrollTrigger's debounced refresh
    function syncHeight() {
        const h = scroller.clientHeight;
        if (h && h !== H) {
            H = h;
            track.style.setProperty('--sk-h', h + 'px');
            track.style.setProperty('--sk-steps', String(N - 1));
            track.style.setProperty('--sk-step', String(STEP_VH));
            return true;
        }
        return false;
    }

    function measure() {
        // The track breaks out of the grid to the scroller's full width, so the star is cut by the viewport's left edge
        const cr = container.getBoundingClientRect();
        const pl = parseFloat(getComputedStyle(container).paddingLeft) || 0;
        W = viewW();
        track.style.setProperty('--sk-x', Math.round(-(cr.left + pl)) + 'px');
        track.style.setProperty('--sk-w', W + 'px');
        S = Math.round(Math.min(W, H) * (W < 650 ? 0.7 : 0.58));
        track.style.setProperty('--sk-S', S + 'px');
        gapPx = Math.max(14, Math.min(26, W * 0.014));

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
        const sr = stage.getBoundingClientRect();
        cx = sx - sr.left;

        // The text column opens a few gaps past the star's resting right arm (x 3..21 of the 24-unit glyph)
        const narrow = !!(narrowMq && narrowMq.matches);
        const tx = Math.round(Math.max(narrow ? 0 : W * 0.29, cx + S * 9 / 24 + gapPx * 3));
        track.style.setProperty('--sk-tx', tx + 'px');
        track.style.setProperty('--sk-fit', '1');
        track.style.removeProperty('--sk-tw');
        let col;
        if (narrow) {
            col = parts[0].cat.getBoundingClientRect().width;
        } else {
            let setLeft = Infinity;
            parts.forEach((p) => { setLeft = Math.min(setLeft, p.setEl.getBoundingClientRect().left - sr.left); });
            col = setLeft - gapPx * 3 - tx;
            track.style.setProperty('--sk-tw', Math.max(0, Math.round(col)) + 'px');
        }
        let widest = 0;
        parts.forEach((p) => {
            p.titleEl.querySelectorAll(':scope > .sk-mk').forEach((mk) => { widest = Math.max(widest, mk.getBoundingClientRect().width); });
        });
        if (widest > 0 && col > 0) track.style.setProperty('--sk-fit', Math.max(0.5, Math.min(1, col / widest)).toFixed(4));
        if (narrow) {
            track.style.setProperty('--sk-ty', '0px');
            track.style.setProperty('--sk-sy', '0px');
        } else {
            track.style.setProperty('--sk-ty', inkShift(parts[0].titleEl).toFixed(2) + 'px');
            track.style.setProperty('--sk-sy', inkShift(parts[0].setEl).toFixed(2) + 'px');
        }

        // Where the rail breaks for each category's words (title ink, then the skills column), in stage pixels
        geo = parts.map((p) => {
            const t = spanX(p.titleEl.querySelectorAll(':scope > .sk-mk'), sr.left);
            const s = spanX(p.setEl.querySelectorAll('.sk-mk'), sr.left);
            return { tl: t[0], tr: t[1], sl: s[0], sr: s[1] };
        });
        if (fill) fill.kill();
        fill = null;
        Object.assign(rail, geo[Math.max(shown, 0)], { p: (shown + 1) / N });
        railDirty = true;

        const tr = track.getBoundingClientRect();
        const scr = scroller.getBoundingClientRect();
        A = Math.round(tr.top - scr.top + scroller.scrollTop);
        B = A + Math.round(track.offsetHeight - scroller.clientHeight);

        if (reduced) return;
        // Before it sticks the stage rides the track's top edge, so the star's start offset is measured from there
        srcY = sy - (tr.top + H / 2);
        srcS = size / S;
    }

    // ---------- drawing

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

    // Three 100%-wide segments, each placed and cut to length by transform alone; progress fills the visible length
    function renderRail() {
        railDirty = false;
        if (!railSegs.length || !W) return;
        let holes = [[rail.tl - gapPx, rail.tr + gapPx], [rail.sl - gapPx, rail.sr + gapPx]]
            .filter((h) => h[1] > h[0] + gapPx * 2)
            .sort((a, b) => a[0] - b[0]);
        if (holes.length === 2 && holes[1][0] <= holes[0][1]) holes = [[holes[0][0], Math.max(holes[0][1], holes[1][1])]];
        const segs = [];
        let x = 0;
        holes.forEach((h) => {
            segs.push([x, Math.max(x, h[0])]);
            x = Math.max(x, h[1]);
        });
        segs.push([x, Math.max(x, W)]);
        let total = 0;
        segs.forEach((s) => { total += s[1] - s[0]; });
        let left = rail.p * total;
        railSegs.forEach((el, i) => {
            const s = segs[i];
            const len = s ? s[1] - s[0] : 0;
            const d = Math.max(0, Math.min(len, left));
            left -= d;
            el.style.transform = 'translate3d(' + (s ? s[0] : 0) + 'px,0,0) scaleX(' + (d / W) + ')';
        });
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

    function leashOff() {
        wantLeash = false;
        if (leashed && typeof root.__pixelBugLeash === 'function') root.__pixelBugLeash(null);
        leashed = false;
        say('');
    }

    // ---------- stepping

    const zone = createZone(N);
    const intent = createIntent({ lock: LOCK * 1000 });

    function run(act) {
        if (!act) return;
        if (act.type === 'engage') {
            hold(true);
            intent.claim(now());
            scrollTo(act.y, SETTLE);
        } else if (act.type === 'step') {
            scrollTo(act.y, LOCK);
        } else if (act.type === 'snap') {
            scrollTo(act.y, 0);
        } else if (act.type === 'release') {
            if (!act.external) scrollTo(act.y, 0);
            hold(false);
        }
    }

    function inScope(t) {
        if (!t || t.nodeType !== 1) return false;
        if (t.closest('[data-lenis-prevent],[data-lenis-prevent-wheel]')) return false;
        return scroller.contains(t) || !!t.closest('.pb-bug');
    }

    // Lenis skips events flagged lenisStopPropagation, so a swallowed gesture never reaches its smooth scroll
    function swallow(e) {
        e.lenisStopPropagation = true;
        if (e.cancelable) e.preventDefault();
    }

    function onWheel(e) {
        if (e.ctrlKey) return;
        let dy = e.deltaY;
        if (e.deltaMode === 1) dy *= 16;
        else if (e.deltaMode === 2) dy *= H;
        if (Math.abs(e.deltaX) > Math.abs(dy)) dy = 0;
        if (zone.pinned && !inScope(e.target)) return;
        const d = intent.wheel(dy, now());
        if (!zone.pinned) return;
        const act = zone.input(d);
        // The releasing event is left alone, so Lenis (or the browser) scrolls it as the first move of normal scrolling
        if (act && act.type === 'release') {
            run(act);
            return;
        }
        swallow(e);
        run(act);
    }

    function onTouchStart(e) {
        if (nativeTween && !zone.pinned) {
            nativeTween.kill();
            nativeTween = null;
        }
        if (e.touches.length === 1) intent.touchStart(e.touches[0].clientY);
        else intent.touchEnd();
    }

    function onTouchMove(e) {
        if (!zone.pinned || e.touches.length !== 1 || !inScope(e.target)) return;
        swallow(e);
        const act = zone.input(intent.touchMove(e.touches[0].clientY, now()));
        if (act && act.type === 'release') nudgeAfterTouch = act.dir;
        run(act);
    }

    // A touch whose first move was cancelled never scrolls natively, so the release is carried after the finger lifts
    function onTouchEnd() {
        intent.touchEnd();
        if (!nudgeAfterTouch) return;
        const d = nudgeAfterTouch;
        nudgeAfterTouch = 0;
        requestAnimationFrame(() => nudge(d));
    }

    function onKey(e) {
        if (!zone.pinned || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
        const t = e.target;
        if (t && t.nodeType === 1 && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
        let d = 0;
        switch (e.key) {
            case 'ArrowDown': case 'PageDown': d = 1; break;
            case 'ArrowUp': case 'PageUp': d = -1; break;
            case ' ': case 'Spacebar':
                if (t && t.nodeType === 1 && t.closest('button, a, [role="button"]')) return;
                d = e.shiftKey ? -1 : 1;
                break;
            case 'Home': case 'End': run(zone.external()); return;
            default: return;
        }
        e.preventDefault();
        const act = zone.input(intent.key(d, now()));
        run(act);
        if (act && act.type === 'release') nudge(act.dir);
    }

    // The scrollbar is the scroller's own box past its client width
    function onPointerDown(e) {
        if (e.target !== scroller || e.clientX < scroller.getBoundingClientRect().left + scroller.clientWidth) return;
        dragging = true;
        run(zone.external());
    }

    function onPointerUp() {
        if (!dragging) return;
        dragging = false;
        zone.unguard();
    }

    function onClick(e) {
        if (!zone.pinned) return;
        const a = e.target && e.target.closest && e.target.closest('a[href*="#"]');
        if (a) run(zone.external());
    }

    function tick(time, dt) {
        const s = Math.max(1, Math.min(dt, 50)) / 1000;
        const y = scroller.scrollTop;
        run(zone.frame(y, A, B, dragging, now() < animUntil));
        if (zone.pinned) {
            const lenis = lenisOf();
            if (lenis && !lenis.isStopped) lenis.stop();
        }
        const want = zone.desired(y);
        if (want !== shown) show(want, want > shown ? 1 : -1);
        const held = zone.pinned || (y > A && y < B);
        if (held && !wantLeash) wantLeash = true;
        else if (!held && wantLeash) leashOff();

        st.travel += (st.travelT - st.travel) * (1 - Math.exp(-s * 14));
        if (Math.abs(st.travelT - st.travel) < 1e-4) st.travel = st.travelT;
        const a = st.wheel * ARM;
        st.vel += ((a - st.angle) / s - st.vel) * (1 - Math.exp(-s * 10));
        st.angle = a;
        if (visible || st.travel !== drawn) {
            render();
            drawn = st.travel;
        }
        if (railDirty && (visible || rail.p === 0)) renderRail();
        // pixel-bug mounts after the intro, so the hand-over waits for its API rather than racing it
        if (wantLeash && !leashed && typeof root.__pixelBugLeash === 'function') {
            root.__pixelBugLeash(orbit);
            leashed = true;
            if (shown >= 0) say(CAT_LINES[shown]);
        }
    }

    function init() {
        track.classList.add('is-live');
        syncHeight();
        if (reduced) {
            st.travel = 1;
            measure();
            render();
            root.addEventListener('resize', () => {
                syncHeight();
                measure();
                render();
            }, { passive: true });
            return;
        }

        gsap.registerPlugin(ScrollTrigger);
        gsap.set(parts.flatMap((p) => p.all), { yPercent: SHIFT });
        ScrollTrigger.create({
            trigger: track, scroller, start: 'top bottom', end: 'top top',
            onUpdate: (self) => { st.travelT = self.progress; },
            onRefresh: (self) => { st.travelT = self.progress; },
        });
        ScrollTrigger.create({
            trigger: track, scroller, start: 'top bottom', end: 'bottom top',
            onToggle: (self) => { visible = self.isActive; },
        });
        // The CSS sticky stage does the pinning (the site's own sticky-hero pattern); the stepper holds the page on detents
        let refreshTimer = 0;
        const refreshSoon = () => {
            clearTimeout(refreshTimer);
            refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 220);
        };
        ScrollTrigger.addEventListener('refresh', () => {
            if (syncHeight()) refreshSoon();
            measure();
        });
        // ScrollTrigger ignores height-only resizes on touch devices, but the track's length follows the height
        root.addEventListener('resize', () => { if (syncHeight()) refreshSoon(); }, { passive: true });
        measure();

        root.addEventListener('wheel', onWheel, { capture: true, passive: false });
        root.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
        root.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
        root.addEventListener('touchend', onTouchEnd, { capture: true, passive: true });
        root.addEventListener('touchcancel', onTouchEnd, { capture: true, passive: true });
        root.addEventListener('keydown', onKey, { capture: true });
        scroller.addEventListener('pointerdown', onPointerDown, { passive: true });
        root.addEventListener('pointerup', onPointerUp, { passive: true });
        root.addEventListener('pointercancel', onPointerUp, { passive: true });
        doc.addEventListener('click', onClick, true);

        gsap.ticker.add(tick);
        if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', loadApp, { once: true });
        else loadApp();
        if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => ScrollTrigger.refresh());
    }

    init();
})(typeof window !== 'undefined' ? window : globalThis);
