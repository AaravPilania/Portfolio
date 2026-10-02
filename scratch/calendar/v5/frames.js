// node scratch/calendar/v5/frames.js [w] [h] -> six consecutive real rAF frames of the fine dance (canvas copied inside
// rAF, after the page's own draw) cropped around the dancer, plus six frozen sub-step stills (?t pinned at 1/3-step
// intervals across two dance steps). Writes scratch/calendar/v5/raf-<i>.png, sub-<i>.png and strip-*.png.
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const W = +process.argv[2] || 1920, H = +process.argv[3] || 1080;
const PORT = 9300 + Math.floor(Math.random() * 400);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = __dirname;

(async () => {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-frames-'));
    const chrome = spawn(CHROME, ['--remote-debugging-port=' + PORT, '--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1',
        '--window-size=' + W + ',' + H, '--user-data-dir=' + profile, 'about:blank']);
    setTimeout(() => { console.error('timed out'); try { chrome.kill(); } catch (e) { /* gone */ } process.exit(2); }, 120000).unref();
    let list = null;
    for (let i = 0; i < 120 && !list; i++) {
        await sleep(250);
        list = await new Promise((r) => http.get('http://127.0.0.1:' + PORT + '/json/list', (res) => {
            let s = ''; res.on('data', (d) => { s += d; }); res.on('end', () => { try { r(JSON.parse(s)); } catch (e) { r(null); } });
        }).on('error', () => r(null)));
    }
    const ws = new WebSocket(list.find((p) => p.type === 'page').webSocketDebuggerUrl);
    await new Promise((r) => { ws.onopen = r; });
    let id = 0;
    const send = (method, params = {}) => new Promise((res) => {
        const my = ++id;
        const h = (e) => { const m = JSON.parse(e.data); if (m.id === my) { ws.removeEventListener('message', h); res(m.result || m); } };
        ws.addEventListener('message', h);
        ws.send(JSON.stringify({ id: my, method, params }));
    });
    const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const ES = window.EventSource; window.EventSource = function (u, o) { return String(u).includes('live-reload') ? { close() {}, addEventListener() {} } : new ES(u, o); }; })();` });
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 700 });
    await send('Page.navigate', { url: 'http://localhost:3010/contact.html' });
    for (let i = 0; i < 60; i++) { await sleep(250); if (await evaluate(`!!(window.__calendarContact && __calendarContact.ready())`)) break; }
    await sleep(600);

    // crop: the dancer's reel columns at the finest level
    const crop = { x: Math.round(W * 0.36), y: 0, w: Math.round(W * 0.36), h: H };
    const raf = await evaluate(`new Promise((res) => {
        const cv = document.getElementById('gcCanvas'), c = ${JSON.stringify(crop)}, copies = [], times = [], keys = [];
        const go = () => {
            const t = __calendarContact.time();
            if (t < 10 || t > 15) { requestAnimationFrame(go); return; }
            let k = 0;
            const grab = (ts) => {
                const o = document.createElement('canvas'); o.width = c.w; o.height = c.h;
                o.getContext('2d').drawImage(cv, c.x, c.y, c.w, c.h, 0, 0, c.w, c.h);
                copies.push(o); times.push(+ts.toFixed(2)); keys.push(__calendarContact.scene(__calendarContact.time()));
                if (++k < 6) requestAnimationFrame(grab);
                else res({ urls: copies.map((o) => o.toDataURL('image/png')), times, keys });
            };
            requestAnimationFrame(grab);
        };
        requestAnimationFrame(go);
    })`);
    raf.urls.forEach((u, i) => fs.writeFileSync(path.join(OUT, `raf-${i}.png`), Buffer.from(u.split(',')[1], 'base64')));
    console.log('raf frames', JSON.stringify(raf.times), JSON.stringify(raf.keys));

    const P = await evaluate(`__calendarContact.P.dance`);
    const t0 = P + 240 / 30 + 0.0005;
    for (let i = 0; i < 6; i++) {
        const t = t0 + i / 90;
        await evaluate(`__calendarContact.freeze(${t})`);
        await sleep(120);
        const u = await evaluate(`(() => { const cv = document.getElementById('gcCanvas'), c = ${JSON.stringify(crop)}; const o = document.createElement('canvas'); o.width = c.w; o.height = c.h; o.getContext('2d').drawImage(cv, c.x, c.y, c.w, c.h, 0, 0, c.w, c.h); return o.toDataURL('image/png'); })()`);
        fs.writeFileSync(path.join(OUT, `sub-${i}.png`), Buffer.from(u.split(',')[1], 'base64'));
        console.log('sub', i, t.toFixed(4), await evaluate(`__calendarContact.scene(${t})`));
    }
    ws.close();
    try { chrome.kill(); } catch (e) { /* gone */ }
    await sleep(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* locked */ }
    process.exit(0);
})();
