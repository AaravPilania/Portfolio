(function () {
    'use strict';
    const { projects, esc, pad } = Lab;
    Lab.dock({ num: '03', name: 'Cylinder', hint: 'scroll · drag · click' });
    Lab.cursor();

    const N = projects.length;
    const STEP = 360 / N;
    const scrollEl = document.getElementById('cyScroll');
    const view = document.getElementById('cyView');
    const ring = document.getElementById('cyRing');
    const noEl = document.getElementById('cyNo');
    const titleEl = document.getElementById('cyTitle');
    const metaEl = document.getElementById('cyMeta');
    const launchEl = document.getElementById('cyLaunch');
    const ticksEl = document.getElementById('cyTicks');

    const floor = document.createElement('div');
    floor.className = 'cy-floor';
    ring.appendChild(floor);

    const panels = projects.map((p, i) => {
        const el = document.createElement('div');
        el.className = 'cy-panel';
        el.dataset.i = i;
        el.innerHTML =
            '<div class="cy-panel__face"><div class="cy-panel__veil"></div>' +
            '<div class="cy-panel__cap"><b>' + pad(i + 1) + '</b><span>' + esc(p.title) + '</span></div></div>' +
            '<div class="cy-panel__back" aria-hidden="true"><span>' + pad(i + 1) + '</span></div>';
        const face = el.querySelector('.cy-panel__face');
        const media = Lab.media(p, { phW: 360, phH: 480 });
        face.insertBefore(media, face.firstChild);
        ring.appendChild(el);
        return { el, media, veil: el.querySelector('.cy-panel__veil'), lastVeil: -1 };
    });

    const norm = (a) => { a = ((a + 180) % 360 + 360) % 360 - 180; return a; };
    const mod = (n, m) => ((n % m) + m) % m;

    let R = 800, PW = 260, PH = 340;
    let start = 0, len = 1;
    const layout = () => {
        const vw = innerWidth, vh = innerHeight;
        PW = Lab.clamp(vw < 700 ? vw * 0.42 : vw * 0.165, 160, 300);
        PH = Math.min(PW * 1.32, vh * 0.5);
        R = PW / (2 * Math.tan(Math.PI / N)) + 14;
        panels.forEach((pl, i) => {
            const s = pl.el.style;
            s.width = PW + 'px'; s.height = PH + 'px';
            s.marginLeft = (-PW / 2) + 'px'; s.marginTop = (-PH / 2) + 'px';
            s.transform = 'rotateY(' + (i * STEP) + 'deg) translateZ(' + R.toFixed(1) + 'px)';
        });
        const fs = R * 2 + 700;
        floor.style.width = fs + 'px'; floor.style.height = fs + 'px';
        floor.style.marginLeft = (-fs / 2) + 'px'; floor.style.marginTop = (-fs / 2) + 'px';
        floor.style.transform = 'translate3d(0,' + (PH / 2 + 36).toFixed(1) + 'px,0) rotateX(90deg)';
        start = scrollEl.getBoundingClientRect().top + window.scrollY;
        len = Math.max(1, scrollEl.offsetHeight - vh);
    };
    layout();
    addEventListener('resize', layout);
    addEventListener('load', layout);

    let front = -1, hovered = -1;
    const syncPlayback = () => panels.forEach((pl, i) => (i === front || i === hovered) ? pl.media.plPlay() : pl.media.plPause());
    const setFront = (i) => {
        if (i === front) return;
        if (front >= 0) panels[front].el.classList.remove('is-front');
        front = i;
        const p = projects[i];
        panels[i].el.classList.add('is-front');
        panels.forEach((pl, k) => { pl.el.dataset.cursor = k === i ? (p.url ? 'LAUNCH' : 'ARCHIVED') : 'BRING ROUND'; });
        noEl.textContent = pad(i + 1);
        titleEl.innerHTML = Lab.roll(p.title);
        titleEl.classList.remove('is-in');
        void titleEl.offsetWidth;
        titleEl.classList.add('is-in');
        metaEl.innerHTML = esc(p.client) + ' &middot; //' + esc(p.year) + (p.awards.length ? ' &middot; <b>' + esc(Lab.awardsText(p)) + '</b>' : '');
        if (p.url) { launchEl.href = p.url; launchEl.classList.remove('is-off'); }
        else { launchEl.removeAttribute('href'); launchEl.classList.add('is-off'); }
        syncPlayback();
    };

    Lab.hover('.cy-panel', {
        enter: (el) => { hovered = +el.dataset.i; syncPlayback(); },
        leave: (el) => { if (+el.dataset.i === hovered) hovered = -1; syncPlayback(); }
    });

    /* ---------- Drag + inertia ---------- */
    let drag = 0, dragVel = 0, dragging = false, downX = 0, lastX = 0, moved = 0, lastInput = 0;
    view.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        dragging = true; moved = 0; downX = lastX = e.clientX; dragVel = 0;
        view.setPointerCapture(e.pointerId);
        view.classList.add('is-drag');
    });
    view.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        moved = Math.max(moved, Math.abs(e.clientX - downX));
        const d = dx * (180 / (Math.PI * R));
        drag += d;
        dragVel = d;
        lastInput = performance.now();
    });
    const endDrag = (e) => {
        if (!dragging) return;
        dragging = false;
        view.classList.remove('is-drag');
        lastInput = performance.now();
        if (moved < 6) {
            dragVel = 0;
            const hit = document.elementFromPoint(e.clientX, e.clientY);
            const panel = hit && hit.closest('.cy-panel');
            if (!panel) return;
            const i = +panel.dataset.i;
            if (i === front) { if (projects[i].url) window.open(projects[i].url, '_blank', 'noopener'); }
            else drag -= norm(i * STEP + scrollAngle() + drag);
        }
    };
    view.addEventListener('pointerup', endDrag);
    view.addEventListener('pointercancel', endDrag);
    addEventListener('scroll', () => { lastInput = performance.now(); }, { passive: true });

    const scrollAngle = () => -Lab.clamp((window.scrollY - start) / len, 0, 1) * (N - 1) * STEP;

    let angle = 0, tilt = 0, primed = false;
    Lab.tick((dt, now) => {
        if (!dragging) {
            if (Math.abs(dragVel) > 0.01 && !Lab.reduced) { drag += dragVel; dragVel *= Math.pow(0.9, dt * 60); }
            else {
                dragVel = 0;
                if (now - lastInput > 240) {
                    const total = scrollAngle() + drag;
                    const snapped = Math.round(total / STEP) * STEP;
                    drag += (snapped - total) * (Lab.reduced ? 1 : Lab.damp(dt, 5));
                }
            }
        }
        const target = scrollAngle() + drag;
        if (!primed || Lab.reduced) { angle = target; primed = true; }
        else angle += (target - angle) * Lab.damp(dt, 8);
        const lag = target - angle;

        const tTilt = (Lab.pointer.has && !Lab.reduced) ? (Lab.pointer.y / innerHeight - 0.5) * -7 : 0;
        tilt += (tTilt - tilt) * Lab.damp(dt, 4);
        const squash = Lab.reduced ? 1 : 1 - Math.min(0.04, Math.abs(lag) * 0.004);

        ring.style.transform = 'translate3d(0,0,' + (-R).toFixed(1) + 'px) rotateX(' + (tilt - 4).toFixed(3) + 'deg) rotateY(' + angle.toFixed(3) + 'deg) scale3d(1,' + squash.toFixed(4) + ',1)';

        for (let i = 0; i < N; i++) {
            const pl = panels[i];
            const c = Math.cos(norm(i * STEP + angle) * Math.PI / 180);
            const v = Math.round(Lab.clamp((1 - c) * 0.9, 0, 0.92) * 100) / 100;
            if (v !== pl.lastVeil) { pl.lastVeil = v; pl.veil.style.opacity = v; }
        }
        setFront(mod(Math.round(-angle / STEP), N));
        ticksEl.style.transform = 'translate3d(' + (mod(angle / STEP * 90, 360) - 360).toFixed(2) + 'px,0,0)';
        if (Math.abs(lag) > 0.02 || dragging) Lab.rehit();
    });
})();
