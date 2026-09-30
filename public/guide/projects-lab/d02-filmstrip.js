(function () {
    'use strict';
    const { projects, esc, pad } = Lab;
    Lab.dock({ num: '02', name: 'Filmstrip', hint: 'scroll ↕ · hover plays' });
    Lab.cursor();

    const reel = document.getElementById('fsReel');
    const track = document.getElementById('fsTrack');
    const countEl = document.getElementById('fsCount');
    const barEl = document.getElementById('fsBar');
    const tcEl = document.getElementById('fsTc');
    const RHYTHM = ['wide', 'tall', 'wide', 'wide', 'tall', 'wide', 'tall', 'tall'];

    const plates = projects.map((p, i) => {
        const el = document.createElement('article');
        el.className = 'fs-plate fs-plate--' + RHYTHM[i % RHYTHM.length];
        el.dataset.i = i;
        el.dataset.cursor = p.url ? 'LAUNCH' : 'FRAME ' + pad(i + 1);
        const aw = p.awards.map((a) => '<a href="' + esc(a[1]) + '" target="_blank" rel="noopener">(' + esc(a[0]) + ')</a>').join('');
        el.innerHTML =
            '<span class="fs-plate__num" aria-hidden="true">' + pad(i + 1) + '</span>' +
            '<div class="fs-plate__frame"><div class="fs-plate__inner"></div></div>' +
            '<div class="fs-plate__meta"><b>' + pad(i + 1) + '/16</b><span>' + esc(p.client) + '</span><span>//' + esc(p.year) + '</span></div>' +
            '<h2 class="fs-plate__title">' + esc(p.title) + '</h2>' +
            '<div class="fs-plate__foot"><span class="fs-plate__aw">' + (aw || '<span style="color:var(--dim)">&mdash;</span>') + '</span>' +
            (p.url ? '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">Launch &#8599;</a>' : '<span style="color:var(--dim)">Archived</span>') + '</div>';
        const media = Lab.media(p, { phW: 640, phH: 400 });
        el.querySelector('.fs-plate__inner').appendChild(media);
        track.appendChild(el);
        el.addEventListener('click', (e) => {
            if (e.target.closest('a') || !p.url) return;
            window.open(p.url, '_blank', 'noopener');
        });
        return { el, inner: el.querySelector('.fs-plate__inner'), media, c: 0, w: 0 };
    });

    let dist = 0, reelTop = 0, vw = innerWidth;
    const measure = () => {
        vw = innerWidth;
        dist = Math.max(0, track.scrollWidth - vw);
        reel.style.height = (innerHeight + dist) + 'px';
        reelTop = reel.getBoundingClientRect().top + window.scrollY;
        plates.forEach((pl) => { pl.w = pl.el.offsetWidth; pl.c = pl.el.offsetLeft + pl.w / 2; });
    };
    measure();
    addEventListener('resize', measure);
    Lab.fontsReady().then(measure);
    addEventListener('load', measure);

    let hovered = -1, centred = -1;
    const syncPlayback = () => {
        plates.forEach((pl, i) => {
            if (i === hovered || i === centred) pl.media.plPlay(); else pl.media.plPause();
        });
    };
    Lab.hover('.fs-plate', {
        enter: (el) => { el.classList.add('is-hover'); hovered = +el.dataset.i; syncPlayback(); },
        leave: (el) => { el.classList.remove('is-hover'); if (+el.dataset.i === hovered) hovered = -1; syncPlayback(); }
    });

    let x = 0, lastSkew = 999, lastBar = -1;
    Lab.tick((dt) => {
        const progress = dist > 0 ? Lab.clamp((window.scrollY - reelTop) / dist, 0, 1) : 0;
        const tx = -progress * dist;
        if (Lab.reduced) x = tx; else x += (tx - x) * Lab.damp(dt, 9);
        const lag = tx - x;
        if (Math.abs(lag) < 0.05) x = tx;
        const moving = Math.abs(lag) > 0.3;
        const skew = Lab.reduced ? 0 : Lab.clamp(lag * 0.012, -7, 7);

        track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
        const writeSkew = Math.abs(skew - lastSkew) > 0.01;
        if (writeSkew) lastSkew = skew;

        let best = 0, bestD = Infinity;
        for (let i = 0; i < plates.length; i++) {
            const pl = plates[i];
            const sc = pl.c + x;
            const d = Math.abs(sc - vw / 2);
            if (d < bestD) { bestD = d; best = i; }
            if (writeSkew) pl.el.style.transform = skew ? 'skewX(' + skew.toFixed(2) + 'deg)' : '';
            if (sc > -pl.w && sc < vw + pl.w && !Lab.reduced) {
                const rel = (sc - vw / 2) / vw;
                pl.inner.style.transform = 'translate3d(' + (rel * -7).toFixed(3) + '%,0,0)';
            }
        }
        if (best !== centred) {
            centred = best;
            countEl.textContent = pad(best + 1);
            syncPlayback();
        }
        if (Math.abs(progress - lastBar) > 0.0005) {
            lastBar = progress;
            barEl.style.transform = 'scaleX(' + progress.toFixed(4) + ')';
            const frames = Math.round(progress * 16 * 4 * 24);
            const ff = frames % 24, s = Math.floor(frames / 24) % 60, m = Math.floor(frames / 1440) % 60;
            tcEl.textContent = '00:' + pad(m) + ':' + pad(s) + ':' + pad(ff);
        }
        if (moving) Lab.rehit();
    });
})();
