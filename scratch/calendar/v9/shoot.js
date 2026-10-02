// node scratch/calendar/v9/shoot.js [1920|390] -> stills of the contact calendar into scratch/calendar/v9/<w>-*.png:
// rest (no grain), trail mid-swipe (mouse, or touch drag on 390), beat puff, camera mode mid-dissolve and settled with
// the settings panel (fake webcam fed from %TEMP%/cal-fakecam.y4m), fine / coarse / mono, trail in camera mode, back
// mid-dissolve, plus grain canvas state, live camera tracks after exit and console errors.
const path = require('path');
const os = require('os');
const { launch, sleep } = require('../v4/cdp.js');

const ALL = [[1920, 1080], [390, 844]];
const pick = process.argv[2] ? process.argv[2].split(',').map(Number) : null;
const SIZES = pick ? ALL.filter(([w]) => pick.includes(w)) : ALL;
const CAM = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-video-capture=' + path.join(os.tmpdir(), 'cal-fakecam.y4m')];
const GL = process.env.HEADFUL ? ['--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

(async () => {
    for (const [w, h] of SIZES) {
        const mobile = w < 700;
        const { page, close } = await launch({ w, h, args: [...GL, ...CAM], timeout: 300000 });
        const out = (n) => path.join(__dirname, `${w}-${n}.png`);
        // keep every stream the page opens, to prove the tracks end
        await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { window.__streams = []; const md = navigator.mediaDevices; if (!md) return; const g = md.getUserMedia.bind(md); md.getUserMedia = async (c) => { const s = await g(c); window.__streams.push(s); return s; }; })();` });
        if (mobile) await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
        await page.goto('http://localhost:3010/contact.html');
        for (let i = 0; i < 80; i++) { await sleep(250); if (await page.eval(`!!(window.__calendarContact && __calendarContact.ready())`)) break; }
        await sleep(2200);
        const P = await page.eval(`__calendarContact.P`);
        const tMid = (P.fine + P.dissolve) / 2 + 0.37;
        await page.eval(`__calendarContact.freeze(${tMid})`);
        await sleep(1800);
        const state = () => page.eval(`({ grain: getComputedStyle(document.querySelector('.gc-grain') || document.body).visibility, active: CalendarGrain.active, trail: CalendarGrain.trail })`);
        await page.shot(out('rest'));
        console.log(w, 'rest', JSON.stringify(await state()));

        const c = await page.eval(`__calendarContact.centre(${tMid})`);
        console.log(w, 'dancer centre', JSON.stringify(c));
        const [cx, cy] = c || [w / 2, h / 2];
        // a swoosh through the dancer, left to right with a dip
        const N = 26, pts = [];
        for (let i = 0; i <= N; i++) { const k = i / N; pts.push([cx + (k - 0.55) * Math.min(w * 0.6, 900), cy - h * 0.18 + Math.sin(k * Math.PI) * h * 0.3]); }
        if (mobile) {
            const touch = (type, p) => page.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p[0], y: p[1], id: 1 }] : [] });
            await touch('touchStart', pts[0]);
            for (let i = 1; i <= N; i++) { await touch('touchMove', pts[i]); await sleep(16); if (i === 20) await page.shot(out('trail')); }
            await touch('touchEnd', null);
        } else {
            for (let i = 0; i <= N; i++) { await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pts[i][0], y: pts[i][1] }); await sleep(16); if (i === 20) await page.shot(out('trail')); }
        }
        await sleep(250);
        await page.shot(out('trail-after-250ms'));
        await sleep(1800);
        console.log(w, 'after trail 2s', JSON.stringify(await state()));

        await page.eval(`__calendarContact.puff(${tMid})`);
        await sleep(90);
        await page.shot(out('puff'));
        await sleep(1800);

        // camera mode, the dissolve held at 45 % for its still
        await page.eval(`CalendarGrain.pin(0.45); document.getElementById('gcCamGo').click()`);
        for (let i = 0; i < 40; i++) { await sleep(100); if (await page.eval(`document.body.classList.contains('is-cam')`)) break; }
        await sleep(900);
        await page.shot(out('cam-dissolve'));
        await page.eval(`CalendarGrain.pin(null)`);
        await sleep(1600);
        await page.shot(out('cam'));
        console.log(w, 'cam', JSON.stringify(await page.eval(`__calendarContact.cam()`)), 'tracks', await page.eval(`window.__streams.flatMap(s => s.getTracks()).filter(t => t.readyState === 'live').length`));
        for (let i = 0; i <= N; i++) { const p = pts[i]; if (mobile) { await page.send('Input.dispatchTouchEvent', { type: i ? 'touchMove' : 'touchStart', touchPoints: [{ x: p[0], y: p[1], id: 1 }] }); } else { await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p[0], y: p[1] }); } await sleep(16); if (i === 20) await page.shot(out('cam-trail')); }
        if (mobile) await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await sleep(1600);
        for (const [sel, name] of [['[data-cell="1"]', 'cam-mid'], ['[data-cell="2"]', 'cam-coarse'], ['[data-cell="0"]', 'cam-fine-again'], ['[data-mono="1"]', 'cam-mono']]) {
            await page.eval(`document.querySelector('${sel}').click()`);
            await sleep(1400);
            await page.shot(out(name));
            console.log(w, name, JSON.stringify(await page.eval(`__calendarContact.cam()`)));
        }
        await page.eval(`document.querySelector('[data-mono="0"]').click()`);
        await sleep(1200);
        await page.eval(`CalendarGrain.pin(0.55); document.getElementById('gcBack').click()`);
        await sleep(700);
        await page.shot(out('back-dissolve'));
        await page.eval(`CalendarGrain.pin(null)`);
        await sleep(1500);
        await page.shot(out('back'));
        console.log(w, 'after back', JSON.stringify(await page.eval(`({ cam: __calendarContact.cam().on, live: window.__streams.flatMap(s => s.getTracks()).filter(t => t.readyState === 'live').length, streams: window.__streams.length, body: document.body.className })`)), JSON.stringify(await state()));
        // second cycle
        await page.eval(`document.getElementById('gcCamGo').click()`);
        for (let i = 0; i < 40; i++) { await sleep(100); if (await page.eval(`document.body.classList.contains('is-cam')`)) break; }
        await sleep(800);
        await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
        await sleep(900);
        console.log(w, 'cycle 2 (esc)', JSON.stringify(await page.eval(`({ cam: __calendarContact.cam().on, live: window.__streams.flatMap(s => s.getTracks()).filter(t => t.readyState === 'live').length, streams: window.__streams.length })`)));
        console.log(w, 'errors', JSON.stringify(page.errors));
        await close();
    }
    process.exit(0);
})();
