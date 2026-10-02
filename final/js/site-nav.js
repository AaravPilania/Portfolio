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
