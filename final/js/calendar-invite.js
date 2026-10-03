// The contact UI over the calendar: headline lines rise out of clips, mono labels type in as glyphs and resolve, a
// live India clock, the brief form that opens out of its button and posts straight to the inbox, and the side column:
// the soundtrack switch and "Join the calendar", where the camera renders the visitor live as stacks of calendar
// meetings at one of three grid sizes. Frames are read from a small canvas and never leave the page.
const CONTACT = {
    email: 'aaravpilania2006@gmail.com',
    github: 'https://github.com/AaravPilania',
    // FILL IN: full profile URLs; an empty one hides its icon
    linkedin: '',
    instagram: '',
    // optional: a Web3Forms access key sends the brief through Web3Forms instead of FormSubmit
    web3formsKey: '',
};

(() => {
    'use strict';

    const root = document.body, section = document.getElementById('gcContact'), panel = document.getElementById('gcBooth');
    if (!section || !panel) return;
    const $ = (id) => document.getElementById(id);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = window.matchMedia('(min-width: 1000px)');

    for (const key of ['github', 'linkedin', 'instagram']) for (const a of document.querySelectorAll(`[data-link="${key}"]`)) {
        if (CONTACT[key]) a.href = CONTACT[key];
        else a.hidden = true;
    }

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
        let s = '';
        for (let i = 0; i < Math.min(m.text.length, m.shown); i++) s += i < m.swapped ? m.text[i] : m.rand[i];
        m.live.textContent = s;
    }
    function monoIn(el, { delay = 0, dur = 0.25 } = {}) {
        const m = monoWrap(el);
        cancelAnimationFrame(m.raf);
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
    for (const el of monos) monoWrap(el).live.textContent = '';

    // ------------------------------------------------------------ line reveal (their parts/text-reveal)
    const head = $('gcHead');
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

    // ------------------------------------------------------------ entrance: after the sound gate
    let entered = false;
    function enter() {
        if (entered) return;
        entered = true;
        root.classList.add('is-entered');
        lineIn(head, 0.62);
        monos.forEach((el) => monoIn(el, { delay: 0.72 }));
        if (location.hash === '#brief') setTimeout(() => brief(true), 900);
    }
    (function waitStart() {
        if (window.CalendarClock && CalendarClock.started()) enter();
        else setTimeout(waitStart, 80);
    })();

    // ------------------------------------------------------------ clock: always the real time in India
    const clockEl = $('gcClock');
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    (function tick() {
        clockEl.textContent = fmt.format(new Date());
        setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    })();

    // ------------------------------------------------------------ the brief: a form that opens out of its button
    const openBtn = $('gcBriefOpen'), form = $('gcBrief'), f = $('gcForm'), note = $('gcFormNote'), send = $('gcSendLabel');
    let briefOpen = false;
    function brief(open) {
        if (open === briefOpen) return;
        briefOpen = open;
        root.classList.toggle('is-brief', open);
        openBtn.setAttribute('aria-expanded', String(open));
        form.inert = !open;
        if (open) {
            if (cam) camMode(false);
            lineOut(head);
            setTimeout(() => (form.dataset.state === 'done' ? $('gcFormAgain') : f.elements.name).focus({ preventScroll: true }), 450);
        } else {
            lineIn(head, 0.1);
            openBtn.focus({ preventScroll: true });
        }
    }
    openBtn.addEventListener('click', () => brief(true));
    $('gcBriefClose').addEventListener('click', () => brief(false));
    window.addEventListener('ap:hash', (e) => { if (e.detail === '#brief') brief(true); });
    $('gcFormAgain').addEventListener('click', () => {
        f.reset();
        setForm('idle');
        f.elements.name.focus({ preventScroll: true });
    });

    const LABEL = { idle: 'Send it', sending: 'Sending', error: 'Try again', done: 'Sent' };
    function setForm(s, msg = '') {
        form.dataset.state = s;
        send.textContent = LABEL[s];
        note.textContent = msg;
        $('gcSend').disabled = s === 'sending';
    }
    f.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (form.dataset.state === 'sending') return;
        const d = Object.fromEntries(new FormData(f));
        if (d._honey) return;
        const bad = !d.name.trim() ? 'name' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()) ? 'email' : !d.message.trim() ? 'message' : '';
        if (bad) {
            setForm('idle', bad === 'email' ? 'That email looks off.' : `The ${bad} is missing.`);
            f.elements[bad].focus();
            return;
        }
        setForm('sending');
        const subject = `New brief: ${d.project} from ${d.name.trim()}`;
        const w3 = !!CONTACT.web3formsKey;
        const body = w3
            ? { access_key: CONTACT.web3formsKey, subject, from_name: d.name, name: d.name, email: d.email, project: d.project, message: d.message }
            : { name: d.name, email: d.email, project: d.project, message: d.message, _subject: subject, _replyto: d.email, _template: 'table', _captcha: 'false' };
        try {
            const res = await fetch(w3 ? 'https://api.web3forms.com/submit' : `https://formsubmit.co/ajax/${CONTACT.email}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(body),
            });
            const out = await res.json().catch(() => ({}));
            if (!res.ok || String(out.success) !== 'true') throw new Error(out.message || 'failed');
            setForm('done');
        } catch (err) {
            setForm('error', `Didn't go through. Write to ${CONTACT.email} instead.`);
        }
    });

    // ------------------------------------------------------------ copy the email from its box
    const mailK = $('gcMailK');
    $('gcMailText').textContent = CONTACT.email;
    let mailT = 0;
    $('gcMail').addEventListener('click', async () => {
        let ok = false;
        try { await navigator.clipboard.writeText(CONTACT.email); ok = true; } catch (e) { /* no clipboard */ }
        if (!ok) { location.href = 'mailto:' + CONTACT.email; return; }
        mailK.textContent = 'Copied';
        clearTimeout(mailT);
        mailT = setTimeout(() => { mailK.textContent = 'Copy'; }, 1600);
    });

    // ------------------------------------------------------------ panel
    function setPanel(open) {
        panel.classList.toggle('is-open', open);
        const h = panel.querySelector('.gc-panel__head');
        h.setAttribute('aria-expanded', String(open));
        h.querySelector('.gc-panel__pm i').textContent = open ? '−' : '+';
        panel.querySelector('.gc-panel__body').inert = !open;
    }
    panel.querySelector('.gc-panel__head').addEventListener('click', () => setPanel(!panel.classList.contains('is-open')));
    setPanel(desktop.matches);

    // ------------------------------------------------------------ camera mode: the brief closes, the panel opens
    let cam = false;
    function camMode(on) {
        if (on === cam) return;
        cam = on;
        root.classList.toggle('is-cam', on);
        if (on) {
            if (briefOpen) brief(false);
            setPanel(true);
        } else if (state !== 'idle') stop('');
    }

    // ------------------------------------------------------------ booth
    const shot = $('gcShot'), booth = $('gcCam'), say = (t) => { $('gcNote').textContent = t; };
    const book = $('gcBook'), bookLabel = $('gcBookLabel');
    // fine / mid / coarse: slot columns and rows at about the portrait's 4:5
    const GRIDS = [[30, 38], [15, 19], [8, 10]];
    const TONES = ['#3a2c06', '#b8860b', '#f6bf26', '#ffed29'];
    const GAP = '#fff7cf';
    const EDGES = [0.3, 0.55, 0.78];
    const HOLD = 0.035;
    const FPS = 24;
    const grab = document.createElement('canvas');
    const gctx = grab.getContext('2d', { willReadFrequently: true });
    const bctx = booth.getContext('2d');
    let GC = 0, GR = 0, lum = null, tone = null, lo = 0, hi = 255, fresh = true;
    let stream = null, video = null, state = 'idle', raf = 0, lastDraw = 0;

    function setGrid(i) {
        [GC, GR] = GRIDS[i];
        grab.width = GC * 2; grab.height = GR * 2;
        lum = new Float32Array(GC * GR);
        tone = new Int8Array(GC * GR).fill(-1);
        fresh = true;
        for (const b of document.querySelectorAll('[data-cell]')) b.setAttribute('aria-checked', String(+b.dataset.cell === i));
    }
    setGrid(0);
    for (const b of document.querySelectorAll('[data-cell]')) b.addEventListener('click', () => setGrid(+b.dataset.cell));

    function sizeBooth() {
        const r = shot.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
        booth.width = Math.max(1, Math.round(r.width * dpr));
        booth.height = Math.max(1, Math.round(r.height * dpr));
    }

    function sample() {
        if (!video || video.readyState < 2 || !video.videoWidth) return false;
        const vw = video.videoWidth, vh = video.videoHeight, aspect = GC / GR, W = GC * 2, H = GR * 2;
        let sw = vw, sh = vw / aspect;
        if (sh > vh) { sh = vh; sw = vh * aspect; }
        gctx.setTransform(-1, 0, 0, 1, W, 0);
        gctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, W, H);
        const px = gctx.getImageData(0, 0, W, H).data;
        const hist = new Uint16Array(32), n = GC * GR, k = fresh ? 1 : 0.5;
        for (let r = 0; r < GR; r++) for (let c = 0; c < GC; c++) {
            let s = 0;
            for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
                const p = ((r * 2 + dy) * W + c * 2 + dx) * 4;
                s += 0.299 * px[p] + 0.587 * px[p + 1] + 0.114 * px[p + 2];
            }
            const i = r * GC + c;
            lum[i] += (s / 4 - lum[i]) * k;
            hist[Math.min(31, lum[i] >> 3)]++;
        }
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

    // every column is a stack of meetings: runs of one tone become one rounded block, with the calendar's cream gaps
    function paint() {
        const W = booth.width, H = booth.height, cw = W / GC, ch = H / GR;
        const gap = Math.max(1, Math.round(cw * 0.12)), rad = Math.min(4, cw * 0.22);
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

    function loop(now) {
        raf = 0;
        if (state !== 'live') return;
        if (now - lastDraw >= 1000 / FPS - 2 && sample()) { paint(); lastDraw = now; }
        raf = requestAnimationFrame(loop);
    }

    function stopTracks() {
        if (stream) for (const t of stream.getTracks()) t.stop();
        stream = null;
        if (video) { video.pause(); video.srcObject = null; video = null; }
    }

    const LABELS = { idle: 'Use camera', waking: 'Waking camera', live: 'Stop camera' };
    function setState(s) {
        state = s;
        panel.dataset.booth = s;
        book.disabled = s === 'waking';
        bookLabel.textContent = LABELS[s];
    }

    async function start() {
        if (state !== 'idle') return;
        camMode(true);
        if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { say('No camera here.'); return; }
        setState('waking');
        say('Nothing leaves this device.');
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
            camMode(false);
            const n = e && e.name;
            say(n === 'AbortError' ? ''
                : n === 'NotAllowedError' || n === 'SecurityError' ? 'Camera blocked. Allow it to join.'
                    : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'No camera found.'
                        : n === 'NotReadableError' ? 'The camera is busy in another app.' : 'Camera unavailable.');
            return;
        }
        fresh = true;
        tone.fill(-1);
        lum.fill(0);
        sizeBooth();
        setState('live');
        if (!raf) raf = requestAnimationFrame(loop);
    }

    function stop(msg) {
        stopTracks();
        cancelAnimationFrame(raf);
        raf = 0;
        setState('idle');
        say(msg);
        camMode(false);
    }

    book.addEventListener('click', () => (state === 'idle' ? start() : state === 'live' ? stop('') : null));
    document.addEventListener('visibilitychange', () => { if (document.hidden && state !== 'idle') stop(''); });
    window.addEventListener('pagehide', () => { if (state !== 'idle') stop(''); });
    window.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || document.querySelector('.ap-nav.is-open')) return;
        if (briefOpen) brief(false);
        else if (state !== 'idle') stop('');
    });
    window.addEventListener('resize', () => { if (state === 'live') sizeBooth(); });
    setState('idle');

    window.__invite = {
        get state() { return state; },
        get liveTracks() { return stream ? stream.getTracks().filter((t) => t.readyState === 'live').length : 0; },
        start, stop, brief, enter,
    };
})();
