(() => {
    const INK = '#121316';
    const PAPER = '#f4f2ea';
    const SIG = '#FFED29';

    const coarseMq = matchMedia('(hover: none), (pointer: coarse)');
    const reducedMq = matchMedia('(prefers-reduced-motion: reduce)');

    const concepts = [];
    let active = null;
    let raf = 0;
    let started = false;
    let scroller = null;

    const core = {
        INK, PAPER, SIG,
        x: innerWidth / 2, y: innerHeight / 2,
        lx: innerWidth / 2, ly: innerHeight / 2,
        vx: 0, vy: 0, speed: 0,
        down: false, seen: false,
        hover: null, zone: 'void',
        scrollX: 0, scrollY: 0,
        reduced: reducedMq.matches,
        enabled: false,
        w: innerWidth, h: innerHeight, dpr: 1,
        canvas: null, ctx: null,
        dot: null, label: null, labelSpan: null,
        pose: { x: 0, y: 0, sx: 1, sy: 1, rot: 0 },
        labelPose: null,
        labelVisible: false,
        t: 0, dt: 0
    };

    let targets = [];
    let zones = [];
    let moved = false;
    let needsHit = true;
    let labelOwned = false;
    let labelText = '';
    let labelShown = false;
    let labelX = core.x, labelY = core.y;
    let scaleX = 1, scaleY = 1;
    let onPaper = null;
    let last = 0;

    function readScroll() {
        if (scroller) {
            core.scrollX = scroller.scrollLeft;
            core.scrollY = scroller.scrollTop;
        } else {
            core.scrollX = window.scrollX;
            core.scrollY = window.scrollY;
        }
    }

    function entry(el, extra) {
        const r = el.getBoundingClientRect();
        const fixed = !!el.closest('[data-cursor-fixed]');
        return Object.assign({
            el, fixed,
            l: r.left + (fixed ? 0 : core.scrollX),
            t: r.top + (fixed ? 0 : core.scrollY),
            w: r.width, h: r.height
        }, extra);
    }

    function measure() {
        readScroll();
        targets = Array.from(document.querySelectorAll('[data-cursor]')).map(el => {
            const tag = el.dataset.cursor;
            const kind = el.dataset.cursorKind || (tag === 'TEXT' ? 'text' : tag === 'DRAG' ? 'drag' : 'target');
            return entry(el, { tag, kind });
        });
        zones = Array.from(document.querySelectorAll('[data-zone]')).map(el => entry(el, { zone: el.dataset.zone }));
        needsHit = true;
    }

    function pick(list, x, y) {
        let best = null;
        let bestArea = Infinity;
        for (let i = 0; i < list.length; i++) {
            const it = list[i];
            const px = it.fixed ? x : x + core.scrollX;
            const py = it.fixed ? y : y + core.scrollY;
            if (px < it.l || px > it.l + it.w || py < it.t || py > it.t + it.h) continue;
            const area = it.w * it.h - (it.fixed ? 1e12 : 0);
            if (area < bestArea) { bestArea = area; best = it; }
        }
        return best;
    }

    core.zoneAt = (x, y) => {
        const z = pick(zones, x, y);
        return z ? z.zone : 'void';
    };

    core.rectOf = (it) => ({
        x: it.l - (it.fixed ? 0 : core.scrollX),
        y: it.t - (it.fixed ? 0 : core.scrollY),
        w: it.w, h: it.h
    });

    core.shift = (el, dx, dy) => {
        for (const list of [targets, zones]) {
            for (const it of list) {
                if (it.el === el || el.contains(it.el)) { it.l += dx; it.t += dy; }
            }
        }
        needsHit = true;
    };

    core.measure = measure;

    core.setLabel = (text) => {
        if (text === labelText || !core.labelSpan) return;
        labelText = text;
        core.labelSpan.textContent = text;
    };

    function hitTest() {
        const next = core.seen ? pick(targets, core.x, core.y) : null;
        const zone = core.zoneAt(core.x, core.y);
        core.zone = zone;
        const paper = zone === 'paper';
        if (paper !== onPaper) {
            onPaper = paper;
            core.dot.classList.toggle('is-on-paper', paper);
            core.label.classList.toggle('is-on-paper', paper);
        }
        const prev = core.hover;
        if ((next && next.el) === (prev && prev.el)) {
            core.hover = next;
            return;
        }
        core.hover = next;
        core.dot.classList.toggle('is-hovering', !!next && next.kind !== 'text');
        labelOwned = !!(active && active.onHover && active.onHover(core, next, prev));
        if (!labelOwned) {
            if (next && next.kind !== 'text') core.setLabel('[ ' + next.tag + ' ]');
            core.labelVisible = !!next && next.kind !== 'text';
        }
    }

    function resize() {
        core.w = innerWidth;
        core.h = innerHeight;
        core.dpr = Math.min(2, window.devicePixelRatio || 1);
        const c = core.canvas;
        c.width = Math.round(core.w * core.dpr);
        c.height = Math.round(core.h * core.dpr);
        c.style.width = core.w + 'px';
        c.style.height = core.h + 'px';
        core.ctx.setTransform(core.dpr, 0, 0, core.dpr, 0, 0);
        if (active && active.resize) active.resize(core);
        measure();
    }

    function spring(cur, target, dt, rate) {
        return cur + (target - cur) * (1 - Math.exp(-dt * rate));
    }

    function frame(now) {
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
        last = now;
        core.t = now / 1000;
        core.dt = dt;

        const f = dt * 60;
        const dx = (core.x - core.lx) / f;
        const dy = (core.y - core.ly) / f;
        core.lx = core.x;
        core.ly = core.y;
        const k = 1 - Math.exp(-dt * 14);
        core.vx += (dx - core.vx) * k;
        core.vy += (dy - core.vy) * k;
        core.speed = Math.hypot(core.vx, core.vy);

        if (moved || needsHit) {
            hitTest();
            moved = false;
            needsHit = false;
        }

        const h = core.hover;
        const text = !!h && h.kind === 'text';
        let s = 1;
        if (h && h.kind === 'target') s = 1.5;
        if (h && h.kind === 'drag') s = core.down ? 1.1 : 1.8;
        if (core.down) s *= 0.72;
        scaleX = spring(scaleX, text ? 0.25 : s, dt, 22);
        scaleY = spring(scaleY, text ? 2.75 : s, dt, 22);

        const pose = core.pose;
        pose.x = core.x;
        pose.y = core.y;
        pose.sx = scaleX;
        pose.sy = scaleY;
        pose.rot = 0;
        core.labelPose = null;

        if (active && active.frame) active.frame(core, dt, core.t);

        core.dot.style.transform = 'translate3d(' + pose.x.toFixed(2) + 'px,' + pose.y.toFixed(2) + 'px,0) translate(-50%,-50%) rotate(' +
            pose.rot.toFixed(4) + 'rad) scale(' + pose.sx.toFixed(3) + ',' + pose.sy.toFixed(3) + ')';

        const lp = core.labelPose || { x: core.x + 16, y: core.y + 16 };
        const lk = core.reduced ? 1 : 1 - Math.exp(-dt * 10);
        labelX += (lp.x - labelX) * lk;
        labelY += (lp.y - labelY) * lk;
        core.label.style.transform = 'translate3d(' + labelX.toFixed(2) + 'px,' + labelY.toFixed(2) + 'px,0)';

        const show = core.seen && core.labelVisible;
        if (show !== labelShown) {
            labelShown = show;
            core.label.classList.toggle('is-visible', show);
        }
    }

    function clearCanvas() {
        const { ctx } = core;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, core.canvas.width, core.canvas.height);
        ctx.restore();
    }
    core.clear = clearCanvas;

    function build() {
        const canvas = document.createElement('canvas');
        canvas.className = 'cl-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        const dot = document.getElementById('siteCursorDot') || document.createElement('div');
        dot.className = 'site-cursor-dot';
        dot.id = 'siteCursorDot';
        let label = document.getElementById('cursorLabel');
        if (!label) {
            label = document.createElement('div');
            label.id = 'cursorLabel';
            label.innerHTML = '<div class="ll-part--tag-item"><span class="js-text-container"></span></div>';
        }
        label.className = 'js-cursor-label';
        label.setAttribute('aria-hidden', 'true');
        document.body.append(canvas, label, dot);
        core.canvas = canvas;
        core.ctx = canvas.getContext('2d');
        core.dot = dot;
        core.label = label;
        core.labelSpan = label.querySelector('.js-text-container');
    }

    function setEnabled(on) {
        core.enabled = on;
        document.documentElement.classList.toggle('cl-has-cursor', on);
        if (!core.canvas) return;
        core.canvas.hidden = !on;
        core.dot.hidden = !on;
        core.label.hidden = !on;
        if (on && !raf) { last = 0; raf = requestAnimationFrame(frame); }
        if (!on && raf) { cancelAnimationFrame(raf); raf = 0; clearCanvas(); }
    }

    function onMove(e) {
        if (e.pointerType === 'touch') return;
        if (!core.enabled) setEnabled(true);
        core.x = e.clientX;
        core.y = e.clientY;
        if (!core.seen) {
            core.seen = true;
            core.lx = core.x;
            core.ly = core.y;
            labelX = core.x + 16;
            labelY = core.y + 16;
            core.dot.classList.remove('is-hidden');
        }
        moved = true;
    }

    function onDown(e) {
        if (e.pointerType === 'touch') { setEnabled(false); return; }
        if (e.button !== 0) return;
        core.x = e.clientX;
        core.y = e.clientY;
        core.down = true;
        core.label.classList.add('is-pressed');
        if (active && active.onDown) active.onDown(core);
    }

    function onUp(e) {
        if (!core.down) return;
        core.down = false;
        core.label.classList.remove('is-pressed');
        if (active && active.onUp) active.onUp(core);
    }

    function onScroll() {
        readScroll();
        needsHit = true;
    }

    const api = {
        core,
        concepts,
        register(mod) {
            concepts.push(mod);
            concepts.sort((a, b) => a.index - b.index);
            return mod;
        },
        get active() { return active; },
        use(id) {
            const mod = typeof id === 'object' ? id : concepts.find(c => c.id === id || c.index === Number(id));
            if (!mod || mod === active) return active;
            if (active && active.unmount) active.unmount(core);
            if (core.canvas) clearCanvas();
            active = mod;
            labelOwned = false;
            core.labelVisible = false;
            if (core.canvas && mod.mount) mod.mount(core);
            const h = core.hover;
            core.hover = null;
            needsHit = true;
            if (h) moved = true;
            document.dispatchEvent(new CustomEvent('cursorlab:change', { detail: mod }));
            return mod;
        },
        start(opts = {}) {
            if (started) return api;
            started = true;
            scroller = opts.scroller || null;
            if (coarseMq.matches) {
                document.dispatchEvent(new CustomEvent('cursorlab:touch'));
                return api;
            }
            build();
            core.dot.classList.add('is-hidden');
            resize();
            setEnabled(true);
            if (active && active.mount) active.mount(core);

            addEventListener('pointermove', onMove, { passive: true });
            addEventListener('pointerdown', onDown, { passive: true });
            addEventListener('pointerup', onUp, { passive: true });
            addEventListener('pointercancel', onUp, { passive: true });
            addEventListener('blur', onUp);
            (scroller || window).addEventListener('scroll', onScroll, { passive: true });
            addEventListener('resize', resize);
            document.documentElement.addEventListener('mouseleave', () => {
                core.seen = false;
                core.dot.classList.add('is-hidden');
                needsHit = true;
            });
            if ('ResizeObserver' in window) new ResizeObserver(() => { needsHit = true; measure(); }).observe(document.body);
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
            reducedMq.addEventListener('change', e => {
                core.reduced = e.matches;
                clearCanvas();
            });
            coarseMq.addEventListener('change', e => setEnabled(!e.matches));
            return api;
        }
    };

    window.CursorLab = api;
})();
