// The header pill on both pages (css/site-nav.css): the bar or the burger opens it, Escape, the scrim or a link closes
// it; [data-copy] buttons copy their value and confirm in place. The centre line and the pixel mark follow the section
// on screen, and [data-scroll] links glide to their section without ever putting a fragment in the URL.
(() => {
    'use strict';

    const nav = document.querySelector('.ap-nav');
    if (!nav) return;
    const burger = nav.querySelector('.ap-nav__burger');
    const menu = nav.querySelector('.ap-nav__menu');
    const focusables = () => [nav.querySelector('.ap-nav__mark'), burger, ...menu.querySelectorAll('a, button')];

    function set(open) {
        if (open === nav.classList.contains('is-open')) return;
        nav.classList.toggle('is-open', open);
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        menu.inert = !open;
        if (!open && menu.contains(document.activeElement)) burger.focus({ preventScroll: true });
    }

    // one markup on every page: the current one is found from the URL
    const here = /^\/contact(\/|\.html)?$/.test(location.pathname) ? 'contact' : 'home';
    for (const a of nav.querySelectorAll('[data-nav]')) {
        if (a.dataset.nav !== here) continue;
        a.setAttribute('aria-current', 'page');
        a.querySelector('.ap-nav__ico').innerHTML = '<rect x="2" y="2" width="6" height="6" fill="currentColor" />';
        a.insertAdjacentHTML('beforeend', '<span class="ap-nav__here" aria-hidden="true">You are here</span>');
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    // ------------------------------------------------------------ the centre line: one per section, typed through
    // glyphs that resolve whenever the section changes
    const LINES = {
        hero: 'Creative developer, India',
        projects: 'Selected work, source open',
        stack: 'What the work is made of',
        together: 'Bring the odd idea',
        end: 'Writes back within a day',
        contact: 'Yes, the calendar dances',
    };
    const msg = nav.querySelector('.ap-nav__msg');
    const G = '#$*@(0%1>';
    let msgRaf = 0, msgText = msg ? msg.textContent : '';
    function line(text) {
        if (!msg || text === msgText) return;
        msgText = text;
        cancelAnimationFrame(msgRaf);
        if (reduce.matches) { msg.textContent = text; return; }
        const t0 = performance.now(), D = 520 + text.length * 12;
        const step = (now) => {
            const k = Math.min(1, (now - t0) / D), fixed = Math.floor(Math.max(0, k * 1.4 - 0.4) * text.length), shown = Math.ceil(Math.min(1, k * 1.6) * text.length);
            let s = text.slice(0, fixed);
            for (let i = fixed; i < shown; i++) s += text[i] === ' ' ? ' ' : G[(Math.random() * G.length) | 0];
            msg.textContent = s;
            if (k < 1) msgRaf = requestAnimationFrame(step);
        };
        msgRaf = requestAnimationFrame(step);
    }

    // ------------------------------------------------------------ the mark: AP on a 16 x 13 pixel grid that re-books
    // itself cell by cell into a glyph for the moment (an envelope near contact, a speech bubble on the contact page)
    const GW = 16, GH = 13, SIGNAL = '#FFED29';
    const bits = (rows) => Uint8Array.from(rows.join(''), (c) => (c === '#' ? 1 : 0));
    const GLYPHS = {
        mail: bits([
            '################',
            '################',
            '#.############.#',
            '##.##########.##',
            '###.########.###',
            '####.######.####',
            '#####.####.#####',
            '######.##.######',
            '#######..#######',
            '################',
            '################',
            '################',
            '################',
        ]),
        hi: bits([
            '################',
            '################',
            '###..##..#..####',
            '###..##..#..####',
            '###......#..####',
            '###......#..####',
            '###..##..#..####',
            '###..##..#..####',
            '################',
            '################',
            '..######........',
            '..####..........',
            '..##............',
        ]),
    };
    const mark = nav.querySelector('.ap-nav__mark'), markSvg = mark && mark.querySelector('svg');
    const markPath = markSvg && markSvg.querySelector('path');
    let morphTo = null;
    if (mark && markPath) {
        const p = new Path2D(markPath.getAttribute('d')), probe = document.createElement('canvas').getContext('2d');
        const ap = new Uint8Array(GW * GH);
        for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) ap[j * GW + i] = probe.isPointInPath(p, (i + 0.5) * 803 / GW, (j + 0.5) * 644 / GH, 'evenodd') ? 1 : 0;
        GLYPHS.ap = ap;
        const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
        const turn = new Float32Array(GW * GH);
        for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) turn[j * GW + i] = 0.55 * (i + j) / (GW + GH - 2) + 0.45 * BAYER[(j & 3) * 4 + (i & 3)] / 15;
        const cv = document.createElement('canvas'), cx = cv.getContext('2d');
        cv.className = 'ap-nav__px';
        cv.setAttribute('aria-hidden', 'true');
        mark.appendChild(cv);
        const shown = ap.slice(), from = ap.slice();
        let target = 'ap', raf = 0, t0 = 0;
        const D = 460, FLASH = 70;
        const draw = (now) => {
            const w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
            if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
            const to = GLYPHS[target], ink = getComputedStyle(mark).color, W = cv.width, H = cv.height;
            const k = (now - t0) / D;
            let done = true;
            cx.clearRect(0, 0, W, H);
            for (let c = 0; c < GW * GH; c++) {
                let v = from[c], flash = false;
                if (from[c] !== to[c]) {
                    const at = turn[c] * D * 0.8;
                    if (now - t0 >= at + FLASH) v = to[c];
                    else { done = false; flash = now - t0 >= at; }
                }
                shown[c] = v;
                if (!v && !flash) continue;
                const i = c % GW, j = (c / GW) | 0;
                const x0 = Math.round(i * W / GW), y0 = Math.round(j * H / GH);
                cx.fillStyle = flash ? SIGNAL : ink;
                cx.fillRect(x0, y0, Math.round((i + 1) * W / GW) - x0, Math.round((j + 1) * H / GH) - y0);
            }
            return done || k > 2;
        };
        const frame = (now) => {
            raf = 0;
            if (!draw(now)) { raf = requestAnimationFrame(frame); return; }
            mark.classList.toggle('is-px', target !== 'ap');
        };
        morphTo = (name) => {
            if (!GLYPHS[name] || name === target) return;
            from.set(shown);
            target = name;
            t0 = performance.now();
            mark.classList.add('is-px');
            if (reduce.matches) { from.set(GLYPHS[name]); t0 -= D * 3; }
            if (!raf) raf = requestAnimationFrame(frame);
        };
    }

    // ------------------------------------------------------------ what the bar says and shows, per section
    let section = here === 'contact' ? 'contact' : 'hero', hold = null;
    const GLYPH_OF = { together: 'mail', end: 'mail', contact: 'hi' };
    function apply() {
        line(LINES[section] || LINES.hero);
        if (morphTo) morphTo(hold || GLYPH_OF[section] || 'ap');
    }
    window.addEventListener('ap:glyph', (e) => { hold = e.detail || null; apply(); });
    for (const a of nav.querySelectorAll('a[href="/contact"]')) {
        a.addEventListener('pointerenter', () => { if (here !== 'contact' && morphTo) morphTo('mail'); });
        a.addEventListener('pointerleave', apply);
    }

    // ------------------------------------------------------------ clean URLs: in-page targets scroll through Lenis
    // and never write a fragment; from another page the target rides along with the page transition
    const TARGETS = { projects: '#section-projects', stack: '.ll-section--services', together: '#work-together' };
    let appMod = null;
    const lenisOf = () => {
        const app = appMod && appMod.n, s = app && app.instances && app.instances.get('scroller');
        return (s && s.lenis) || null;
    };
    function scrollToKey(key, immediate) {
        const el = document.querySelector(TARGETS[key] || '');
        if (!el) return false;
        const lenis = lenisOf();
        if (lenis) lenis.scrollTo(el, immediate ? { immediate: true, force: true } : { duration: 1.6, force: true });
        else el.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth' });
        return !!lenis || immediate;
    }
    const HASHES = { '#section-projects': 'projects', '#work-together': 'together', '#stack': 'stack' };
    const clean = () => { if (location.hash) history.replaceState(history.state, '', location.pathname + location.search); };

    if (here === 'home') {
        import('/wp-content/themes/lamalama2025/dist/assets/app-DjHRamTc.js').then((m) => { appMod = m; }).catch(() => {});
        const pending = window.__ptScroll || HASHES[location.hash] || null;
        clean();
        if (pending) {
            const t0 = performance.now();
            (function wait() {
                if (lenisOf() || performance.now() - t0 > 6000) { scrollToKey(pending, true); return; }
                setTimeout(wait, 60);
            })();
        }
        window.addEventListener('hashchange', () => {
            const key = HASHES[location.hash];
            clean();
            if (key) scrollToKey(key, false);
        });
        document.addEventListener('click', (e) => {
            const a = e.target.closest && e.target.closest('a[data-scroll], a[href^="#"], a[href^="/#"]');
            if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
            const key = a.dataset.scroll || HASHES[new URL(a.getAttribute('href'), location.href).hash];
            if (!key) return;
            e.preventDefault();
            e.stopPropagation();
            set(false);
            scrollToKey(key, false);
        }, true);

        // the section under the middle of the screen; the last screen is the together slide's end state
        const secs = [['hero', '#heroTrack'], ['projects', '#section-projects'], ['stack', '.ll-section--services'], ['together', '#work-together']]
            .map(([k, s]) => [k, document.querySelector(s)]).filter((x) => x[1]);
        const live = new Set(), root = document.documentElement;
        const pick = () => {
            if (root.classList.contains('is-wt-end')) section = 'end';
            else {
                let k = 'hero';
                for (const [key, el] of secs) if (live.has(el)) k = key;
                section = k;
            }
            apply();
        };
        const io = new IntersectionObserver((list) => {
            for (const en of list) { if (en.isIntersecting) live.add(en.target); else live.delete(en.target); }
            pick();
        }, { rootMargin: '-48% 0px -48% 0px' });
        for (const [, el] of secs) io.observe(el);
        new MutationObserver(pick).observe(root, { attributes: true, attributeFilter: ['class'] });
    } else {
        clean();
        apply();
    }

    menu.inert = true;
    burger.addEventListener('click', () => set(!nav.classList.contains('is-open')));
    nav.querySelector('.ap-nav__hit').addEventListener('click', () => set(!nav.classList.contains('is-open')));
    nav.querySelector('.ap-nav__scrim').addEventListener('click', () => set(false));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => {
        if (!nav.classList.contains('is-open')) return;
        if (e.key === 'Escape') { set(false); return; }
        if (e.key !== 'Tab') return;
        const f = focusables(), i = f.indexOf(document.activeElement);
        if (i < 0) return;
        if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
        else if (e.shiftKey && i === 0) { e.preventDefault(); f[f.length - 1].focus(); }
    });

    for (const b of nav.querySelectorAll('[data-copy]')) {
        const label = b.textContent;
        let timer = 0;
        b.addEventListener('click', async () => {
            let ok = false;
            try { await navigator.clipboard.writeText(b.dataset.copy); ok = true; } catch (e) { /* no clipboard: fall through to mail */ }
            if (!ok) { location.href = 'mailto:' + b.dataset.copy; return; }
            b.textContent = 'Copied';
            clearTimeout(timer);
            timer = setTimeout(() => { b.textContent = label; }, 1600);
        });
    }
})();
