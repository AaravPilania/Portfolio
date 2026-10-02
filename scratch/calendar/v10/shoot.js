// HEADFUL=1 node scratch/calendar/v10/shoot.js [1920,1366,390] [guide] -> stills into scratch/calendar/v10/:
// sound gate, page after "without sound" (nav closed / open, invite card, portrait), toggle muted / on, ink trail + beat
// ripple, booth live / count / booked with the fake webcam, live tracks after snap and cancel, rAF perf, console errors.
// "guide" also shoots final/guide/navbar-designs.html.
const path = require('path');
const os = require('os');
const { launch, sleep } = require('../v4/cdp.js');

const ALL = [[1920, 1080], [1366, 768], [390, 844]];
const pick = process.argv[2] && /\d/.test(process.argv[2]) ? process.argv[2].split(',').map(Number) : null;
const SIZES = pick ? ALL.filter(([w]) => pick.includes(w)) : ALL;
const GUIDE = process.argv.includes('guide');
const ONLY_GUIDE = process.argv.includes('guide-only');
const CAM = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-video-capture=' + path.join(os.tmpdir(), 'cal-fakecam.y4m'), '--mute-audio'];
const GL = process.env.HEADFUL ? ['--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const BASE = 'http://localhost:3010/';

async function tap(page, mobile, sel) {
    const r = await page.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()`);
    if (!r) { console.log('  missing', sel); return false; }
    const [x, y] = r;
    if (mobile) {
        await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
        await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
        await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
        await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
        await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    }
    return true;
}

async function until(page, expr, ms = 8000) {
    for (let t = 0; t < ms; t += 50) { if (await page.eval(expr)) return true; await sleep(50); }
    return false;
}

(async () => {
    if (!ONLY_GUIDE) for (const [w, h] of SIZES) {
        const mobile = w < 700;
        const { page, close } = await launch({ w, h, args: [...GL, ...CAM], timeout: 300000 });
        const out = (n) => path.join(__dirname, `${w}-${n}.png`);
        await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { window.__streams = []; const md = navigator.mediaDevices; if (!md) return; const g = md.getUserMedia.bind(md); md.getUserMedia = async (c) => { const s = await g(c); window.__streams.push(s); return s; }; })();` });
        if (mobile) await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
        await page.goto(BASE + 'contact.html');
        await until(page, `!!(window.__calendarContact && __calendarContact.ready())`, 20000);
        await until(page, `!!document.querySelector('.ss-gate.is-in')`, 4000);
        await sleep(900);
        await page.shot(out('gate'));
        console.log(w, 'gate', JSON.stringify(await page.eval(`({ gate: !!document.querySelector('.ss-gate'), started: __calendarContact.started(), focus: document.activeElement && document.activeElement.textContent.trim().slice(0, 30) })`)));

        await tap(page, mobile, '.ss-gate [data-sound="0"]');
        await sleep(1200);
        console.log(w, 'after gate', JSON.stringify(await page.eval(`({ gate: !!document.querySelector('.ss-gate'), started: __calendarContact.started(), audio: CalendarAudio.isRunning(), muted: CalendarAudio.isMuted(), toggle: document.querySelector('.ss-toggle')?.getAttribute('aria-pressed'), pref: localStorage.getItem('ap.sound') })`)));
        await sleep(1800);
        await page.shot(out('page-muted'));

        await tap(page, mobile, '.ss-toggle');
        await sleep(900);
        await page.shot(out('toggle-on'));
        console.log(w, 'toggle on', JSON.stringify(await page.eval(`({ pressed: document.querySelector('.ss-toggle').getAttribute('aria-pressed'), running: CalendarAudio.isRunning(), muted: CalendarAudio.isMuted() })`)));
        await tap(page, mobile, '.ss-toggle');
        await sleep(160);
        await page.shot(out('toggle-muting'));
        await sleep(900);

        await tap(page, mobile, '.ap-nav__burger');
        await sleep(1100);
        await page.shot(out('nav-open'));
        console.log(w, 'nav', await page.eval(`document.querySelector('.ap-nav__burger').getAttribute('aria-expanded')`));
        await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await sleep(900);

        // ink trail over the dancer, frozen mid-dance
        const P = await page.eval(`__calendarContact.P`);
        const tMid = (P.fine + P.dissolve) / 2 + 0.37;
        await page.eval(`__calendarContact.freeze(${tMid})`);
        await sleep(900);
        const c = await page.eval(`__calendarContact.centre(${tMid})`);
        const [cx, cy] = c || [w / 2, h / 2];
        const N = 26, pts = [];
        for (let i = 0; i <= N; i++) { const k = i / N; pts.push([cx + (k - 0.55) * Math.min(w * 0.6, 900), cy - h * 0.18 + Math.sin(k * Math.PI) * h * 0.3]); }
        if (mobile) {
            await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0][0], y: pts[0][1], id: 1 }] });
            for (let i = 1; i <= N; i++) { await page.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: pts[i][0], y: pts[i][1], id: 1 }] }); await sleep(16); if (i === 20) await page.shot(out('trail')); }
            await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        } else {
            for (let i = 0; i <= N; i++) { await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pts[i][0], y: pts[i][1] }); await sleep(16); if (i === 20) await page.shot(out('trail')); }
        }
        await sleep(1800);
        console.log(w, 'grain after 1.8s', JSON.stringify(await page.eval(`({ active: CalendarGrain.active, vis: getComputedStyle(document.querySelector('.gc-grain') || document.body).visibility })`)));
        await page.eval(`__calendarContact.puff(${tMid})`);
        await sleep(110);
        await page.shot(out('ripple'));
        await sleep(1500);
        await page.eval(`__calendarContact.freeze(null)`);

        // booth: the fake webcam books the visitor in on a downbeat
        await page.eval(`window.__seen = []; setInterval(() => { const s = __invite.state; if (__seen[__seen.length - 1] !== s) __seen.push(s); }, 30)`);
        await tap(page, mobile, '#gcBook');
        // 'live' lasts one frame: the first sample starts the count-in
        await until(page, `__invite.state === 'count'`, 8000);
        await sleep(120);
        await page.shot(out('booth-live'));
        console.log(w, 'live shot', Date.now() % 100000, await page.eval(`__invite.state + ' [' + document.getElementById('gcBoothCount').textContent + '] ' + document.getElementById('gcInvite').className`));
        if (await until(page, `document.getElementById('gcBoothCount').textContent === '2'`, 6000)) {
            await sleep(60);
            await page.shot(out('booth-count'));
        }
        await until(page, `__invite.state === 'booked'`, 8000);
        await sleep(700);
        await page.shot(out('booth-booked'));
        console.log(w, 'booked shot', Date.now() % 100000, await page.eval(`document.getElementById('gcInvite').className`));
        const tracks = () => page.eval(`({ state: __invite.state, liveTracks: __invite.liveTracks, anyLive: window.__streams.flatMap(s => s.getTracks()).filter(t => t.readyState === 'live').length, streams: window.__streams.length })`);
        console.log(w, 'booked', JSON.stringify(await tracks()), 'states', JSON.stringify(await page.eval('__seen')), 'rsvp', await page.eval(`document.getElementById('gcBook').textContent.trim()`));
        await tap(page, mobile, '#gcRetake');
        await until(page, `__invite.state === 'count'`, 8000);
        console.log(w, 'retake', JSON.stringify(await tracks()));
        await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await sleep(600);
        console.log(w, 'retake + esc', JSON.stringify(await tracks()));

        if (!mobile) {
            await tap(page, mobile, '#gcInviteFold');
            await sleep(800);
            await page.shot(out('card-folded'));
            await tap(page, mobile, '#gcInviteFold');
            await sleep(700);
        }

        await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
        await page.eval(`__calendarContact.perfReset()`);
        await sleep(6000);
        console.log(w, 'perf', JSON.stringify(await page.eval(`__calendarContact.perf()`)));
        console.log(w, 'errors', JSON.stringify(page.errors));
        await close();
    }

    if (GUIDE || ONLY_GUIDE) for (const [w, h] of [[1920, 1080], [390, 844]]) {
        const { page, close } = await launch({ w, h, args: [...GL] });
        await page.goto(BASE + 'guide/navbar-designs.html');
        await sleep(2200);
        const H = await page.eval(`document.documentElement.scrollHeight`);
        await page.send('Emulation.setDeviceMetricsOverride', { width: w, height: H, deviceScaleFactor: 1, mobile: w < 700 });
        await sleep(500);
        await page.shot(path.join(__dirname, `guide-${w}.png`));
        await page.goto(BASE + 'guide/navbar-designs.html?open&fold');
        await sleep(2400);
        await page.shot(path.join(__dirname, `guide-${w}-states.png`));
        console.log('guide', w, H, 'errors', JSON.stringify(page.errors));
        await close();
    }
    process.exit(0);
})();
