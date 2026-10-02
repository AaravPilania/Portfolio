// Site-wide sound: the visitor's choice, the entry gate that asks for it (and is the gesture that unlocks audio), and
// the on/off toggle. Engine-agnostic: pages pass callbacks, so any page with a soundtrack can adopt it.
//   SiteSound.pref()                 -> 'on' | 'off' | null (the choice made in this browsing session)
//   SiteSound.setPref(v)
//   SiteSound.gate(opts)             -> Promise<boolean> sound wanted; opts { kicker, title, body, foot, onChoose(sound) }
//                                       onChoose runs synchronously inside the click, where audio may be unlocked
//   SiteSound.toggle(opts)           -> { el, set(muted), get muted() }; opts { muted, onChange(muted), levels(out),
//                                       mount (element, default body), hotkey ('m') }
window.SiteSound = (() => {
    'use strict';

    const KEY = 'ap.sound';
    const SESSION_MS = 12 * 3600e3;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function pref() {
        try {
            const o = JSON.parse(localStorage.getItem(KEY) || 'null');
            if (o && (o.v === 'on' || o.v === 'off') && Date.now() - o.t < SESSION_MS) return o.v;
        } catch (e) { /* storage blocked */ }
        return null;
    }
    function setPref(v) {
        try { localStorage.setItem(KEY, JSON.stringify({ v, t: Date.now() })); } catch (e) { /* storage blocked */ }
    }

    // ------------------------------------------------------------ gate
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    function gate(opts = {}) {
        return new Promise((resolve) => {
            const el = document.createElement('div');
            el.className = 'ss-gate';
            el.setAttribute('role', 'dialog');
            el.setAttribute('aria-modal', 'true');
            el.setAttribute('aria-labelledby', 'ssGateTitle');
            el.setAttribute('aria-describedby', 'ssGateBody');
            el.innerHTML = `
                <div class="ss-gate__scrim"></div>
                <div class="ss-gate__card">
                    <div class="ss-gate__meta"><i class="ss-gate__swatch" aria-hidden="true"></i><span>${esc(opts.kicker || 'Soundtrack')}</span><span class="ss-gate__clock" aria-hidden="true"></span></div>
                    <h2 class="ss-gate__title" id="ssGateTitle">${esc(opts.title || 'Sound on?')}</h2>
                    <p class="ss-gate__body" id="ssGateBody">${esc(opts.body || 'This page has a soundtrack.')}</p>
                    <div class="ss-gate__actions">
                        <button class="ss-gate__btn ss-gate__btn--on" type="button" data-sound="1">
                            <span class="ss-gate__eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span>Enter with sound</span>
                        </button>
                        <button class="ss-gate__btn ss-gate__btn--off" type="button" data-sound="0">
                            <span class="ss-gate__flat" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span>Enter without sound</span>
                        </button>
                    </div>
                    ${opts.foot ? `<p class="ss-gate__foot">${esc(opts.foot)}</p>` : ''}
                </div>`;
            document.body.appendChild(el);
            const clock = el.querySelector('.ss-gate__clock');
            const tick = () => {
                const d = new Date(Date.now() + 5.5 * 3600e3);
                clock.textContent = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} IST`;
            };
            tick();
            const clockTimer = setInterval(tick, 10000);
            const prevFocus = document.activeElement;
            const buttons = [...el.querySelectorAll('button')];
            requestAnimationFrame(() => {
                el.classList.add('is-in');
                buttons[0].focus({ preventScroll: true });
            });

            let done = false;
            function choose(sound) {
                if (done) return;
                done = true;
                setPref(sound ? 'on' : 'off');
                if (opts.onChoose) opts.onChoose(sound);
                clearInterval(clockTimer);
                document.removeEventListener('keydown', onKey, true);
                el.classList.remove('is-in');
                el.classList.add('is-out');
                el.setAttribute('aria-hidden', 'true');
                setTimeout(() => el.remove(), reduceMotion.matches ? 0 : 520);
                if (prevFocus && prevFocus.focus && prevFocus !== document.body) prevFocus.focus({ preventScroll: true });
                resolve(sound);
            }
            function onKey(e) {
                if (e.key === 'Escape') { e.preventDefault(); choose(false); }
                else if (e.key === 'Tab') {
                    // focus stays on the two choices while the dialog is up
                    e.preventDefault();
                    const i = buttons.indexOf(document.activeElement);
                    buttons[(i + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
                }
            }
            document.addEventListener('keydown', onKey, true);
            for (const b of buttons) b.addEventListener('click', () => choose(b.dataset.sound === '1'));
        });
    }

    // ------------------------------------------------------------ toggle
    // Five bars that follow the music; muting cancels them into a dashed line that wobbles flat, unmuting springs
    // them back up with a little overshoot.
    const NB = 5;
    const MIN = 0.16;
    function toggle(opts = {}) {
        let muted = !!opts.muted;
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'ss-toggle' + (opts.mount ? '' : ' ss-toggle--fixed');
        el.innerHTML = `<span class="ss-toggle__bars" aria-hidden="true">${'<i></i>'.repeat(NB)}</span>
            <span class="ss-toggle__label" aria-hidden="true"><span class="ss-toggle__roll"><span>On</span><span>Off</span></span></span>`;
        (opts.mount || document.body).appendChild(el);
        const bars = [...el.querySelectorAll('i')];
        const lv = new Float32Array(NB);
        const y = new Float32Array(NB).fill(muted ? MIN : 0.5), v = new Float32Array(NB);
        let raf = 0, last = 0, mutedAt = -1e9, t0 = performance.now();

        function sync() {
            el.classList.toggle('is-muted', muted);
            el.setAttribute('aria-pressed', String(!muted));
            el.setAttribute('aria-label', muted ? 'Sound off. Turn sound on' : 'Sound on. Mute');
            el.title = muted ? 'Sound off (M)' : 'Sound on (M)';
        }

        function frame(now) {
            raf = 0;
            const dt = Math.min(0.05, (now - (last || now)) / 1000);
            last = now;
            const live = !muted && opts.levels ? opts.levels(lv) : null;
            const since = (now - mutedAt) / 1000;
            let moving = false;
            for (let i = 0; i < NB; i++) {
                let target;
                if (muted) target = MIN;
                else if (live && live[i] > 0.01) target = MIN + (1 - MIN) * Math.min(1, live[i] * 1.25);
                else target = 0.42 + 0.3 * Math.sin((now - t0) / 1000 * (3.1 + i * 0.7) + i * 1.3);
                // muted: soft and slightly under-damped; live: stiff enough to follow the beat
                const k = muted ? 120 : 520, c = muted ? 9 : 26;
                v[i] += ((target - y[i]) * k - v[i] * c) * dt;
                y[i] += v[i] * dt;
                if (y[i] < 0.06) { y[i] = 0.06; v[i] = 0; }
                let dy = 0;
                if (muted && since < 1.4) dy = 3.6 * Math.exp(-since / 0.32) * Math.sin(since * 2 * Math.PI * 3.4 - i * 0.95);
                if (Math.abs(v[i]) > 0.002 || Math.abs(target - y[i]) > 0.002 || Math.abs(dy) > 0.05) moving = true;
                bars[i].style.transform = `translate3d(0,${dy.toFixed(2)}px,0) scaleY(${y[i].toFixed(3)})`;
            }
            if (!muted || moving) raf = requestAnimationFrame(frame);
        }
        function wake() {
            if (reduceMotion.matches) {
                bars.forEach((b, i) => { b.style.transform = `scaleY(${muted ? MIN : [0.5, 0.8, 0.62, 0.9, 0.45][i]})`; });
                return;
            }
            if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
        }

        function set(m, silent) {
            m = !!m;
            if (m === muted) return;
            muted = m;
            if (muted) {
                mutedAt = performance.now();
                // a downward flick so the bars fall through the line before settling
                for (let i = 0; i < NB; i++) v[i] = -2.2;
            } else {
                for (let i = 0; i < NB; i++) v[i] = 5 + i % 2;
            }
            sync();
            wake();
            if (!silent && opts.onChange) opts.onChange(muted);
        }

        el.addEventListener('click', () => set(!muted));
        if (opts.hotkey !== null) {
            const hk = (opts.hotkey || 'm').toLowerCase();
            window.addEventListener('keydown', (e) => {
                if (e.key.toLowerCase() !== hk || e.metaKey || e.ctrlKey || e.altKey) return;
                const t = e.target;
                if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
                if (document.querySelector('.ss-gate')) return;
                set(!muted);
            });
        }
        document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
        reduceMotion.addEventListener?.('change', wake);
        sync();
        wake();
        requestAnimationFrame(() => el.classList.add('is-in'));
        return { el, set: (m) => set(m, true), get muted() { return muted; } };
    }

    return { pref, setPref, gate, toggle };
})();
