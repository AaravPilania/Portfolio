// node scratch/sixth-arm/wheel.js [w] [h] [port] -> walks slide 04's wheel with real key presses through all seven
// detents (intro + six categories), down past the release into Experience, and back up through every detent to the
// release above. Screenshots Tools, mid-swap Tools->Experience, Experience (+ crops) into scratch/sixth-arm/. Logs the
// state at each detent, layout checks for the Experience column, the nav state and console errors.
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const W = +process.argv[2] || 1920, H = +process.argv[3] || 1080, SITE = +process.argv[4] || 3010;
const PORT = 9300 + Math.floor(Math.random() * 400);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = __dirname;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sixth-'));
    const chrome = spawn(CHROME, ['--remote-debugging-port=' + PORT, '--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1',
        '--window-size=' + W + ',' + H, '--user-data-dir=' + profile, 'about:blank']);
    setTimeout(() => { console.error('timed out'); try { chrome.kill(); } catch (e) { /* gone */ } process.exit(2); }, 360000).unref();
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
        if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('ERR ' + m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300));
        if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push('LOG ' + m.params.entry.text.slice(0, 200) + ' ' + (m.params.entry.url || ''));
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
    const shot = async (name, clip) => {
        const s = await send('Page.captureScreenshot', Object.assign({ format: 'png' }, clip ? { clip: Object.assign({ scale: 1 }, clip) } : {}));
        fs.writeFileSync(path.join(OUT, (process.env.TAG ? process.env.TAG + '-' : '') + name + '-' + W + '.png'), Buffer.from(s.data, 'base64'));
    };
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Log.enable');
    await send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const ES = window.EventSource; window.EventSource = function (u, o) { return String(u).includes('live-reload') ? { close() {}, addEventListener() {} } : new ES(u, o); }; })();` });
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 700 });
    await send('Page.navigate', { url: 'http://localhost:' + SITE + '/' });
    for (let i = 0; i < 80; i++) {
        await sleep(500);
        if (await evaluate(`typeof window.__pixelBugLeash === 'function' && !!document.querySelector('.js-scroller')`)) break;
    }
    await sleep(3000);
    const geo = JSON.parse(await evaluate(`(() => {
        const sc = document.querySelector('.js-scroller'), s = sc.getBoundingClientRect(), y = sc.scrollTop;
        const top = (el) => Math.round(el.getBoundingClientRect().top - s.top + y), bot = (el) => Math.round(el.getBoundingClientRect().bottom - s.top + y);
        const sec = document.querySelector('.ll-section--services'), tr = document.getElementById('skWheel'), ex = document.querySelector('.ll-section--experience');
        const A = top(tr);
        return JSON.stringify({ sTop: top(sec), sBot: bot(sec), A, B: A + Math.round(tr.offsetHeight - sc.clientHeight), eTop: top(ex), H: sc.clientHeight });
    })()`));
    console.log('geo', JSON.stringify(geo), 'steps', ((geo.B - geo.A) / (geo.H * 0.3)).toFixed(2));
    const STATE = `JSON.stringify((() => {
        const sc = document.querySelector('.js-scroller'), tr = document.getElementById('skWheel');
        const cats = [...tr.querySelectorAll('.sk-cat')];
        const up = cats.map((c) => { const ch = c.querySelector('.sk-title .sk-ch:last-child') || c.querySelector('.sk-ch'); return Math.round(+gsap.getProperty(ch, 'yPercent')); });
        const seal = tr.querySelector('.sk-seal i');
        const bug = document.querySelector('.pb-bug'), br = bug && bug.getBoundingClientRect();
        const m = document.querySelector('.ll-header .js-menu'), cs = m && getComputedStyle(m);
        return { y: Math.round(sc.scrollTop), detent: +((sc.scrollTop - ${geo.A}) / (${geo.H} * 0.3)).toFixed(2), shown: up.findIndex((v) => v === 0),
            star: document.querySelector('#skWheel .sk-star').style.transform.replace(/.*rotate\\(([^)]*)\\).*/, '$1'),
            seal: seal ? (+getComputedStyle(seal).opacity).toFixed(2) : null,
            navHidden: document.body.classList.contains('sk-nav-hidden'), menu: cs ? [cs.opacity, cs.visibility] : null,
            bug: br ? [Math.round(br.left + br.width / 2), Math.round(br.top + br.height / 2)] : null,
            say: (document.querySelector('.pb-say, .pb-bubble, [class*="pb-"][class*="say"]') || {}).textContent || '',
            bubble: (() => { const b = document.querySelector('.pb-bubble'); if (!b) return null; const r = b.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom), b.classList.contains('is-below') ? 'below' : 'above', +getComputedStyle(b).opacity]; })() };
    })())`;
    const LAYOUT = `JSON.stringify((() => {
        const tr = document.getElementById('skWheel'), cats = [...tr.querySelectorAll('.sk-cat')];
        const box = (els) => { let b = null; els.forEach((el) => { const r = el.getBoundingClientRect(); if (r.width <= 0) return; b = b ? { l: Math.min(b.l, r.left), t: Math.min(b.t, r.top), r: Math.max(b.r, r.right), b: Math.max(b.b, r.bottom) } : { l: r.left, t: r.top, r: r.right, b: r.bottom }; }); return b && Object.fromEntries(Object.entries(b).map(([k, v]) => [k, Math.round(v)])); };
        const xp = cats[cats.length - 1];
        const title = box(xp.querySelectorAll('.sk-title .sk-mk')), set = box(xp.querySelectorAll('.sk-set .sk-mk'));
        const sets = cats.map((c) => box(c.querySelectorAll('.sk-set .sk-mk')));
        const titles = cats.map((c) => box(c.querySelectorAll('.sk-title > .sk-mk')));
        const overlap = title && set && !(title.r <= set.l || set.r <= title.l || title.b <= set.t || set.b <= title.t);
        return { fit: tr.style.getPropertyValue('--sk-fit'), tw: tr.style.getPropertyValue('--sk-tw'), xpTitle: title, xpSet: set,
            overlap, inView: set && set.t >= 0 && set.b <= innerHeight && set.l >= 0 && set.r <= innerWidth,
            setL: sets.map((s) => s && s.l), setR: sets.map((s) => s && s.r), setH: sets.map((s) => s && s.b - s.t), titleR: titles.map((t) => t && t.r),
            rows: [...xp.querySelectorAll('.sk-set li')].map((li) => li.getAttribute('aria-label')), seal: !!tr.querySelector('.sk-seal') };
    })())`;
    const cur = () => evaluate(`document.querySelector('.js-scroller').scrollTop`);
    const key = async (k) => {
        const code = k === 'down' ? ['ArrowDown', 40] : ['ArrowUp', 38];
        for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: code[0], code: code[0], windowsVirtualKeyCode: code[1], nativeVirtualKeyCode: code[1] });
    };
    const log = async (label) => console.log(label.padEnd(14), await evaluate(STATE));

    // Into the stage from above
    await evaluate(`document.querySelector('.js-scroller').scrollTop = ${geo.A - 400}`);
    await sleep(900);
    await evaluate(`document.querySelector('.js-scroller').scrollTop = ${geo.A - 40}`);
    await sleep(400);
    await evaluate(`document.querySelector('.js-scroller').scrollTop = ${geo.A + 2}`);
    await sleep(3500);
    await log('down 0');
    for (let k = 1; k <= 6; k++) {
        await key('down');
        if (k === 6) {
            await sleep(+(process.env.MID || 330));
            await shot('mid-tools-experience');
            await log('mid 5->6');
            await sleep(3600);
        } else {
            await sleep(3200);
        }
        await log('down ' + k);
        if (k === 5) await shot('tools');
        if (k === 6) {
            await shot('experience');
            console.log('layout', await evaluate(LAYOUT));
            const b = JSON.parse(await evaluate(LAYOUT)).xpSet;
            const pad = 24, x = Math.max(0, Math.min(b.l, W) - pad), y = Math.max(0, b.t - pad);
            await shot('experience-column', { x, y, width: Math.min(W, b.r + pad) - x, height: Math.min(H, b.b + pad) - y });
        }
    }
    // Release into Experience
    await key('down');
    await sleep(1800);
    await log('released');
    const y0 = await cur();
    console.log('released past B:', y0 > geo.B + 2, 'y', y0, 'B', geo.B);
    for (let y = y0; y < geo.eTop + 60; y += Math.round(H * 0.4)) {
        await evaluate(`document.querySelector('.js-scroller').scrollTop = ${y}`);
        await sleep(120);
    }
    await evaluate(`document.querySelector('.js-scroller').scrollTop = ${geo.eTop}`);
    await sleep(2200);
    await log('at xp top');
    await shot('release-experience');
    // Back up: re-enter from below with wheel events, then step back to the intro and out
    await evaluate(`document.querySelector('.js-scroller').scrollTop = ${geo.B + Math.round(H * 0.5)}`);
    await sleep(1200);
    for (let i = 0; i < 40; i++) {
        const y = await cur();
        if (y <= geo.B + 1) break;
        await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: W / 2, y: H / 2, deltaX: 0, deltaY: -100 });
        await sleep(160);
    }
    await sleep(3000);
    await log('up 6');
    for (let k = 5; k >= 0; k--) {
        await key('up');
        await sleep(3200);
        await log('up ' + k);
    }
    await key('up');
    await sleep(1800);
    await log('released up');
    console.log('cursor', await evaluate(`(() => { const d = document.querySelector('.site-cursor-dot'); if (!d) return null; const c = getComputedStyle(d); return [c.backgroundColor, c.zIndex].join(' '); })()`));
    console.log(errors.length ? 'errors:\n  ' + errors.join('\n  ') : 'errors: none');
    ws.close();
    try { chrome.kill(); } catch (e) { /* gone */ }
    await sleep(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* locked */ }
    process.exit(0);
})();
