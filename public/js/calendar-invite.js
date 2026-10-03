// The contact UI over the calendar, element for element after lamalama.com/contact: headline and lines rise out of
// clips, mono labels type in as glyphs and resolve, outline buttons fill with an arrow swap and a tooltip riding the
// cursor, a live New Delhi clock in the footer bar, two panels top right. "Join the calendar" is their "Join in our
// DNA": "Book yourself in" steps the contact copy out (their camera mode), turns on the camera and renders the visitor
// into the panel as a stack of calendar meetings; four beats of the soundtrack count in and the next downbeat takes
// the shot. The camera stops there, the panel keeps the portrait, and the RSVP is one mail away. "Calendar settings"
// is their grid settings: the slider dims the week under the type, the toggle flips dark and light. Frames are read
// from a 30 x 38 pixel canvas and never leave the page.
const CONTACT = {
    email: 'aaravpilania2006@gmail.com',
    github: 'https://github.com/AaravPilania',
};

(() => {
    'use strict';

    const root = document.body, section = document.getElementById('gcContact'), panel = document.getElementById('gcBooth');
    if (!section || !panel) return;
    const $ = (id) => document.getElementById(id);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const desktop = window.matchMedia('(min-width: 1000px)');

    for (const a of document.querySelectorAll('[data-link="github"]')) a.href = CONTACT.github;

    // ------------------------------------------------------------ mono reveal (their parts/mono-text-reveal)
    const GLYPHS = ['#', '#', '#', '#', '#', '$', '*', '@', '(', '0', '%', '1', '>'];
    const KEEP = { ' ': '_', '[': '[', ']': ']' };
    const easeP2 = (k) => 1 - (1 - k) * (1 - k);
    const easeP3 = (k) => 1 - Math.pow(1 - k, 3);
    function monoWrap(el) {
        if (el.__mono) return el.__mono;
        const text = el.textContent;
        el.textContent = '';
        const box = document.createElement('span'), ghost = document.createElement('span'), live = document.createElement('span');
        box.className = 'gc-m'; ghost.className = 'gc-m__ghost'; live.className = 'gc-m__live';
        ghost.textContent = text;
        box.append(ghost, live);
        el.append(box);
        const m = { el, ghost, live, text, rand: '', shown: 0, swapped: 0, raf: 0, setText(t) { m.text = t; ghost.textContent = t; m.rand = ''; } };
        return (el.__mono = m);
    }
    function randomize(m) {
        let s = '';
        for (const ch of m.text) s += KEEP[ch] ?? GLYPHS[(Math.random() * GLYPHS.length) | 0];
        m.rand = s;
    }
    function render(m) {
        const n = m.text.length;
        let s = '';
        for (let i = 0; i < Math.min(n, m.shown); i++) s += i < m.swapped ? m.text[i] : m.rand[i];
        m.live.textContent = s;
    }
    // types in random glyphs, then 0.2 s later replaces them with the text: power2.out over 0.25 s + 5 ms a char
    function monoIn(el, { delay = 0, dur = 0.25 } = {}) {
        const m = monoWrap(el);
        cancelAnimationFrame(m.raf);
        clearTimeout(m.t);
        const n = m.text.length;
        if (reduce.matches) { m.shown = m.swapped = n; render(m); return; }
        randomize(m);
        m.shown = m.swapped = 0;
        render(m);
        const D = (dur + n * 0.005) * 1000, t0 = performance.now() + delay * 1000;
        const step = (now) => {
            const a = Math.max(0, Math.min(1, (now - t0) / D)), b = Math.max(0, Math.min(1, (now - t0 - 200) / D));
            m.shown = Math.ceil(easeP2(a) * n);
            m.swapped = Math.ceil(easeP2(b) * n);
            render(m);
            if (b < 1) m.raf = requestAnimationFrame(step);
        };
        m.raf = requestAnimationFrame(step);
    }
    // back to glyphs and away: power3.out over 0.15 s + 5 ms a shown char
    function monoOut(el) {
        const m = monoWrap(el);
        cancelAnimationFrame(m.raf);
        if (!m.rand) randomize(m);
        if (reduce.matches) { m.shown = m.swapped = 0; render(m); return; }
        const s0 = m.shown, w0 = m.swapped, D = (0.15 + s0 * 0.005) * 1000, t0 = performance.now();
        const step = (now) => {
            const a = Math.max(0, Math.min(1, (now - t0) / D)), b = Math.max(0, Math.min(1, (now - t0 - 100) / D));
            m.swapped = Math.floor(w0 * (1 - easeP3(a)));
            m.shown = Math.floor(s0 * (1 - easeP3(b)));
            render(m);
            if (b < 1) m.raf = requestAnimationFrame(step);
        };
        m.raf = requestAnimationFrame(step);
    }
    const monos = [...document.querySelectorAll('[data-mono]')];
    const monoHovers = [...document.querySelectorAll('[data-mono-hover]')];
    for (const el of [...monos, ...monoHovers]) monoWrap(el);

    // ------------------------------------------------------------ line reveal (their parts/text-reveal)
    const reveals = [...section.querySelectorAll('[data-reveal]')];
    function lineIn(el, delay = 0) {
        const lines = [...el.querySelectorAll('.gc-l')], n = lines.length;
        lines.forEach((l, t) => l.style.setProperty('--ld', (t * (0.135 + 0.03 * n) / (n > 1 ? n - 1 : 1) + 0.15 + delay).toFixed(3) + 's'));
        el.classList.remove('is-out');
        el.classList.add('is-in');
    }
    function lineOut(el) {
        el.classList.add('is-out');
        el.classList.remove('is-in');
    }

    // ------------------------------------------------------------ entrance: after the sound gate, like after their loader
    let entered = false;
    function enter() {
        if (entered) return;
        entered = true;
        root.classList.add('is-entered');
        const d = 0.62;
        const order = [$('gcHead'), ...section.querySelectorAll('.gc-desc[data-reveal]')];
        order.forEach((el, i) => lineIn(el, d + (i ? 0.08 : 0)));
        monos.forEach((el) => monoIn(el, { delay: d + 0.1 }));
        setTimeout(cycleNav, 4200);
    }
    for (const el of monos) monoWrap(el).live.textContent = '';
    (function waitStart() {
        if (window.CalendarClock && CalendarClock.started()) enter();
        else setTimeout(waitStart, 80);
    })();

    // ------------------------------------------------------------ header message: their rotating phrases
    const navMsg = document.querySelector('.ap-nav__msg[data-labels]');
    const phrases = navMsg ? navMsg.dataset.labels.split('|') : [];
    let navI = 0;
    if (navMsg) { const m = monoWrap(navMsg); m.shown = m.swapped = m.text.length; render(m); }
    function cycleNav() {
        if (!navMsg || reduce.matches) return;
        if (!document.hidden) {
            navI = (navI + 1) % phrases.length;
            const m = navMsg.__mono;
            monoOut(navMsg);
            setTimeout(() => { m.setText(phrases[navI]); monoIn(navMsg); }, 260);
        }
        setTimeout(cycleNav, 4200);
    }

    // ------------------------------------------------------------ hovers: fill, arrow swap, mono swap; card; socials
    const hoverable = (e) => e.pointerType === 'mouse' && finePointer.matches;
    for (const b of document.querySelectorAll('.gc-btn')) {
        const base = b.querySelector('.gc-btn__in:not(.gc-btn__in--h) [data-mono]'), over = b.querySelector('[data-mono-hover]');
        if (!over) continue;
        b.addEventListener('pointerenter', (e) => {
            if (!hoverable(e)) return;
            b.classList.add('is-h');
            monoIn(over, { dur: 0.15 });
            if (base) monoOut(base);
        });
        b.addEventListener('pointerleave', () => {
            if (!b.classList.contains('is-h')) return;
            b.classList.remove('is-h');
            monoOut(over);
            if (base) monoIn(base, { dur: 0.15 });
        });
    }
    const card = $('gcCard');
    if (card) {
        const over = card.querySelector('[data-mono-hover]');
        card.addEventListener('pointerenter', (e) => { if (hoverable(e)) monoIn(over, { dur: 0.05 }); });
        card.addEventListener('pointerleave', () => monoOut(over));
    }
    for (const a of document.querySelectorAll('.gc-social')) {
        const t = a.querySelector('[data-mono]');
        a.addEventListener('pointerenter', (e) => { if (hoverable(e)) monoIn(t, { dur: 0.15 }); });
    }

    // ------------------------------------------------------------ tooltip riding the cursor over [data-tip]
    const tip = $('gcTip'), tipText = document.createElement('span');
    tip.append(tipText);
    let tipOn = null, tipX = 0, tipY = 0, tipRaf = 0;
    const placeTip = () => { tipRaf = 0; tip.style.transform = `translate3d(${tipX}px, ${tipY}px, 0)`; };
    for (const el of document.querySelectorAll('[data-tip]')) {
        el.addEventListener('pointerenter', (e) => {
            if (!hoverable(e)) return;
            tipOn = el;
            tipText.textContent = el.dataset.tip;
            tipX = e.clientX; tipY = e.clientY;
            placeTip();
            tip.classList.add('is-on');
        });
        el.addEventListener('pointermove', (e) => {
            if (tipOn !== el) return;
            tipX = e.clientX; tipY = e.clientY;
            if (!tipRaf) tipRaf = requestAnimationFrame(placeTip);
        });
        el.addEventListener('pointerleave', () => { if (tipOn === el) { tipOn = null; tip.classList.remove('is-on'); } });
    }

    // ------------------------------------------------------------ clock: [ ● HH : MM : SS ] in New Delhi
    const hEl = $('gcH'), mEl = $('gcM'), sEl = $('gcS');
    function clock() {
        const d = new Date(Date.now() + 5.5 * 3600e3), p = (n) => String(n).padStart(2, '0');
        hEl.textContent = p(d.getUTCHours()); mEl.textContent = p(d.getUTCMinutes()); sEl.textContent = p(d.getUTCSeconds());
        setTimeout(clock, 1000 - (Date.now() % 1000) + 5);
    }
    clock();

    // ------------------------------------------------------------ sound switch: footer slot on desktop, the row on phones
    function placeSound() {
        const t = document.querySelector('.ss-toggle');
        const slot = document.querySelector(`[data-sound-slot="${desktop.matches ? 'bar' : 'follow'}"]`);
        if (t && slot && t.parentNode !== slot) slot.append(t);
    }
    desktop.addEventListener?.('change', placeSound);
    new MutationObserver(placeSound).observe(document.querySelector('[data-sound-slot="bar"]'), { childList: true });

    // ------------------------------------------------------------ panels
    function setPanel(p, open) {
        p.classList.toggle('is-open', open);
        const head = p.querySelector('.gc-panel__head');
        head.setAttribute('aria-expanded', String(open));
        head.querySelector('.gc-panel__pm i').textContent = open ? '-' : '+';
        p.querySelector('.gc-panel__body').inert = !open;
    }
    for (const p of document.querySelectorAll('.gc-panel')) {
        p.querySelector('.gc-panel__head').addEventListener('click', () => setPanel(p, !p.classList.contains('is-open')));
        setPanel(p, p.classList.contains('is-open'));
    }

    // ------------------------------------------------------------ settings: dim slider, dark / light
    const range = $('gcDimRange'), ticks = document.querySelector('.gc-ticks'), thumb = ticks.querySelector('.gc-ticks__thumb');
    ticks.querySelector('.gc-ticks__marks').innerHTML = '<i></i>'.repeat(24);
    function setDim() {
        const v = +range.value, k = (v - 1) / 23;
        root.style.setProperty('--dim', (v / 24).toFixed(3));
        thumb.style.setProperty('--tx-thumb', `calc(${k.toFixed(4)} * (${ticks.clientWidth}px - ${thumb.offsetWidth}px))`);
    }
    range.addEventListener('input', setDim);
    window.addEventListener('resize', setDim);
    setDim();
    const meta = document.querySelector('meta[name="theme-color"]');
    for (const b of document.querySelectorAll('[data-theme-set]')) {
        b.addEventListener('click', () => {
            const t = b.dataset.themeSet;
            root.dataset.theme = t;
            for (const o of document.querySelectorAll('[data-theme-set]')) o.setAttribute('aria-pressed', String(o === b));
            if (meta) meta.content = t === 'light' ? '#f9f4eb' : '#1a1c1c';
        });
    }

    // ------------------------------------------------------------ camera mode (their video room)
    const back = $('gcBack');
    let cam = false;
    function camMode(on) {
        if (on === cam) return;
        cam = on;
        root.classList.toggle('is-cam', on);
        const label = section.querySelector('.gc-label');
        if (on) {
            reveals.forEach(lineOut);
            monoOut(label);
            for (const el of section.querySelectorAll('.gc-follow [data-mono], .gc-cam-m [data-mono]')) monoOut(el);
            setPanel(panel, true);
            setTimeout(() => back.focus({ preventScroll: true }), 700);
        } else {
            reveals.forEach((el) => lineIn(el, 0.2));
            monoIn(label, { delay: 0.2 });
            for (const el of section.querySelectorAll('.gc-follow [data-mono], .gc-cam-m [data-mono]')) monoIn(el, { delay: 0.2 });
            if (state === 'live' || state === 'count' || state === 'waking') cancel(false);
        }
    }
    back.addEventListener('click', () => camMode(false));

    // ------------------------------------------------------------ booth
    const shot = $('gcShot'), booth = $('gcCam'), countEl = $('gcCount'), note = $('gcNote');
    const book = $('gcBook'), bookLabel = $('gcBookLabel'), pair = $('gcPair'), retake = $('gcRetake'), save = $('gcSave');
    const COLS = 30, ROWS = 38;                 // camera samples
    const GC = 15, GR = 19;                     // slot cells, about the portrait's 4:5
    const TONES = ['#3a2c06', '#b8860b', '#f6bf26', '#ffed29'];
    const GAP = '#fff7cf';
    const EDGES = [0.3, 0.55, 0.78];
    const HOLD = 0.035;
    const FPS = 24;
    const grab = document.createElement('canvas');
    grab.width = COLS; grab.height = ROWS;
    const gctx = grab.getContext('2d', { willReadFrequently: true });
    const bctx = booth.getContext('2d');
    const lum = new Float32Array(GC * GR), tone = new Int8Array(GC * GR).fill(-1);
    let lo = 0, hi = 255, fresh = true;
    let stream = null, video = null, state = 'idle', raf = 0, lastDraw = 0, snapBeat = -1, snapAt = 0, fallbackT0 = 0;
    let rsvpHref = `mailto:${CONTACT.email}?subject=${encodeURIComponent('RSVP: Work with Aarav')}`;

    function sizeBooth() {
        const r = shot.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
        booth.width = Math.max(1, Math.round(r.width * dpr));
        booth.height = Math.max(1, Math.round(r.height * dpr));
        if (state !== 'idle') paint();
    }

    function sample() {
        if (!video || video.readyState < 2 || !video.videoWidth) return false;
        const vw = video.videoWidth, vh = video.videoHeight, aspect = GC / GR;
        let sw = vw, sh = vw / aspect;
        if (sh > vh) { sh = vh; sw = vh * aspect; }
        gctx.setTransform(-1, 0, 0, 1, COLS, 0);
        gctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, COLS, ROWS);
        const px = gctx.getImageData(0, 0, COLS, ROWS).data;
        const hist = new Uint16Array(32);
        const k = fresh ? 1 : 0.5;
        for (let r = 0; r < GR; r++) for (let c = 0; c < GC; c++) {
            // each slot cell averages its 2 x 2 camera samples
            const x = c * 2, y = r * 2;
            let s = 0;
            for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
                const p = ((y + dy) * COLS + x + dx) * 4;
                s += 0.299 * px[p] + 0.587 * px[p + 1] + 0.114 * px[p + 2];
            }
            const i = r * GC + c;
            lum[i] += (s / 4 - lum[i]) * k;
            hist[Math.min(31, lum[i] >> 3)]++;
        }
        const n = GC * GR;
        let acc = 0, l = -1, h = 31;
        for (let b = 0; b < 32; b++) { acc += hist[b]; if (l < 0 && acc > n * 0.02) l = b; if (acc >= n * 0.98) { h = b + 1; break; } }
        const e = fresh ? 1 : 0.1;
        lo += (l * 8 - lo) * e;
        hi += (h * 8 - hi) * e;
        const span = Math.max(40, hi - lo);
        for (let i = 0; i < n; i++) {
            const v = (lum[i] - lo) / span;
            let t = v < EDGES[0] ? 0 : v < EDGES[1] ? 1 : v < EDGES[2] ? 2 : 3;
            const p = tone[i];
            // near an edge a cell keeps its tone, so a still face is a still stack of meetings
            if (p >= 0 && Math.abs(p - t) === 1 && Math.abs(v - EDGES[Math.min(p, t)]) < HOLD) t = p;
            tone[i] = t;
        }
        fresh = false;
        return true;
    }

    // Every column is a stack of meetings: runs of one tone become one rounded block, with the calendar's cream gaps
    function paint() {
        const W = booth.width, H = booth.height, cw = W / GC, ch = H / GR;
        const gap = Math.max(1, Math.round(cw * 0.12)), rad = Math.min(3, cw * 0.22);
        bctx.fillStyle = GAP;
        bctx.fillRect(0, 0, W, H);
        for (let c = 0; c < GC; c++) {
            const x0 = Math.round(c * cw) + (gap >> 1), x1 = Math.round((c + 1) * cw) - (gap - (gap >> 1));
            let r = 0;
            while (r < GR) {
                const t = tone[r * GC + c];
                let e = r + 1;
                while (e < GR && tone[e * GC + c] === t && e - r < 6) e++;
                if (t >= 0) {
                    const y0 = Math.round(r * ch) + (gap >> 1), y1 = Math.round(e * ch) - (gap - (gap >> 1));
                    bctx.fillStyle = TONES[t];
                    bctx.beginPath();
                    if (bctx.roundRect) bctx.roundRect(x0, y0, x1 - x0, y1 - y0, rad); else bctx.rect(x0, y0, x1 - x0, y1 - y0);
                    bctx.fill();
                }
                r = e;
            }
        }
    }

    // beats on the calendar's clock (the soundtrack's, when it plays); a steady 131.9 bpm otherwise
    const clockNow = () => (window.CalendarClock && CalendarClock.started() ? CalendarClock.time() : (performance.now() - fallbackT0) / 1000);
    const BEAT = window.CalendarClock ? CalendarClock.BEAT : 60 / 131.958;
    let beat0 = 0, lastCount = '';
    function beatIndex() {
        // unwrap the loop so counting across the seam keeps going up
        const t = clockNow(), b = Math.floor(t / BEAT);
        if (b + 48 * beat0 < (beatIndex.prev || -Infinity) - 24) beat0++;
        beatIndex.prev = b + 48 * beat0;
        return beatIndex.prev;
    }

    function loop(now) {
        raf = 0;
        if (state === 'live' || state === 'count') {
            if (now - lastDraw >= 1000 / FPS - 2 && sample()) { paint(); lastDraw = now; }
            const b = beatIndex();
            if (state === 'live' && !fresh) {
                // four beats of count-in, the shot on the downbeat after them
                snapBeat = (Math.floor(b / 4) + 2) * 4;
                setState('count');
            }
            if (state === 'count') {
                const left = snapBeat - b;
                const txt = left > 4 ? '' : left > 0 ? String(left) : '';
                if (txt !== lastCount) {
                    lastCount = txt;
                    countEl.textContent = txt;
                    countEl.classList.remove('is-tick');
                    if (txt) { void countEl.offsetWidth; countEl.classList.add('is-tick'); }
                }
                if (left <= 0) snap();
            }
        }
        if (state === 'live' || state === 'count') raf = requestAnimationFrame(loop);
    }

    function stopTracks() {
        if (stream) for (const t of stream.getTracks()) t.stop();
        stream = null;
        if (video) { video.pause(); video.srcObject = null; video = null; }
    }

    const say = (text) => { note.textContent = text; };
    const LABELS = { idle: 'Book yourself in', waking: 'Waking camera', live: 'Cancel', count: 'Cancel', booked: 'Send the RSVP' };
    function setState(s) {
        state = s;
        panel.dataset.booth = s;
        pair.hidden = s !== 'booked';
        book.disabled = s === 'waking';
        if (bookLabel.textContent !== LABELS[s]) bookLabel.textContent = LABELS[s];
    }

    async function start() {
        if (state === 'waking' || state === 'live' || state === 'count') return;
        camMode(true);
        if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { say('No camera here. The RSVP works by email all the same.'); return; }
        setState('waking');
        say('Hold still for four beats. Nothing leaves this device.');
        fallbackT0 = performance.now();
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } });
            video = document.createElement('video');
            video.muted = true;
            video.playsInline = true;
            video.srcObject = stream;
            await video.play();
            if (!video.videoWidth) await new Promise((r) => video.addEventListener('loadeddata', r, { once: true }));
            if (document.hidden || !cam) throw Object.assign(new Error('hidden'), { name: 'AbortError' });
        } catch (e) {
            stopTracks();
            setState('idle');
            const n = e && e.name;
            say(n === 'AbortError' ? ''
                : n === 'NotAllowedError' || n === 'SecurityError' ? 'Camera blocked, no problem: the RSVP works by email.'
                    : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'No camera found. The RSVP works by email.'
                        : n === 'NotReadableError' ? 'The camera is busy in another app.' : 'Camera unavailable. The RSVP works by email.');
            return;
        }
        fresh = true;
        tone.fill(-1);
        lum.fill(0);
        lastCount = '';
        countEl.textContent = '';
        sizeBooth();
        setState('live');
        if (!raf) raf = requestAnimationFrame(loop);
    }

    function cancel(silent) {
        stopTracks();
        cancelAnimationFrame(raf);
        raf = 0;
        countEl.textContent = '';
        setState(snapAt ? 'booked' : 'idle');
        if (!silent) say('');
    }

    function snap() {
        sample();
        paint();
        stopTracks();
        snapAt = Date.now();
        countEl.textContent = '';
        shot.classList.remove('is-flash');
        void shot.offsetWidth;
        shot.classList.add('is-flash');
        setState('booked');
        const d = new Date(snapAt + 5.5 * 3600e3);
        const when = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
        rsvpHref = `mailto:${CONTACT.email}?subject=${encodeURIComponent('RSVP: Work with Aarav')}&body=${encodeURIComponent(`Hi Aarav,\n\nI booked myself into your calendar on ${when}. Let's talk about:\n\n`)}`;
        say('Booked. The camera is off; send the RSVP to make it official.');
    }

    function saveInvite() {
        const W = 1200, H = 630, c = document.createElement('canvas');
        c.width = W; c.height = H;
        const x = c.getContext('2d');
        x.fillStyle = '#1a1c1c'; x.fillRect(0, 0, W, H);
        const sw = 300, sh = 375, sy = 170;
        const img = shot.querySelector('img');
        const rr = (X, Y, w, h) => { x.save(); x.beginPath(); if (x.roundRect) x.roundRect(X, Y, w, h, 6); else x.rect(X, Y, w, h); x.clip(); };
        rr(60, sy, sw, sh);
        try { x.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 60, sy, sw, sh); } catch (e) { /* not loaded */ }
        x.restore();
        rr(400, sy, sw, sh);
        x.drawImage(booth, 0, 0, booth.width, booth.height, 400, sy, sw, sh);
        x.restore();
        x.fillStyle = '#f9f4eb';
        x.font = '700 76px SuisseBPIntl, Helvetica, Arial, sans-serif';
        x.fillText('BRIEF ME SOMETHING.', 60, 120);
        x.font = '500 20px Sometype, monospace';
        x.fillText('AARAV · ORGANIZER', 60, sy + sh + 36);
        x.fillText('YOU · GOING', 400, sy + sh + 36);
        const d = new Date(snapAt + 5.5 * 3600e3);
        const lines = ['[ BOOKED ]', d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).toUpperCase(),
            String(d.getUTCHours()).padStart(2, '0') + ' : ' + String(d.getUTCMinutes()).padStart(2, '0') + ' IST', '', CONTACT.email.toUpperCase()];
        lines.forEach((l, i) => x.fillText(l, 760, sy + 30 + i * 34));
        c.toBlob((blob) => {
            if (!blob) return;
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'invite-aarav-pilania.png';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        }, 'image/png');
    }

    for (const b of document.querySelectorAll('[data-book]')) {
        b.addEventListener('click', () => {
            if (state === 'booked' && b === book) { location.href = rsvpHref; return; }
            if ((state === 'live' || state === 'count') && b === book) { cancel(false); return; }
            if (state === 'booked') { camMode(true); return; }
            start();
        });
    }
    retake.addEventListener('click', () => { snapAt = 0; setState('idle'); start(); });
    save.addEventListener('click', saveInvite);
    document.addEventListener('visibilitychange', () => { if (document.hidden && (state === 'live' || state === 'count' || state === 'waking')) cancel(true); });
    window.addEventListener('pagehide', () => cancel(true));
    window.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || document.querySelector('.ap-nav.is-open')) return;
        if (state === 'live' || state === 'count') cancel(false);
        else if (cam) camMode(false);
    });
    window.addEventListener('resize', () => { if (state !== 'idle') sizeBooth(); });
    setState('idle');

    window.__invite = {
        get state() { return state; },
        get cam() { return cam; },
        get liveTracks() { return stream ? stream.getTracks().filter((t) => t.readyState === 'live').length : 0; },
        start, cancel, snap, camMode, enter,
    };
})();
