// node scratch/sixth-arm/probe.js w h -> the wheel's keep-out boxes as skills-wheel.js measures them (stage px): `words`
// (every counter + title) and `list` (every right column), for the LAYOUTS fixture in scratch/skills-wheel-steps.test.js
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const W = +process.argv[2] || 1920, H = +process.argv[3] || 1080;
const PORT = 9700 + Math.floor(Math.random() * 200);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sixth-probe-'));
    const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--remote-debugging-port=' + PORT, '--headless=new',
        '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=' + W + ',' + H, '--user-data-dir=' + profile, 'about:blank']);
    setTimeout(() => process.exit(2), 120000).unref();
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
    const evaluate = async (expr) => ((await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result || {}).value;
    await send('Page.enable');
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const ES = window.EventSource; window.EventSource = function (u, o) { return String(u).includes('live-reload') ? { close() {}, addEventListener() {} } : new ES(u, o); }; })();` });
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 700 });
    await send('Page.navigate', { url: 'http://localhost:3010/' });
    for (let i = 0; i < 80; i++) {
        await sleep(500);
        if (await evaluate(`typeof window.__pixelBugLeash === 'function'`)) break;
    }
    await sleep(2500);
    console.log(W + 'x' + H, await evaluate(`(async () => {
        const sc = document.querySelector('.js-scroller'), tr = document.getElementById('skWheel');
        const A = Math.round(tr.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop);
        sc.scrollTop = A - 40; await new Promise((r) => setTimeout(r, 400));
        sc.scrollTop = A + 2; await new Promise((r) => setTimeout(r, 2500));
        const sr = tr.querySelector('.sk__stage').getBoundingClientRect();
        const u = (els) => { let b = null; els.forEach((el) => { const r = el.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) return;
            const q = { l: r.left - sr.left, t: r.top - sr.top, r: r.right - sr.left, b: r.bottom - sr.top };
            b = b ? { l: Math.min(b.l, q.l), t: Math.min(b.t, q.t), r: Math.max(b.r, q.r), b: Math.max(b.b, q.b) } : q; }); return b; };
        const R = (b) => b && '{ l: ' + Math.round(b.l) + ', t: ' + Math.round(b.t) + ', r: ' + Math.round(b.r) + ', b: ' + Math.round(b.b) + ' }';
        const words = u([...tr.querySelectorAll('.sk-kicker, .sk-title > .sk-mk')]), lst = u([...tr.querySelectorAll('.sk-set .sk-mk')]);
        const star = tr.querySelector('.sk-star').getBoundingClientRect();
        return 'words: ' + R(words) + ', list: ' + R(lst) + ', starX: ' + Math.round((star.left + star.right) / 2 - sr.left);
    })()`));
    ws.close();
    try { chrome.kill(); } catch (e) { /* gone */ }
    await sleep(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* locked */ }
    process.exit(0);
})();
