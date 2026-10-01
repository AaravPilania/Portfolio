// node scratch/eyes/exit-probe.js [w] [h] -> loads the site headless, logs slide 04's geometry (services section, stage
// track A..B, scroller height) and, for each position in POS (comma list of expressions over sTop / sBot / A / B / H,
// the section's top and bottom and the track's detent range in scroller px), scrolls there the way a wheel would
// (in WHEEL-px steps from the previous position, so the stage's zone sees a real scroll), logs the nav state and the
// section / video rects, and writes scratch/eyes/exit-<i>.png. NAME, if set, prefixes the shots.
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const W = +process.argv[2] || 1920, H = +process.argv[3] || 1080;
const PORT = 9443;
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const POS = (process.env.POS || 'sTop-H,B,B+H*0.5,sBot-H,sBot').split(',');
const NAME = process.env.NAME || 'exit';

(async () => {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'exit-probe-'));
    const chrome = spawn(CHROME, ['--remote-debugging-port=' + PORT, '--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1',
        '--window-size=' + W + ',' + H, '--user-data-dir=' + profile, 'about:blank']);
    setTimeout(() => { console.error('probe timed out'); try { chrome.kill(); } catch (e) { /* gone */ } process.exit(2); }, 240000).unref();
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
        if (r.exceptionDetails) console.log('EXC', JSON.stringify(r.exceptionDetails).slice(0, 400));
        return (r.result || {}).value;
    };
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: 'http://localhost:3010/' });
    for (let i = 0; i < 60; i++) {
        await sleep(500);
        if (await evaluate(`typeof window.__pixelBugLeash === 'function'`)) break;
    }
    await sleep(2000);
    const geo = JSON.parse(await evaluate(`(() => {
        const sc = document.querySelector('.js-scroller'), s = sc.getBoundingClientRect(), y = sc.scrollTop;
        const sec = document.querySelector('.ll-section--services').getBoundingClientRect(), tr = document.getElementById('skWheel').getBoundingClientRect();
        const A = Math.round(tr.top - s.top + y);
        return JSON.stringify({ sTop: Math.round(sec.top - s.top + y), sBot: Math.round(sec.bottom - s.top + y), A, B: A + Math.round(tr.height - sc.clientHeight), H: sc.clientHeight, max: sc.scrollHeight - sc.clientHeight });
    })()`));
    console.log('geo', JSON.stringify(geo));
    const state = (label) => evaluate(`JSON.stringify((() => {
        const sc = document.querySelector('.js-scroller'), sec = document.querySelector('.ll-section--services').getBoundingClientRect();
        const m = getComputedStyle(document.querySelector('.ll-header .js-menu'));
        const cv = [...document.querySelectorAll('canvas')].filter((c) => { const r = c.getBoundingClientRect(); return r.width > 300 && r.height > 300; })
            .map((c) => { const r = c.getBoundingClientRect(); return [c.className || c.id || 'canvas', Math.round(r.top), Math.round(r.height), getComputedStyle(c).position]; });
        return { at: ${JSON.stringify(label)}, y: Math.round(sc.scrollTop), hidden: document.body.classList.contains('sk-nav-hidden'), menu: [m.opacity, m.visibility],
            sec: [Math.round(sec.top), Math.round(sec.bottom)], cv };
    })())`);
    let from = await evaluate(`document.querySelector('.js-scroller').scrollTop`);
    const STEP = +(process.env.WHEEL || 120);
    for (let i = 0; i < POS.length; i++) {
        const target = Math.round(Function('sTop', 'sBot', 'A', 'B', 'H', 'return ' + POS[i])(geo.sTop, geo.sBot, geo.A, geo.B, geo.H));
        // JUMP=1 (or the first JUMPN positions, at least one) sets scrollTop outright
        if (process.env.JUMP || i < Math.max(1, +(process.env.JUMPN || 1))) {
            await evaluate(`document.querySelector('.js-scroller').scrollTop = ${target}`);
            from = target;
        }
        // Through the stage's detents a wheel can't just glide; step by detent with the keyboard instead
        while (Math.abs(target - from) > 1) {
            const cur = await evaluate(`document.querySelector('.js-scroller').scrollTop`);
            if (cur > geo.A - 2 && cur < geo.B - 2 && target > cur + 2) {
                for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40, nativeVirtualKeyCode: 40 });
                await sleep(3200);
                from = await evaluate(`document.querySelector('.js-scroller').scrollTop`);
                if (from <= cur + 2) { console.log('stuck at', cur); break; }
                continue;
            }
            if (cur > geo.A + 2 && cur < geo.B + 2 && target < cur - 2) {
                for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38, nativeVirtualKeyCode: 38 });
                await sleep(3200);
                from = await evaluate(`document.querySelector('.js-scroller').scrollTop`);
                if (from >= cur - 2) { console.log('stuck at', cur); break; }
                continue;
            }
            const d = Math.max(-STEP, Math.min(STEP, target - cur));
            await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: W / 2, y: H / 2, deltaX: 0, deltaY: d });
            await sleep(60);
            const now = await evaluate(`document.querySelector('.js-scroller').scrollTop`);
            if (Math.abs(now - cur) < 1) {
                await evaluate(`document.querySelector('.js-scroller').scrollTop = ${target}`);
                await sleep(100);
            }
            from = await evaluate(`document.querySelector('.js-scroller').scrollTop`);
            if (Math.abs(from - cur) < 1) break;
        }
        await sleep(+(process.env.WAIT || 1400));
        console.log(await state(POS[i] + ' -> ' + target));
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(__dirname, NAME + '-' + i + '.png'), Buffer.from(shot.data, 'base64'));
        from = await evaluate(`document.querySelector('.js-scroller').scrollTop`);
    }
    ws.close();
    try { chrome.kill(); } catch (e) { /* gone */ }
    await sleep(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* locked */ }
    process.exit(0);
})();
