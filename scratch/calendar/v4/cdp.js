// Minimal headless Chrome over CDP: const { page, close } = await launch({ w, h, args }); await page.eval(expr)
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch({ w = 1920, h = 1080, args = [], timeout = 240000 } = {}) {
    const port = 9300 + Math.floor(Math.random() * 400);
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cal4-'));
    // HEADFUL=1: a real off-screen window on the GPU, paced by the display's vsync
    const chrome = spawn(CHROME, ['--remote-debugging-port=' + port, process.env.HEADFUL ? '--window-position=-3000,0' : '--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1',
        '--window-size=' + w + ',' + h, '--user-data-dir=' + profile, '--autoplay-policy=no-user-gesture-required', ...args, 'about:blank']);
    const killer = setTimeout(() => { console.error('timed out'); try { chrome.kill(); } catch (e) { /* gone */ } process.exit(2); }, timeout);
    killer.unref();
    let list = null;
    for (let i = 0; i < 120 && !list; i++) {
        await sleep(250);
        list = await new Promise((r) => http.get('http://127.0.0.1:' + port + '/json/list', (res) => {
            let s = ''; res.on('data', (d) => { s += d; }); res.on('end', () => { try { r(JSON.parse(s)); } catch (e) { r(null); } });
        }).on('error', () => r(null)));
    }
    const target = list.find((p) => p.type === 'page');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r) => { ws.onopen = r; });
    let id = 0;
    const errors = [];
    ws.addEventListener('message', (e) => {
        const m = JSON.parse(e.data);
        if (m.method === 'Runtime.exceptionThrown') errors.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 300));
        if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('console ' + m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300));
        if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push('LOG ' + m.params.entry.text.slice(0, 200) + ' ' + (m.params.entry.url || ''));
    });
    const send = (method, params = {}) => new Promise((res) => {
        const my = ++id;
        const hnd = (e) => { const m = JSON.parse(e.data); if (m.id === my) { ws.removeEventListener('message', hnd); res(m.result || m); } };
        ws.addEventListener('message', hnd);
        ws.send(JSON.stringify({ id: my, method, params }));
    });
    const evaluate = async (expr) => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) console.log('EVAL-EXC', JSON.stringify(r.exceptionDetails).slice(0, 400));
        return (r.result || {}).value;
    };
    await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
    await send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const ES = window.EventSource; window.EventSource = function (u, o) { return String(u).includes('live-reload') ? { close() {}, addEventListener() {} } : new ES(u, o); }; })();` });
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 700 });
    const page = {
        send, eval: evaluate, errors,
        goto: async (url) => { await send('Page.navigate', { url }); },
        shot: async (file) => { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(file, Buffer.from(s.data, 'base64')); },
    };
    const close = async () => { ws.close(); try { chrome.kill(); } catch (e) { /* gone */ } await sleep(300); try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* locked */ } };
    return { page, close, sleep };
}
module.exports = { launch, sleep };
