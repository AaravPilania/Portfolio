// Slide 05, Experience: masked rises (per character for display lines, per line for prose), the pipeline's hairline
// drawn by the scroll, odometer numbers and the internship's live day count. Without GSAP, or with reduced motion,
// the section stays as authored: everything visible, nothing moves.
(function (root) {
    'use strict';

    const DAY = 864e5;
    // [y, m (0-based), d] from 'YYYY-MM-DD'
    function parseDate(s) {
        const p = String(s).split('-').map(Number);
        return [p[0], p[1] - 1, p[2]];
    }
    // Both ends inclusive, counted in the visitor's calendar days
    function tenure(now, start, end) {
        const d0 = Date.UTC(start[0], start[1], start[2]), d1 = Date.UTC(end[0], end[1], end[2]);
        const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
        const total = Math.round((d1 - d0) / DAY) + 1;
        const day = Math.round((today - d0) / DAY) + 1;
        return { day: Math.max(0, Math.min(day, total)), total, state: day < 1 ? 'upcoming' : day > total ? 'done' : 'live' };
    }

    if (typeof module === 'object' && module.exports) module.exports = { parseDate, tenure };
    const doc = root.document;
    if (!doc) return;
    const section = doc.querySelector('.ll-section--experience');
    if (!section) return;

    const status = section.querySelector('.js-xp-status');
    let done = 1;
    if (status && status.dataset.start && status.dataset.end) {
        const t = tenure(new Date(), parseDate(status.dataset.start), parseDate(status.dataset.end));
        const label = status.querySelector('.js-xp-state'), dayEl = status.querySelector('.js-xp-day');
        status.dataset.state = t.state;
        if (label) label.textContent = t.state === 'done' ? 'Completed' : t.state === 'upcoming' ? 'Starting' : 'In progress';
        if (dayEl) dayEl.textContent = t.state === 'live' ? 'Day ' + t.day + ' / ' + t.total : '';
        done = t.state === 'upcoming' ? 0 : t.day / t.total;
        status.style.setProperty('--xp-done', done.toFixed(4));
    }

    const pipe = section.querySelector('.xp-pipe');
    const line = pipe && pipe.querySelector('.xp-pipe__line');
    const nodes = pipe ? [...pipe.querySelectorAll('.xp-step__node .xp-star')] : [];
    // The hairline runs from the first stage's asterisk to the last one's, measured without transforms
    function placeLine() {
        if (!line || nodes.length < 2) return;
        const centre = (star) => {
            let y = star.offsetHeight / 2, n = star;
            while (n && n !== pipe) { y += n.offsetTop; n = n.offsetParent; }
            return y;
        };
        const a = centre(nodes[0]), b = centre(nodes[nodes.length - 1]);
        line.style.top = a + 'px';
        line.style.height = Math.max(0, b - a) + 'px';
    }
    const ready = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();

    const gsap = root.gsap, ScrollTrigger = root.ScrollTrigger;
    const reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scroller = doc.querySelector('.js-scroller');
    if (reduced || !gsap || !ScrollTrigger || !scroller) {
        ready.then(placeLine);
        root.addEventListener('resize', placeLine, { passive: true });
        return;
    }
    gsap.registerPlugin(ScrollTrigger);

    const EASE = 'expo.out';
    const RISE = 115;                 // % of a glyph or line box; clears the mask's 0.1em / 0.16em padding
    const LINE_AT = '72%';            // the pipeline's drawing tip and its stage triggers share this viewport line

    // Words are runs of non-space across inline children; each piece remembers the inline elements it sat in
    function words(el) {
        const out = [];
        let cur = null;
        (function walk(node, wrap) {
            node.childNodes.forEach((n) => {
                if (n.nodeType === 3) {
                    n.textContent.split(/(\s+)/).forEach((part) => {
                        if (!part) return;
                        if (!part.trim()) { cur = null; return; }
                        if (!cur) out.push(cur = []);
                        cur.push({ text: part, wrap });
                    });
                } else if (n.nodeType === 1) {
                    walk(n, wrap.concat(n));
                }
            });
        })(el, []);
        return out;
    }

    // Rebuilds el from its authored markup: a screen-reader copy, then the visible copy as line masks
    function split(el) {
        const chars = el.dataset.xp === 'chars';
        if (!el.__xp) el.__xp = { html: el.innerHTML, text: el.textContent.replace(/\s+/g, ' ').trim() };
        else el.innerHTML = el.__xp.html;
        const wEls = words(el).map((pieces) => {
            const w = doc.createElement('span');
            w.className = 'xp-w';
            pieces.forEach((p) => {
                let host = w;
                p.wrap.forEach((src) => {
                    const c = src.cloneNode(false);
                    c.removeAttribute('data-xp');
                    host.appendChild(c);
                    host = c;
                });
                if (chars) {
                    for (const ch of p.text) {
                        const c = doc.createElement('span');
                        c.className = 'xp-c';
                        c.textContent = ch;
                        host.appendChild(c);
                    }
                } else {
                    host.appendChild(doc.createTextNode(p.text));
                }
            });
            return w;
        });
        const sr = doc.createElement('span');
        sr.className = 'xp-sr';
        sr.textContent = el.__xp.text;
        const vis = doc.createElement('span');
        vis.setAttribute('aria-hidden', 'true');
        wEls.forEach((w, i) => {
            if (i) vis.appendChild(doc.createTextNode(' '));
            vis.appendChild(w);
        });
        el.textContent = '';
        el.append(sr, vis);
        const lines = [];
        let top = null;
        wEls.forEach((w) => {
            const t = w.offsetTop;
            if (top === null || Math.abs(t - top) > 2) { lines.push([]); top = t; }
            lines[lines.length - 1].push(w);
        });
        vis.textContent = '';
        lines.forEach((ws) => {
            const ln = doc.createElement('span'), li = doc.createElement('span');
            ln.className = 'xp-ln';
            li.className = 'xp-li';
            ws.forEach((w, i) => {
                if (i) li.appendChild(doc.createTextNode(' '));
                li.appendChild(w);
            });
            ln.appendChild(li);
            vis.appendChild(ln);
        });
        el.__xpTargets = [...vis.querySelectorAll(chars ? '.xp-c' : '.xp-li')];
        el.__xpLines = lines.length;
    }

    // Each digit is a window sized by its final glyph, with two 0-9 runs rolling behind it
    function odometer(el) {
        const text = el.textContent.trim();
        const sr = doc.createElement('span'), vis = doc.createElement('span');
        sr.className = 'xp-sr';
        sr.textContent = text;
        vis.setAttribute('aria-hidden', 'true');
        el.__xpCols = [];
        for (const ch of text) {
            if (!/\d/.test(ch)) { vis.appendChild(doc.createTextNode(ch)); continue; }
            const od = doc.createElement('span'), size = doc.createElement('span'), col = doc.createElement('span');
            od.className = 'xp-od';
            size.className = 'xp-od__size';
            size.textContent = ch;
            col.className = 'xp-od__col';
            for (let k = 0; k < 20; k++) {
                const d = doc.createElement('span');
                d.textContent = String(k % 10);
                col.appendChild(d);
            }
            od.append(size, col);
            vis.appendChild(od);
            el.__xpCols.push({ col, to: -(10 + Number(ch)) * 5 });
        }
        el.textContent = '';
        el.append(sr, vis);
        gsap.set(el.__xpCols.map((c) => c.col), { x: 0, y: 0, xPercent: -50, yPercent: 0 });
    }

    const blocks = [...section.querySelectorAll('[data-xp-block]')];
    const own = (block) => {
        const items = [...block.querySelectorAll('[data-xp]')];
        if (block.hasAttribute('data-xp')) items.unshift(block);
        return items.filter((it) => it.closest('[data-xp-block]') === block);
    };
    const splits = blocks.flatMap((b) => own(b)).filter((it) => it.dataset.xp === 'chars' || it.dataset.xp === 'lines');
    const clock = section.querySelector('.js-xp-clock');
    let splitW = 0;

    function resplit() {
        splitW = section.clientWidth;
        splits.forEach(split);
        blocks.forEach((b) => { if (b.__xpShown) settle(b); });
    }

    // A revealed block after a re-split: its fresh spans take the end state
    function settle(block) {
        own(block).forEach((it) => {
            if (it.__xpTargets) gsap.set(it.__xpTargets, { y: 0, yPercent: 0 });
        });
    }

    function reveal(block) {
        if (block.__xpShown) return;
        block.__xpShown = true;
        const tl = gsap.timeline();
        let at = 0;
        own(block).forEach((it) => {
            const kind = it.dataset.xp;
            if (kind === 'chars' || kind === 'lines') {
                const t = it.__xpTargets || [];
                const each = kind === 'chars' ? Math.min(0.022, 0.55 / Math.max(1, t.length)) : 0.075;
                tl.fromTo(t, { y: 0, yPercent: RISE }, { y: 0, yPercent: 0, duration: kind === 'chars' ? 1.05 : 1.15, ease: EASE, stagger: each }, at);
                at += kind === 'chars' ? 0.1 + Math.min(0.3, t.length * each * 0.35) : 0.07 * Math.max(1, it.__xpLines || 1);
            } else if (kind === 'rule') {
                tl.fromTo(it, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: EASE }, at);
                at += 0.08;
            } else if (kind === 'fade') {
                tl.fromTo(it, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1, ease: EASE }, at);
                at += 0.1;
            } else if (kind === 'star') {
                tl.fromTo(it, { opacity: 0, scale: 0.2, rotation: -120 }, { opacity: 1, scale: 1, rotation: 0, duration: 1.3, ease: EASE }, at);
                at += 0.08;
            } else if (kind === 'num') {
                tl.set(it.__xpCols.map((c) => c.col), { yPercent: 0 }, at);
                it.__xpCols.forEach((c, i) => {
                    tl.to(c.col, { yPercent: c.to, duration: 1.9 + 0.14 * i, ease: 'expo.inOut' }, at + 0.05 * i);
                });
                at += 0.14;
            }
        });
        if (clock && block.contains(clock)) tl.fromTo(clock, { scaleX: 0 }, { scaleX: done, duration: 1.8, ease: EASE }, 0.5);
    }

    function arm() {
        resplit();
        section.querySelectorAll('[data-xp="num"]').forEach(odometer);
        placeLine();
        section.classList.add('is-armed');

        ScrollTrigger.addEventListener('refreshInit', () => {
            if (section.clientWidth !== splitW) resplit();
            placeLine();
        });

        blocks.forEach((block) => {
            const at = block.dataset.xpAt && block.querySelector(block.dataset.xpAt);
            ScrollTrigger.create({
                trigger: at || block,
                scroller,
                start: block.dataset.xpStart || 'top 84%',
                end: 'bottom top',
                onEnter: () => reveal(block),
                onLeave: () => reveal(block),
            });
        });
        if (line) {
            gsap.fromTo(line, { scaleY: 0 }, {
                scaleY: 1, ease: 'none',
                scrollTrigger: { trigger: line, scroller, start: 'top ' + LINE_AT, end: 'bottom ' + LINE_AT, scrub: 0.6 },
            });
        }
        ScrollTrigger.refresh();
    }

    const start = () => ready.then(() => root.requestAnimationFrame(arm));
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})(typeof window !== 'undefined' ? window : globalThis);
