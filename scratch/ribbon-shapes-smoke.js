// Smoke test for guide/ribbon-shapes.html in headless Chrome: no page errors, arrow keys step a focused card (tick,
// title and GLITCH move), auto-play advances on its own. Usage: node scratch/ribbon-shapes-smoke.js [port=3010]
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SITE = 'http://localhost:' + (process.argv[2] || 3010) + '/guide/ribbon-shapes.html';
const PORT = 9434;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'rs-smoke-'));
    const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--remote-debugging-port=' + PORT, '--headless=new',
        '--window-size=1400,900', '--user-data-dir=' + profile, 'about:blank']);
    let list = null;
    for (let i = 0; i < 40 && !list; i++) {
        await sleep(250);
        list = await new Promise((r) => http.get('http://127.0.0.1:' + PORT + '/json/list', (res) => {
            let s = '';
            res.on('data', (d) => { s += d; });
            res.on('end', () => { try { r(JSON.parse(s)); } catch (e) { r(null); } });
        }).on('error', () => r(null)));
    }
    const ws = new WebSocket(list.find((p) => p.type === 'page').webSocketDebuggerUrl);
    await new Promise((r) => { ws.onopen = r; });
    let id = 0;
    const errors = [];
    ws.addEventListener('message', (e) => {
        const m = JSON.parse(e.data);
        if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception ? m.params.exceptionDetails.exception.description : m.params.exceptionDetails.text);
        if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(m.params.entry.text + ' ' + (m.params.entry.url || ''));
    });
    const send = (method, params = {}) => new Promise((res) => {
        const my = ++id;
        const h = (e) => { const m = JSON.parse(e.data); if (m.id === my) { ws.removeEventListener('message', h); res(m.result || m); } };
        ws.addEventListener('message', h);
        ws.send(JSON.stringify({ id: my, method, params }));
    });
    const ev = async (x) => ((await send('Runtime.evaluate', { expression: x, returnByValue: true })).result || {}).value;
    await send('Runtime.enable');
    await send('Log.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: SITE });
    for (let i = 0; i < 80 && !(await ev('!!window.__ribbonReady')); i++) await sleep(150);
    await sleep(1500);
    const state = (n) => ev(`(() => { const c = document.querySelectorAll('.rs-card')[${n}]; const r = c.getBoundingClientRect();
        return { tick: [...c.querySelectorAll('.rs-ticks button')].findIndex(b => b.classList.contains('is-on')),
            title: c.querySelector('.rs-cat.is-on .rs-title').textContent, bug: c.querySelector('.rs-bug').style.transform,
            bugOpacity: c.querySelector('.rs-bug').style.opacity, top: Math.round(r.top) }; })()`);
    const ok = (cond, msg) => { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) process.exitCode = 1; };

    await ev(`document.getElementById('design-01').scrollIntoView({ block: 'center' })`);
    await sleep(1400);
    const a = await state(0);
    ok(a.tick === 0 && a.bugOpacity === '1', 'card 01 starts on step 01 with GLITCH shown (' + a.title + ')');
    await ev(`document.getElementById('design-01').focus()`);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
    await sleep(1300);
    const b = await state(0);
    ok(b.tick === 1 && b.bug !== a.bug && /Backend/i.test(b.title), 'ArrowRight steps to 02: title ' + b.title + ', GLITCH moved');
    const y0 = (await state(0)).top;
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
    await sleep(1300);
    const c = await state(0);
    ok(c.tick === 0 && c.top === y0, 'ArrowLeft steps back to 01 without scrolling the page');

    await ev(`document.getElementById('design-05').scrollIntoView({ block: 'center' }); document.querySelector('#design-05 [data-act="auto"]').click()`);
    await sleep(3200);
    const d = await state(4);
    ok(d.tick >= 2, 'auto-play on card 05 advanced to step ' + (d.tick + 1) + ' in 3.2s');
    ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
    ws.close();
    chrome.kill();
    await sleep(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* locked */ }
})();
