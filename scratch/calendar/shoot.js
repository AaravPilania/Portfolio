// node scratch/calendar/shoot.js [w] [h] [port] -> loads contact.html headless, pins the cycle to each time in TIMES
// (comma list of seconds, or names from the page's phase table like "dance+1.2") and writes
// scratch/calendar/<NAME>-<w>-<i>.png. Then unpins and reports rAF frame timing over RAF seconds, the audio state, and
// console errors. AUTOPLAY=1 launches Chrome with autoplay allowed (sound starts without a gesture); CLICK=1 clicks
// once before measuring; RM=1 emulates reduced motion; LOOPCHECK=1 samples the clock across the 17 s seam.
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const W = +process.argv[2] || 1920, H = +process.argv[3] || 1080, SITE = +process.argv[4] || 3010;
const PORT = 9300 + Math.floor(Math.random() * 400);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TIMES = (process.env.TIMES || '1,2.0,2.5,2.9,3.35,4.4,6.5,8.5,10.6,12.8,14.3,14.7,15.2,16.5').split(',');
const NAME = process.env.NAME || 'cal';
const OUT = process.env.OUT || __dirname;

(async () => {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-shoot-'));
    // HEADFUL=1 runs a real (off-screen) window on the real GPU, for frame timing that headless' emulated GPU can't give
    const args = ['--remote-debugging-port=' + PORT, process.env.HEADFUL ? '--window-position=-3000,0' : '--headless=new', '--hide-scrollbars', '--force-device-scale-factor=' + (process.env.DPR || 1),
        '--window-size=' + W + ',' + H, '--user-data-dir=' + profile];
    if (process.env.AUTOPLAY) args.push('--autoplay-policy=no-user-gesture-required');
    if (process.env.FLAGS) args.push(...process.env.FLAGS.split(' '));
    const chrome = spawn(CHROME, [...args, 'about:blank']);
    setTimeout(() => { console.error('timed out'); try { chrome.kill(); } catch (e) { /* gone */ } process.exit(2); }, 240000).unref();
    let list = null;
    for (let i = 0; i < 120 && !list; i++) {
        await sleep(250);
        list = await new Promise((r) => http.get('http://127.0.0.1:' + PORT + '/json/list', (res) => {
            let s = ''; res.on('data', (d) => { s += d; }); res.on('end', () => { try { r(JSON.parse(s)); } catch (e) { r(null); } });
        }).on('error', () => r(null)));
    }
    const page = list.find((p) => p.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r) => { ws.onopen = r; });
    let id = 0;
    const errors = [];
    ws.addEventListener('message', (e) => {
        const m = JSON.parse(e.data);
        if (m.method === 'Runtime.exceptionThrown') errors.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 300));
        if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) errors.push(m.params.type + ' ' + m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300));
        if (m.method === 'Log.entryAdded' && (m.params.entry.level === 'error' || m.params.entry.level === 'warning')) errors.push('LOG ' + m.params.entry.level + ' ' + m.params.entry.text.slice(0, 200) + ' ' + (m.params.entry.url || ''));
    });
    const send = (method, params = {}) => new Promise((res) => {
        const my = ++id;
        const h = (e) => { const m = JSON.parse(e.data); if (m.id === my) { ws.removeEventListener('message', h); res(m.result || m); } };
        ws.addEventListener('message', h);
        ws.send(JSON.stringify({ id: my, method, params }));
    });
    const evaluate = async (expr) => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) console.log('EVAL-EXC', JSON.stringify(r.exceptionDetails).slice(0, 300));
        return (r.result || {}).value;
    };
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Log.enable');
    await send('Emulation.setFocusEmulationEnabled', { enabled: true });
    // The dev server's live-reload would reload the page mid-run whenever anything under final/ is touched
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const ES = window.EventSource; window.EventSource = function (u, o) { return String(u).includes('live-reload') ? { close() {}, addEventListener() {} } : new ES(u, o); }; })();` });
    const mobile = W < 700;
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: +(process.env.DPR || 1), mobile });
    if (process.env.RM) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await send('Page.navigate', { url: 'http://localhost:' + SITE + '/contact.html' });
    for (let i = 0; i < 60; i++) {
        await sleep(250);
        if (await evaluate(`!!(window.__calendarContact && window.__calendarContact.ready())`)) break;
    }
    await sleep(+(process.env.BOOT || 800));
    console.log('ready', await evaluate(`window.__calendarContact.ready()`), 'phases', JSON.stringify(await evaluate(`Object.fromEntries(Object.entries(__calendarContact.P).map(([k, v]) => [k, +v.toFixed(3)]))`)));

    if (!process.env.RM) {
        for (let i = 0; i < TIMES.length; i++) {
            const expr = TIMES[i].replace(/[a-zA-Z]\w*/g, (k) => `__calendarContact.P.${k}`);
            const t = await evaluate(expr);
            await evaluate(`__calendarContact.freeze(${t})`);
            await sleep(250);
            const key = await evaluate(`__calendarContact.scene(${t})`);
            const shot = await send('Page.captureScreenshot', { format: 'png' });
            const file = path.join(OUT, NAME + '-' + W + '-' + i + '.png');
            fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
            console.log('shot', TIMES[i], '=', t.toFixed(3), key, path.basename(file));
        }
        await evaluate(`__calendarContact.freeze(null)`);
    } else {
        await sleep(1500);
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(OUT, NAME + '-' + W + '-rm.png'), Buffer.from(shot.data, 'base64'));
        console.log('reduced-motion still written');
    }

    if (process.env.CLICK) {
        for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: W / 2, y: H / 2, button: 'left', clickCount: 1 });
        await sleep(600);
    }
    console.log('audio', JSON.stringify(await evaluate(`({ running: CalendarAudio.isRunning(), blocked: CalendarAudio.isBlocked(), loop: CalendarAudio.loopLength(), snackHidden: document.getElementById('gcSnack').hidden })`)));

    if (process.env.LOOPCHECK) {
        // Sample (clock, scene) every 100 ms for 19 s so the seam at 17 s is crossed once
        const samples = await evaluate(`new Promise((res) => { const out = []; const t0 = performance.now(); const iv = setInterval(() => {
            const t = __calendarContact.time(); out.push([+(performance.now() - t0).toFixed(0), +t.toFixed(3), __calendarContact.scene(t)]);
            if (performance.now() - t0 > 19000) { clearInterval(iv); res(out); } }, 100); })`);
        let wraps = 0, prev = null, seq = [];
        for (const [, t, k] of samples) {
            if (prev !== null && t < prev - 8) wraps++;
            const tag = k.replace(/\d+/g, '');
            if (seq[seq.length - 1] !== tag) seq.push(tag);
            prev = t;
        }
        console.log('loop wraps', wraps, 'scene order', seq.join(' > '));
        const audioDrift = await evaluate(`CalendarAudio.isRunning() ? (() => { const a = CalendarAudio.time(); return +(a % CalendarAudio.loopLength() - __calendarContact.time()).toFixed(4); })() : null`);
        console.log('visual-vs-audio clock delta', audioDrift);
    }

    const rafSecs = +(process.env.RAF || 6);
    if (process.env.PRE) console.log('pre', JSON.stringify(await evaluate(process.env.PRE)));
    if (rafSecs > 0) {
        const stats = await evaluate(`new Promise((res) => { const d = [], slow = [], longTasks = []; let last = 0; const end = performance.now() + ${rafSecs * 1000};
            try { new PerformanceObserver((l) => l.getEntries().forEach((e) => longTasks.push(+e.duration.toFixed(0)))).observe({ type: 'longtask' }); } catch (e) { /* unsupported */ }            const f = (ts) => { if (last) { d.push(ts - last); if (ts - last > 25) slow.push([+(ts - last).toFixed(0), +__calendarContact.time().toFixed(2), Math.round(last)]); } last = ts;
                if (ts < end) requestAnimationFrame(f); else {
                d.sort((a, b) => a - b); const mean = d.reduce((a, b) => a + b, 0) / d.length;
                res({ frames: d.length, mean: +mean.toFixed(2), p95: +d[Math.floor(d.length * 0.95)].toFixed(2), max: +d[d.length - 1].toFixed(2), over25: d.filter((x) => x > 25).length, slow, longTasks }); } };
            requestAnimationFrame(f); })`);
        console.log('raf', JSON.stringify(stats), 'from t =', (await evaluate(`__calendarContact.time()`)).toFixed(2));
    }
    if (process.env.EVAL) console.log('eval', JSON.stringify(await evaluate(process.env.EVAL)));
    console.log(errors.length ? 'errors:\n  ' + errors.join('\n  ') : 'errors: none');
    ws.close();
    try { chrome.kill(); } catch (e) { /* gone */ }
    await sleep(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* locked */ }
    process.exit(0);
})();
