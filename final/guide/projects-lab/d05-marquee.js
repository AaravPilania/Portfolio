(function () {
    'use strict';
    const { projects, esc, pad } = Lab;
    Lab.dock({ num: '05', name: 'Marquee Wire', hint: 'scroll speed · hover freeze' });
    Lab.cursor();

    const list = document.getElementById('mqList');
    const speedEl = document.getElementById('mqSpeed');

    const itemHTML = (p, i) =>
        '<span class="mq-item">' + esc(p.title) +
        '<small>' + pad(i + 1) + ' &middot; ' + esc(p.client) + ' //' + esc(p.year) + (p.awards.length ? ' &middot; ' + esc(Lab.awardsText(p)) : '') + '</small>' +
        '<span class="mq-star" aria-hidden="true">&#10035;</span></span>';

    const rows = projects.map((p, i) => {
        const el = document.createElement('article');
        el.className = 'mq-row';
        el.dataset.i = i;
        const hit = p.url
            ? '<a class="mq-hit" href="' + esc(p.url) + '" target="_blank" rel="noopener" data-cursor="LAUNCH" aria-label="Launch ' + esc(p.title) + '"></a>'
            : '<span class="mq-hit" data-cursor="ARCHIVED" aria-label="' + esc(p.title) + ' (archived)"></span>';
        const tag = '<div class="mq-tag"><span>' + pad(i + 1) + '/16</span><span>' + esc(p.client) + '</span><span>' + (p.url ? 'Launch &#8599;' : 'Archived') + '</span></div>';
        el.innerHTML =
            '<div class="mq-track mq-track--base"></div>' +
            '<div class="mq-media"></div>' +
            '<div class="mq-track mq-track--outline" aria-hidden="true"></div>' + tag + hit;
        const media = Lab.media(p, { phW: 960, phH: 240 });
        el.querySelector('.mq-media').appendChild(media);
        list.appendChild(el);
        const rnd = Lab.rand(Lab.hash(p.key + '#wire'));
        return {
            el, p, i, media,
            base: el.querySelector('.mq-track--base'),
            outline: el.querySelector('.mq-track--outline'),
            dir: i % 2 ? 1 : -1,
            speed: 46 + rnd() * 44,
            x: -rnd() * 400,
            seqW: 1, freeze: 1, visible: true, reps: 0
        };
    });

    const build = (r, reps) => {
        r.reps = reps;
        const seq = '<span class="mq-seq">' + itemHTML(r.p, r.i).repeat(reps) + '</span>';
        const seqHidden = '<span class="mq-seq" aria-hidden="true">' + itemHTML(r.p, r.i).repeat(reps) + '</span>';
        r.base.innerHTML = seq + seqHidden;
        r.outline.innerHTML = seqHidden + seqHidden;
    };
    const measure = () => {
        const vw = innerWidth;
        rows.forEach((r) => {
            if (!r.reps) build(r, 3);
            const itemW = r.base.firstChild.firstChild.getBoundingClientRect().width || 400;
            const need = Math.max(2, Math.ceil((vw * 1.15) / itemW));
            if (need !== r.reps) build(r, need);
            r.seqW = r.base.firstChild.getBoundingClientRect().width || vw;
            r.x = ((r.x % r.seqW) - r.seqW) % r.seqW;
        });
    };
    measure();
    Lab.fontsReady().then(measure);
    let resizeT = 0;
    addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(measure, 120); });

    const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { rows[+en.target.dataset.i].visible = en.isIntersecting; });
    }, { rootMargin: '10% 0px' });
    rows.forEach((r) => io.observe(r.el));

    Lab.hover('.mq-row', {
        enter: (el) => {
            const r = rows[+el.dataset.i];
            el.classList.add('is-hover');
            list.classList.add('has-hover');
            r.media.plPlay();
        },
        leave: (el) => {
            const r = rows[+el.dataset.i];
            el.classList.remove('is-hover');
            r.media.plPause();
            requestAnimationFrame(() => { if (!list.querySelector('.mq-row.is-hover')) list.classList.remove('has-hover'); });
        }
    });

    let factor = 1, lastLabel = '';
    Lab.tick((dt) => {
        const target = Lab.reduced ? 0 : Lab.clamp(1 + Lab.scrollV / 160, -9, 9);
        factor += (target - factor) * Lab.damp(dt, 5);
        const skew = Lab.reduced ? 0 : Lab.clamp((factor - 1) * -0.9, -9, 9);
        for (const r of rows) {
            const hovered = r.el.classList.contains('is-hover');
            r.freeze += ((hovered ? 0 : 1) - r.freeze) * Lab.damp(dt, hovered ? 9 : 3);
            r.x += r.dir * r.speed * factor * r.freeze * dt;
            if (r.x <= -r.seqW) r.x += r.seqW;
            else if (r.x > 0) r.x -= r.seqW;
            if (!r.visible) continue;
            const t = 'translate3d(' + r.x.toFixed(2) + 'px,0,0) skewX(' + (skew * r.freeze).toFixed(2) + 'deg)';
            r.base.style.transform = t;
            r.outline.style.transform = t;
        }
        const label = (Lab.reduced ? 0 : factor).toFixed(2) + '×';
        if (label !== lastLabel) { lastLabel = label; speedEl.textContent = label; }
    });
})();
