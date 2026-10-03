// The main site's header pill on standalone pages (css/site-nav.css): the bar or the burger opens it, Escape, the
// scrim or a link closes it; [data-copy] buttons copy their value and confirm in place.
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
    if (here === 'contact') for (const a of nav.querySelectorAll('a[href^="/contact#"]')) a.addEventListener('click', (e) => {
        e.preventDefault();
        set(false);
        window.dispatchEvent(new CustomEvent('ap:hash', { detail: a.hash }));
    });

    // the centre message types through its phrases as glyphs that resolve, every few seconds
    const msg = nav.querySelector('.ap-nav__msg[data-labels]');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (msg) {
        const phrases = msg.dataset.labels.split('|'), G = '#$*@(0%1>';
        let n = 0;
        const swap = (text) => {
            const t0 = performance.now(), D = 520 + text.length * 12;
            const step = (now) => {
                const k = Math.min(1, (now - t0) / D), fixed = Math.floor(Math.max(0, k * 1.4 - 0.4) * text.length), shown = Math.ceil(Math.min(1, k * 1.6) * text.length);
                let s = text.slice(0, fixed);
                for (let i = fixed; i < shown; i++) s += text[i] === ' ' ? ' ' : G[(Math.random() * G.length) | 0];
                msg.textContent = s;
                if (k < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        };
        setInterval(() => {
            if (document.hidden || reduce.matches || nav.classList.contains('is-open')) return;
            n = (n + 1) % phrases.length;
            swap(phrases[n]);
        }, 4200);
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
