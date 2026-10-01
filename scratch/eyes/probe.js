// node scratch/eyes/probe.js [w] [h] [steps] -> loads the site in headless Chrome, scrolls onto slide 04's first detent,
// presses ArrowDown `steps` times, dumps the services backdrop's uniforms, the canvases and the measured word / skills /
// star boxes, overlays green crosshairs on the eyes (NOMARK=1 to skip) and writes scratch/eyes/probe-<w>.png (or OUT).
// WAIT is the ms to settle before the shot.
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const W = +process.argv[2] || 1920, H = +process.argv[3] || 1080, STEP = +(process.argv[4] || 0);
const PORT = 9441;
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'eyes-probe-'));
    const chrome = spawn(CHROME, ['--remote-debugging-port=' + PORT, '--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1',
        '--window-size=' + W + ',' + H, '--user-data-dir=' + profile, 'about:blank']);
    setTimeout(() => { console.error('probe timed out'); try { chrome.kill(); } catch (e) { /* gone */ } process.exit(2); }, 150000).unref();
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
    await evaluate(`(async () => {
        const sc = document.querySelector('.js-scroller'), tr = document.getElementById('skWheel');
        const go = () => { const r = tr.getBoundingClientRect(), s = sc.getBoundingClientRect(); return Math.round(r.top - s.top + sc.scrollTop); };
        sc.scrollTop = go() - 40;
        await new Promise((r) => setTimeout(r, 400));
        sc.scrollTop = go() + 2;
        await new Promise((r) => setTimeout(r, 1500));
    })()`);
    for (let i = 0; i < STEP; i++) {
        await sleep(3200);
        for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40, nativeVirtualKeyCode: 40 });
    }
    await sleep(+(process.env.WAIT || 5000));
    if (process.env.HIDE) await evaluate(`document.querySelectorAll(${JSON.stringify(process.env.HIDE)}).forEach((el) => el.style.setProperty('visibility', 'hidden', 'important'))`);
    await evaluate(`(() => {
        const E = [[0.4549, 0.3552], [0.5667, 0.3615]];
        const w = innerWidth, h = innerHeight, c = w / h, i = 1440 / 1920;
        E.forEach(([u, v]) => {
            let x, y;
            if (c >= i) { x = u * w; y = (v - (1 - i / c) / 2) * c / i * h; } else { y = v * h; x = (u - (1 - c / i) / 2) * i / c * w; }
            const d = document.createElement('div');
            d.style.cssText = 'position:fixed;z-index:999999999;pointer-events:none;width:21px;height:21px;margin:-10px 0 0 -10px;left:' + x + 'px;top:' + y + 'px;' +
                'background:linear-gradient(#0f6 0 0) center/100% 2px no-repeat,linear-gradient(#0f6 0 0) center/2px 100% no-repeat';
            if (!${!!process.env.NOMARK}) document.body.appendChild(d);
            console.log('eye', x, y);
        });
    })()`);
    await sleep(300);
    const info = await evaluate(`(() => {
        const out = { keys: (window.__allBackdrops || []).map((b) => b.key) };
        const b = (window.__allBackdrops || []).find((x) => /services/.test(x.key || '')) || null;
        const U = (l) => { const o = {}; if (l && l.uniforms) for (const [k, v] of l.uniforms.entries()) { const x = v.value; o[k] = x && x.length !== undefined ? Array.from(x) : (x && typeof x === 'object' ? (x.constructor && x.constructor.name) : x); } return o; };
        if (b) { out.grid = U(b.gridLayer); out.section = U(b.sectionLayer); }
        const cv = [...document.querySelectorAll('canvas')].map((c) => { const r = c.getBoundingClientRect(); return { cls: c.className, w: c.width, h: c.height, r: [r.left, r.top, r.width, r.height], pos: getComputedStyle(c).position }; });
        out.canvases = cv;
        const sec = document.querySelector('.ll-section--services'); const sr = sec && sec.getBoundingClientRect();
        out.section = Object.assign(out.section || {}, { rect: sr && [sr.left, sr.top, sr.width, sr.height] });
        const st = document.querySelector('#skWheel .sk__stage').getBoundingClientRect();
        out.stage = [st.left, st.top, st.width, st.height];
        const U2 = (a, b) => !a ? b : !b ? a : { l: Math.min(a.l, b.l), t: Math.min(a.t, b.t), r: Math.max(a.r, b.r), b: Math.max(a.b, b.b) };
        const bx = (els) => [...els].reduce((a, el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? U2(a, { l: Math.round(r.left - st.left), t: Math.round(r.top - st.top), r: Math.round(r.right - st.left), b: Math.round(r.bottom - st.top) }) : a; }, null);
        const T = document.querySelectorAll('#skWheel .sk-cat');
        let words = null, list = null;
        T.forEach((c) => { words = U2(words, bx(c.querySelectorAll('.sk-kicker'))); });
        document.querySelectorAll('#skWheel .sk-title').forEach((t) => { words = U2(words, bx(t.querySelectorAll(':scope > .sk-mk'))); });
        document.querySelectorAll('#skWheel .sk-set').forEach((s) => { list = U2(list, bx(s.querySelectorAll('.sk-mk'))); });
        const sr2 = document.querySelector('#skWheel .sk-star').getBoundingClientRect();
        out.boxes = { words, list, star: [Math.round((sr2.left + sr2.right) / 2 - st.left), Math.round((sr2.top + sr2.bottom) / 2 - st.top), Math.round(sr2.width)] };
        out.scroller = [document.querySelector('.js-scroller').clientWidth, document.querySelector('.js-scroller').clientHeight];
        out.vid = (() => { const v = document.querySelector('.ll-section--services .js-backdrop-video-item'); if (!v) return null; const r = v.getBoundingClientRect(); return { r: [r.left, r.top, r.width, r.height], dw: v.dataset.width, dh: v.dataset.height }; })();
        return JSON.stringify(out);
    })()`);
    console.log(info);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(process.env.OUT ? path.resolve(process.env.OUT) : path.join(__dirname, 'probe-' + W + '.png'), Buffer.from(shot.data, 'base64'));
    // NAV=1 logs the fixed nav chrome's state here, then scrolls back above the stage (BACK_SHOT, if set, is shot there)
    const nav = () => evaluate(`JSON.stringify({ hidden: document.body.classList.contains('sk-nav-hidden'),
        els: ['.ll-header .js-menu', '.ll-header .js-sticky-items'].map((s) => { const e = document.querySelector(s), c = getComputedStyle(e), r = e.getBoundingClientRect();
            return [s, c.opacity, c.visibility, c.pointerEvents, c.translate, Math.round(r.top)]; }),
        dot: (() => { const d = document.querySelector('.site-cursor-dot'); const c = getComputedStyle(d); return [c.backgroundColor, c.zIndex, c.opacity]; })() })`);
    if (process.env.NAV) {
        console.log('nav on stage', await nav());
        await evaluate(`(() => { const s = document.querySelector('.js-scroller'); const st = document.querySelector('#skWheel'); s.scrollTop = Math.max(0, s.scrollTop + st.getBoundingClientRect().top - s.clientHeight * 1.5); })()`);
        await sleep(250);
        console.log('nav 250ms after leaving', await nav());
        await sleep(1500);
        console.log('nav after leaving', await nav());
        if (process.env.BACK_SHOT) fs.writeFileSync(path.resolve(process.env.BACK_SHOT), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
    }
    ws.close();
    try { chrome.kill(); } catch (e) { /* gone */ }
    await sleep(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* locked */ }
    process.exit(0);
})();
