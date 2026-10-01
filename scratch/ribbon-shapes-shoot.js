// Renders guide/ribbon-shapes.html in headless Chrome: each design solo at its completed state (1600x900) into
// scratch/ribbon-shapes/NN-id.png, the ?sheet=1 contact sheet into scratch/ribbon-shapes/contact-sheet.png, and prints
// every card's clearance report. Usage: node scratch/ribbon-shapes-shoot.js [port=3010] [only=N]
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SITE = 'http://localhost:' + (process.argv[2] || 3010) + '/guide/ribbon-shapes.html';
const ONLY = parseInt(process.argv[3], 10) || 0;
const OUT = path.join(__dirname, 'ribbon-shapes');
const PORT = 9433;
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'rs-shoot-'));
    const chrome = spawn(CHROME, ['--remote-debugging-port=' + PORT, '--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1',
        '--window-size=1600,900', '--user-data-dir=' + profile, 'about:blank']);
    const kill = () => { try { chrome.kill(); } catch (e) { /* gone */ } };
    let list = null;
    for (let i = 0; i < 40 && !list; i++) {
        await sleep(250);
        list = await new Promise((r) => http.get('http://127.0.0.1:' + PORT + '/json/list', (res) => {
            let s = '';
            res.on('data', (d) => { s += d; });
            res.on('end', () => { try { r(JSON.parse(s)); } catch (e) { r(null); } });
        }).on('error', () => r(null)));
    }
    const page = list && list.find((p) => p.type === 'page');
    if (!page) { console.error('no chrome page'); kill(); process.exit(1); }
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r) => { ws.onopen = r; });
    let id = 0;
    const send = (method, params = {}) => new Promise((res) => {
        const my = ++id;
        const h = (e) => {
            const m = JSON.parse(e.data);
            if (m.id === my) { ws.removeEventListener('message', h); res(m.result || m); }
        };
        ws.addEventListener('message', h);
        ws.send(JSON.stringify({ id: my, method, params }));
    });
    const evaluate = async (expr) => ((await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result || {}).value;
    const load = async (url, w, h) => {
        await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
        await send('Page.navigate', { url });
        for (let i = 0; i < 80; i++) {
            await sleep(150);
            if (await evaluate('!!window.__ribbonReady')) break;
        }
        await sleep(450);
        return evaluate('JSON.stringify(window.__ribbonReport || null)');
    };
    await send('Page.enable');

    const count = await (async () => {
        const rep = JSON.parse(await load(SITE + '?done=1', 1400, 900) || '[]');
        console.log('gallery @1400 (card width ' + (rep[0] && rep[0].W) + 'px):');
        rep.forEach((r) => console.log('  ' + String(r.n).padStart(2, '0') + ' ' + r.id.padEnd(16) + (r.ok ? 'ok  ' : 'FAIL') +
            ' clear ' + r.minClear + '/' + r.need + (r.inside ? '' : ' OFF-STAGE') + ' L ' + r.L + ' marks ' + r.marks.join(',')));
        return rep.length;
    })();

    for (let n = 1; n <= count; n++) {
        if (ONLY && n !== ONLY) continue;
        const rep = JSON.parse(await load(SITE + '?solo=' + n + '&done=1', 1600, 900) || '[]')[0];
        const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1600, height: 900, scale: 1 } });
        const file = path.join(OUT, String(n).padStart(2, '0') + '-' + rep.id + '.png');
        fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
        console.log('solo ' + String(n).padStart(2, '0') + ' ' + (rep.ok ? 'ok  ' : 'FAIL') + ' clear ' + rep.minClear + '/' + rep.need + (rep.inside ? '' : ' OFF-STAGE') + ' -> ' + path.relative(process.cwd(), file));
    }

    if (!ONLY) {
        await load(SITE + '?sheet=1&done=1', 2400, 1400);
        const h = Math.ceil(await evaluate('document.documentElement.scrollHeight'));
        await load(SITE + '?sheet=1&done=1', 2400, h);
        const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 2400, height: h, scale: 1 } });
        const file = path.join(OUT, 'contact-sheet.png');
        fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
        console.log('sheet 2400x' + h + ' -> ' + path.relative(process.cwd(), file));
    }
    ws.close();
    kill();
    await sleep(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* locked */ }
    process.exit(0);
})();
