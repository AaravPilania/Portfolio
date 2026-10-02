// "Join the dance": opt-in camera mode for the contact calendar, after Lama Lama's "Join in our DNA". This file owns the
// chip, the grid settings, the back pill and the MediaStream; calendar-contact.js books the visitor into the week.
// Nothing leaves the page: frames go from a local <video> into a canvas of one pixel per calendar cell.
//   CalendarCamera.attach({ enter(), exit(instant), settings({ cell, mono }) })
//   CalendarCamera.grab(cols, rows, aspect) -> RGBA of the mirrored, cover-fit frame, or null
window.CalendarCamera = (() => {
    'use strict';

    const root = document.getElementById('gcCam');
    if (!root) return { attach() {}, grab: () => null, get on() { return false; } };
    const card = root.querySelector('.gc-cam__card');
    const head = root.querySelector('.gc-cam__head');
    const go = document.getElementById('gcCamGo');
    const goLabel = go.querySelector('.gc-cam__label');
    const msg = document.getElementById('gcCamMsg');
    const panel = document.getElementById('gcCamSettings');
    const back = document.getElementById('gcBack');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const settings = { cell: 0, mono: false };
    let hooks = null, stream = null, video = null, on = false, busy = false, msgTimer = 0;
    // a CPU canvas: drawing the frame in and reading it back never round-trips through the GPU
    const grabCanvas = document.createElement('canvas');
    const grabCtx = grabCanvas.getContext('2d', { willReadFrequently: true });
    let cells = new Uint8ClampedArray(0);

    // Lama Lama's mono reveal: characters settle left to right out of a scramble
    const GLYPHS = '#%&*+-/<=>?[]_';
    const scrambles = new WeakMap();
    function scramble(el, text) {
        cancelAnimationFrame(scrambles.get(el) || 0);
        if (reduceMotion.matches) { el.textContent = text; return; }
        const t0 = performance.now(), dur = 380;
        const run = (now) => {
            const k = Math.min(1, (now - t0) / dur), fixed = Math.floor(k * text.length);
            let s = text.slice(0, fixed);
            for (let i = fixed; i < text.length; i++) s += text[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
            el.textContent = s;
            if (k < 1) scrambles.set(el, requestAnimationFrame(run));
        };
        scrambles.set(el, requestAnimationFrame(run));
    }

    function say(text) {
        clearTimeout(msgTimer);
        scramble(msg, text);
        msg.hidden = false;
        msgTimer = setTimeout(() => { msg.hidden = true; }, 5000);
    }

    function setOpen(open) {
        card.classList.toggle('is-open', open);
        head.setAttribute('aria-expanded', String(open));
        head.querySelector('.gc-cam__toggle').textContent = open ? '( − )' : '( + )';
    }

    function syncSettings() {
        for (const b of panel.querySelectorAll('[data-cell]')) b.setAttribute('aria-checked', String(+b.dataset.cell === settings.cell));
        for (const b of panel.querySelectorAll('[data-mono]')) b.setAttribute('aria-checked', String((b.dataset.mono === '1') === settings.mono));
    }

    function stopTracks() {
        if (stream) for (const t of stream.getTracks()) t.stop();
        stream = null;
        if (video) { video.pause(); video.srcObject = null; video = null; }
    }

    async function activate() {
        if (on || busy) return;
        if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { say('No camera access on this page'); return; }
        busy = true;
        go.disabled = true;
        scramble(goLabel, 'Waking camera');
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } });
            video = document.createElement('video');
            video.muted = true;
            video.playsInline = true;
            video.srcObject = stream;
            await video.play();
            if (!video.videoWidth) await new Promise((r) => video.addEventListener('loadeddata', r, { once: true }));
            if (document.hidden) throw Object.assign(new Error('hidden'), { name: 'AbortError' });
        } catch (e) {
            stopTracks();
            busy = false;
            go.disabled = false;
            scramble(goLabel, 'Activate camera');
            const n = e && e.name;
            if (n === 'AbortError') return;
            say(n === 'NotAllowedError' || n === 'SecurityError' ? 'Camera blocked. Allow it to join'
                : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'No camera found'
                    : n === 'NotReadableError' ? 'Camera busy in another app' : 'Camera unavailable');
            return;
        }
        busy = false;
        go.disabled = false;
        on = true;
        document.body.classList.add('is-cam');
        scramble(goLabel, 'Stop camera');
        setOpen(false);
        panel.hidden = false;
        back.hidden = false;
        msg.hidden = true;
        if (hooks) hooks.enter();
        back.focus({ preventScroll: true });
    }

    function deactivate(instant) {
        if (!on) return;
        on = false;
        if (hooks) hooks.exit(!!instant);
        stopTracks();
        document.body.classList.remove('is-cam');
        scramble(goLabel, 'Activate camera');
        panel.hidden = true;
        back.hidden = true;
        setOpen(true);
    }

    function grab(cols, rows, aspect) {
        if (!video || video.readyState < 2 || !video.videoWidth) return null;
        const vw = video.videoWidth, vh = video.videoHeight;
        let sw = vw, sh = vw / aspect;
        if (sh > vh) { sh = vh; sw = vh * aspect; }
        // drawn at twice the cell grid and box-filtered here: drawImage from video only filters bilinearly
        const mw = cols * 2, mh = rows * 2;
        if (grabCanvas.width !== mw || grabCanvas.height !== mh) { grabCanvas.width = mw; grabCanvas.height = mh; }
        if (cells.length !== cols * rows * 4) cells = new Uint8ClampedArray(cols * rows * 4);
        grabCtx.setTransform(-1, 0, 0, 1, mw, 0);
        grabCtx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, mw, mh);
        const px = grabCtx.getImageData(0, 0, mw, mh).data, row = mw * 4;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            const p = (r * 2 * mw + c * 2) * 4, o = (r * cols + c) * 4;
            for (let k = 0; k < 3; k++) cells[o + k] = (px[p + k] + px[p + 4 + k] + px[p + row + k] + px[p + row + 4 + k] + 2) >> 2;
            cells[o + 3] = 255;
        }
        return cells;
    }

    go.addEventListener('click', () => (on ? deactivate(false) : activate()));
    back.addEventListener('click', () => deactivate(false));
    head.addEventListener('click', () => setOpen(!card.classList.contains('is-open')));
    panel.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.cell !== undefined) settings.cell = +b.dataset.cell;
        else if (b.dataset.mono !== undefined) settings.mono = b.dataset.mono === '1';
        else return;
        syncSettings();
        if (hooks) hooks.settings({ ...settings });
    });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') deactivate(false); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) deactivate(true); });
    window.addEventListener('pagehide', () => deactivate(true));

    syncSettings();
    setOpen(true);

    return {
        attach(h) { hooks = h; h.settings({ ...settings }); },
        grab,
        get on() { return on; },
        get liveTracks() { return stream ? stream.getTracks().filter((t) => t.readyState === 'live').length : 0; },
    };
})();
