(function () {
    'use strict';
    const { projects, esc, pad } = Lab;
    Lab.dock({ num: '04', name: 'Contact Sheet', hint: 'hover · click to pull' });
    Lab.cursor();

    const root = document.documentElement;
    const sheet = document.getElementById('csSheet');
    const detail = document.getElementById('csDetail');
    const bg = document.getElementById('csBg');
    const slot = document.getElementById('csSlot');
    const info = document.getElementById('csInfo');
    const dNo = document.getElementById('csDNo');
    const dTitle = document.getElementById('csDTitle');
    const dMeta = document.getElementById('csDMeta');
    const dStamps = document.getElementById('csDStamps');
    const dLaunch = document.getElementById('csDLaunch');
    const dClose = document.getElementById('csDClose');
    const hasFlip = !!(window.gsap && window.Flip);
    if (hasFlip) gsap.registerPlugin(Flip);
    if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

    const RATIOS = ['4 / 3', '3 / 4', '1 / 1', '16 / 10', '4 / 5', '3 / 2'];
    const COL_DROP = [0, 56, 18, 84];

    const prints = projects.map((p, i) => {
        const rnd = Lab.rand(Lab.hash(p.key + '#sheet'));
        const ar = RATIOS[Math.floor(rnd() * RATIOS.length)];
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'cs-print';
        el.dataset.i = i;
        el.dataset.cursor = 'PULL F-' + pad(i + 1);
        el.setAttribute('aria-label', 'Open ' + p.title);
        el.style.setProperty('--r', ((rnd() - 0.5) * 6.4).toFixed(2) + 'deg');
        el.style.setProperty('--tr', ((rnd() - 0.5) * 10).toFixed(2) + 'deg');
        el.style.setProperty('--sr', ((rnd() - 0.5) * 40).toFixed(1) + 'deg');
        el.style.setProperty('--ar', ar);
        el.style.marginTop = (COL_DROP[i % 4] + Math.round(rnd() * 14)) + 'px';
        el.innerHTML =
            '<span class="cs-print__body">' +
            (rnd() > 0.35 ? '<span class="cs-tape"></span>' : '') +
            '<span class="cs-print__photo"></span>' +
            (p.awards.length ? '<span class="cs-aw">' + p.awards.map((a) => '<span>' + esc(a[0].split('/')[0]) + '</span>').join('') + '</span>' : '') +
            '<span class="cs-print__cap"><b>F-' + pad(i + 1) + '</b><span>' + esc(p.title) + '</span><i>' + esc(p.client) + '</i></span>' +
            '<span class="cs-stamp">&rsquo;' + esc(p.year) + '</span>' +
            '</span>';
        const photo = el.querySelector('.cs-print__photo');
        const media = Lab.media(p, { phW: 480, phH: 360 });
        photo.appendChild(media);
        sheet.appendChild(el);
        el.addEventListener('click', () => open(i));
        return { el, photo, media, ar, p };
    });

    Lab.hover('.cs-print', {
        enter: (el) => { el.classList.add('is-hover'); sheet.classList.add('has-hover'); prints[+el.dataset.i].media.plPlay(); },
        leave: (el) => {
            el.classList.remove('is-hover');
            if (openI !== +el.dataset.i) prints[+el.dataset.i].media.plPause();
            requestAnimationFrame(() => { if (!sheet.querySelector('.cs-print.is-hover')) sheet.classList.remove('has-hover'); });
        }
    });

    if (window.gsap && window.ScrollTrigger && !Lab.reduced) {
        const els = prints.map((pr) => pr.el);
        gsap.set(els, { y: 70, opacity: 0 });
        ScrollTrigger.batch(els, {
            start: 'top 92%',
            onEnter: (b) => gsap.to(b, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.07, overwrite: true }),
            onLeaveBack: (b) => gsap.to(b, { y: 70, opacity: 0, duration: 0.5, ease: 'power2.in', stagger: 0.04, overwrite: true })
        });
    }

    /* ---------- Flip detail ---------- */
    let openI = -1, ghost = null, busy = false;
    const infoKids = () => Array.from(info.children);

    function fill(p, i) {
        dNo.innerHTML = '<b>F-' + pad(i + 1) + '</b> &nbsp;of 16';
        dTitle.textContent = p.title;
        dMeta.innerHTML = '<dt>Client</dt><dd>' + esc(p.client) + '</dd><dt>Year</dt><dd>20' + esc(p.year) + '</dd><dt>Status</dt><dd>' + (p.url ? 'Live' : 'Archived') + '</dd>';
        dStamps.innerHTML = p.awards.length
            ? p.awards.map((a, k) => '<a href="' + esc(a[1]) + '" target="_blank" rel="noopener" data-cursor="' + esc(a[0].split('/')[0]) + '" style="--sr:' + (k % 2 ? 4 : -6) + 'deg">' + esc(a[0]) + '</a>').join('')
            : '<span class="pl-mono" style="color:#6d6a62">No stamps &mdash; just the work</span>';
        if (p.url) { dLaunch.href = p.url; dLaunch.style.display = ''; } else { dLaunch.removeAttribute('href'); dLaunch.style.display = 'none'; }
    }

    function open(i) {
        if (openI >= 0 || busy) return;
        const pr = prints[i];
        openI = i;
        fill(pr.p, i);
        const state = hasFlip ? Flip.getState(pr.photo) : null;
        ghost = document.createElement('span');
        ghost.className = 'cs-print__ghost';
        ghost.style.setProperty('--ar', pr.ar);
        ghost.textContent = 'Pulled';
        pr.photo.replaceWith(ghost);
        slot.appendChild(pr.photo);
        detail.classList.add('is-open');
        detail.setAttribute('aria-hidden', 'false');
        root.style.overflow = 'hidden';
        pr.media.plPlay();
        if (state && !Lab.reduced) {
            busy = true;
            gsap.to(bg, { opacity: 1, duration: 0.5, ease: 'power1.out' });
            Flip.from(state, { duration: 0.95, ease: 'expo.inOut', absolute: true, onComplete: () => { busy = false; } });
            gsap.fromTo(infoKids(), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.06, delay: 0.5 });
        } else {
            bg.style.opacity = 1;
            infoKids().forEach((k) => { k.style.opacity = 1; k.style.transform = 'none'; });
        }
        dClose.focus({ preventScroll: true });
    }

    function close() {
        if (openI < 0 || busy) return;
        const pr = prints[openI];
        const done = () => {
            detail.classList.remove('is-open');
            detail.setAttribute('aria-hidden', 'true');
            root.style.overflow = '';
            busy = false;
            pr.el.focus({ preventScroll: true });
            Lab.rehit();
        };
        const state = hasFlip ? Flip.getState(pr.photo) : null;
        ghost.replaceWith(pr.photo);
        ghost = null;
        if (!pr.el.classList.contains('is-hover')) pr.media.plPause();
        openI = -1;
        if (state && !Lab.reduced) {
            busy = true;
            gsap.to(infoKids(), { opacity: 0, y: 12, duration: 0.25, ease: 'power1.in' });
            gsap.to(bg, { opacity: 0, duration: 0.3, ease: 'power1.in' });
            Flip.from(state, { duration: 0.85, ease: 'expo.inOut', absolute: true, zIndex: 10, onComplete: done });
        } else {
            bg.style.opacity = 0;
            infoKids().forEach((k) => { k.style.opacity = 0; });
            done();
        }
    }

    dClose.addEventListener('click', close);
    bg.addEventListener('click', close);
    slot.addEventListener('click', close);
    slot.dataset.cursor = 'FILE BACK';
    bg.dataset.cursor = 'FILE BACK';
    addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
})();
