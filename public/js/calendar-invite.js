// The invite card on the contact calendar: "Work with Aarav", organised by Aarav (his portrait is the organizer's
// event block) with one open guest slot. "Book yourself in" turns on the camera and renders the visitor into that slot
// as a stack of calendar meetings in the page's yellows; four beats of the soundtrack count in and the next downbeat
// takes the shot. The camera stops right there, the slot keeps the portrait, the visitor is "going", and the RSVP is
// one mail away. Frames are read from a 30 x 38 pixel canvas and never leave the page.
const CONTACT = {
    email: 'aaravpilania2006@gmail.com',
    // full profile URLs; a link stays hidden while its value is empty
    linkedin: '',
    x: '',
    github: 'https://github.com/AaravPilania',
};

(() => {
    'use strict';

    const card = document.getElementById('gcInvite');
    if (!card) return;
    const $ = (id) => document.getElementById(id);
    const fold = $('gcInviteFold'), body = $('gcInviteBody'), nowEl = $('gcInviteNow');
    const guest = $('gcGuest'), booth = $('gcBooth'), countEl = $('gcBoothCount'), stateEl = $('gcGuestState');
    const book = $('gcBook'), bookLabel = $('gcBookLabel'), retake = $('gcRetake'), save = $('gcSave'), msg = $('gcBoothMsg');
    const mail = $('gcMail');
    const MSG_IDLE = msg.textContent;

    // ------------------------------------------------------------ links
    const handle = (url) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
    for (const key of ['linkedin', 'x']) {
        const li = card.querySelector(`[data-link="${key}"]`), url = CONTACT[key];
        if (!li || !url) continue;
        li.querySelector('a').href = url;
        li.querySelector('.gc-link__v').textContent = handle(url);
        li.hidden = false;
    }
    if (CONTACT.github) $('gcGithub').href = CONTACT.github; else $('gcGithub').hidden = true;
    for (const b of card.querySelectorAll('[data-copy]')) {
        let t = 0;
        b.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(b.dataset.copy); } catch (e) { location.href = 'mailto:' + b.dataset.copy; return; }
            b.textContent = 'Copied';
            clearTimeout(t);
            t = setTimeout(() => { b.textContent = 'Copy'; }, 1500);
        });
    }

    // ------------------------------------------------------------ card
    function clock() {
        const d = new Date(Date.now() + 5.5 * 3600e3);
        nowEl.textContent = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} in New Delhi`;
    }
    clock();
    setInterval(clock, 15000);

    const mobile = window.matchMedia('(max-width: 699px)');
    function setOpen(open) {
        card.classList.toggle('is-folded', !open);
        fold.setAttribute('aria-expanded', String(open));
        fold.setAttribute('aria-label', open ? 'Fold the invite' : 'Open the invite');
        body.inert = !open;
    }
    fold.addEventListener('click', () => setOpen(card.classList.contains('is-folded')));
    setOpen(true);

    // ------------------------------------------------------------ booth
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

    function sizeBooth() {
        const r = guest.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
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
                state = 'count';
                guest.classList.add('is-counting');
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

    function say(text) { msg.textContent = text; }

    function setState(s) {
        state = s;
        card.dataset.booth = s;
        guest.classList.toggle('is-live', s === 'live' || s === 'count' || s === 'waking');
        guest.classList.toggle('is-booked', s === 'booked');
        if (s !== 'count') guest.classList.remove('is-counting');
        retake.hidden = s !== 'booked';
        save.hidden = s !== 'booked';
        book.disabled = s === 'waking';
        bookLabel.textContent = s === 'waking' ? 'Waking camera' : s === 'live' || s === 'count' ? 'Cancel' : s === 'booked' ? 'Send the RSVP' : 'Book yourself in';
        stateEl.textContent = s === 'booked' ? 'going' : s === 'live' || s === 'count' ? 'on camera' : 'invited';
    }

    async function start() {
        if (state === 'waking' || state === 'live' || state === 'count') return;
        if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { say('No camera on this page. The RSVP works by email all the same.'); return; }
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
            if (document.hidden) throw Object.assign(new Error('hidden'), { name: 'AbortError' });
        } catch (e) {
            stopTracks();
            setState('idle');
            const n = e && e.name;
            say(n === 'AbortError' ? MSG_IDLE
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
        setState('idle');
        if (!silent) say(MSG_IDLE);
    }

    function snap() {
        sample();
        paint();
        stopTracks();
        snapAt = Date.now();
        countEl.textContent = '';
        guest.classList.remove('is-flash');
        void guest.offsetWidth;
        guest.classList.add('is-flash');
        setState('booked');
        const d = new Date(snapAt + 5.5 * 3600e3);
        const when = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
        mail.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent('RSVP: Work with Aarav')}&body=${encodeURIComponent(`Hi Aarav,\n\nI booked myself into your calendar on ${when}. Let's talk about:\n\n`)}`;
        say('Booked. The camera is off; send the RSVP to make it official.');
    }

    function saveInvite() {
        const W = 1200, H = 630, c = document.createElement('canvas');
        c.width = W; c.height = H;
        const x = c.getContext('2d');
        x.fillStyle = '#121316'; x.fillRect(0, 0, W, H);
        x.fillStyle = '#ffed29'; x.fillRect(0, 60, 8, H - 120);
        const sw = 300, sh = 375, sy = 150;
        const img = card.querySelector('.gc-slot--photo img');
        const rr = (X, Y, w, h) => { x.save(); x.beginPath(); if (x.roundRect) x.roundRect(X, Y, w, h, 10); else x.rect(X, Y, w, h); x.clip(); };
        rr(80, sy, sw, sh);
        try { x.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 80, sy, sw, sh); } catch (e) { /* not loaded */ }
        x.restore();
        rr(420, sy, sw, sh);
        x.drawImage(booth, 0, 0, booth.width, booth.height, 420, sy, sw, sh);
        x.restore();
        x.fillStyle = '#f4f2ea';
        x.font = '700 64px Brier, Georgia, serif';
        x.fillText('Work with Aarav', 80, 110);
        x.font = '500 22px "IBM Plex Mono", monospace';
        x.fillStyle = 'rgba(244,242,234,0.6)';
        x.fillText('AARAV  ORGANIZER', 80, sy + sh + 40);
        x.fillText('YOU  GOING', 420, sy + sh + 40);
        x.fillStyle = '#ffed29';
        x.font = '700 120px Brier, Georgia, serif';
        x.fillText('×', 372, sy + sh / 2 + 40);
        x.font = '500 22px "IBM Plex Mono", monospace';
        x.fillStyle = 'rgba(244,242,234,0.6)';
        const d = new Date(snapAt + 5.5 * 3600e3);
        const lines = ['BOOKED', d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).toUpperCase(),
            String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0') + ' IST', '', CONTACT.email];
        lines.forEach((l, i) => x.fillText(l, 780, sy + 30 + i * 36));
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

    book.addEventListener('click', () => {
        if (state === 'booked') { location.href = mail.href; return; }
        if (state === 'live' || state === 'count') { cancel(false); return; }
        start();
    });
    retake.addEventListener('click', () => { start(); });
    save.addEventListener('click', saveInvite);
    document.addEventListener('visibilitychange', () => { if (document.hidden && (state === 'live' || state === 'count' || state === 'waking')) cancel(true); });
    window.addEventListener('pagehide', () => cancel(true));
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && (state === 'live' || state === 'count')) cancel(false); });
    window.addEventListener('resize', () => { if (state !== 'idle') sizeBooth(); });
    mobile.addEventListener?.('change', () => { if (state !== 'idle') sizeBooth(); });

    window.__invite = {
        get state() { return state; },
        get liveTracks() { return stream ? stream.getTracks().filter((t) => t.readyState === 'live').length : 0; },
        start, cancel, snap,
    };
})();
