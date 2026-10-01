// Minimal headless Chrome over CDP (same pattern as scratch/eyes/probe.js). open(w, h) -> { send, evaluate, shot, close }
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(W, H, port, extra) {
    const PORT = port || 9461;
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'expertise-'));
    const chrome = spawn(CHROME, ['--remote-debugging-port=' + PORT, '--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1',
        '--window-size=' + W + ',' + H, '--user-data-dir=' + profile].concat(extra || [], ['about:blank']));
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
    const send = (method, params = {}) => new Promise((res) => {
        const my = ++id;
        const h = (e) => { const m = JSON.parse(e.data); if (m.id === my) { ws.removeEventListener('message', h); res(m.result || m); } };
        ws.addEventListener('message', h);
        ws.send(JSON.stringify({ id: my, method, params }));
    });
    const evaluate = async (expr) => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) console.log('EXC', JSON.stringify(r.exceptionDetails).slice(0, 600));
        return (r.result || {}).value;
    };
    const shot = async (file, clip) => {
        const s = await send('Page.captureScreenshot', Object.assign({ format: 'png' }, clip ? { clip: Object.assign({ scale: 1 }, clip) } : {}));
        fs.writeFileSync(file, Buffer.from(s.data, 'base64'));
    };
    const close = async () => {
        ws.close();
        try { chrome.kill(); } catch (e) { /* gone */ }
        await sleep(300);
        try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* locked */ }
    };
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    return { send, evaluate, shot, close };
}

module.exports = { open, sleep };
