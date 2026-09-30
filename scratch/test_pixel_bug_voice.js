// Fly-in + consistent-speech smoke test for final/js/pixel-bug.js on :3010
const { spawn, execSync } = require('child_process');
const path = require('path');
const os = require('os');

const PORT = 9400 + Math.floor(Math.random() * 500);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = path.join(os.tmpdir(), 'pb-voice-' + Date.now());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn(CHROME, ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, '--window-size=1280,800', '--no-first-run', 'about:blank'],
    { stdio: 'ignore' });
function kill() {
    try { execSync('taskkill /PID ' + chrome.pid + ' /T /F', { stdio: 'ignore' }); } catch (e) { /* gone */ }
    const tag = path.basename(profile);
    try {
        execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name=\'chrome.exe\'\\" | Where-Object { $_.CommandLine -like \'*' + tag + '*\' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"', { stdio: 'ignore', timeout: 30000 });
    } catch (e) { /* best effort */ }
}
const hard = setTimeout(() => { console.log('HARD TIMEOUT'); kill(); process.exit(2); }, 240000);

(async () => {
    await sleep(6000);
    let tabs = null;
    for (let k = 0; k < 20 && !tabs; k++) {
        try { tabs = await (await fetch('http://127.0.0.1:' + PORT + '/json', { signal: AbortSignal.timeout(3000) })).json(); } catch (e) { await sleep(1000); }
    }
    if (!tabs) throw new Error('devtools endpoint never came up');
    const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener('open', r));
    let id = 0;
    const waiters = new Map(), errors = [];
    ws.addEventListener('message', (m) => {
        const d = JSON.parse(m.data);
        if (d.id && waiters.has(d.id)) { waiters.get(d.id)(d); waiters.delete(d.id); }
        if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
        if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push(d.params.args.map((a) => a.value || a.description).join(' '));
    });
    const send = (method, params = {}) => new Promise((r, j) => {
        const i = ++id;
        waiters.set(i, r);
        ws.send(JSON.stringify({ id: i, method, params }));
        setTimeout(() => { if (waiters.has(i)) { waiters.delete(i); j(new Error('timeout ' + method)); } }, 30000);
    });
    const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.result.value;
    const st = () => ev('window.__pixelBugState ? __pixelBugState() : null');
    const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });

    await send('Runtime.enable');
    await send('Page.enable');
    // In-page recorder: CDP round-trips are too slow in headless to catch a 1.25s flight or a transient line
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `
        window.__pbLog = [];
        (function tick() {
            const s = window.__pixelBugState && window.__pixelBugState();
            if (s && s.live) {
                const l = window.__pbLog, p = l[l.length - 1];
                const row = { t: Math.round(performance.now()), state: s.state, phase: s.phase, x: Math.round(s.x), y: Math.round(s.y), say: s.say, kind: s.sayKind };
                if (!p || p.state !== row.state || p.phase !== row.phase || p.say !== row.say || l.length < 3) l.push(row);
            }
            requestAnimationFrame(tick);
        })();` });
    await send('Page.navigate', { url: 'http://localhost:3010/index.html' });

    // Wait for the intro to hand over; nudge the AP loader to its end if headless is too slow
    const t0 = Date.now();
    let s = null, nudged = false;
    while (Date.now() - t0 < 30000) {
        s = await st();
        if (s && s.live) break;
        if (!nudged && Date.now() - t0 > 5000) {
            nudged = true;
            await ev('window.__apIntroRenderAt && window.__apIntroRenderAt(60)');
            console.log('nudged intro to t=60');
        }
        await sleep(40);
    }
    if (!s || !s.live) throw new Error('bug never went live');
    console.log('live after', Date.now() - t0, 'ms');

    // Fly-in, read from the in-page log
    await sleep(2000);
    let log = await ev('window.__pbLog');
    for (let k = 0; k < 30 && !(log.length && log.some((q) => q.phase === 'land')); k++) {
        await sleep(500);
        log = await ev('window.__pbLog');
    }
    console.log('log rows', log.length);
    const t0Log = log[0].t;
    log.slice(0, 8).forEach((q) => console.log('  +' + (q.t - t0Log) + 'ms', q.state, q.phase, q.x + ',' + q.y, q.kind || '', q.say ? JSON.stringify(q.say.slice(0, 30)) : ''));
    const firstRow = log[0];
    const landRow = log.find((q) => q.phase === 'land');
    const welcomeRow = log.find((q) => q.say && /hi\. i'm glitch/.test(q.say));
    const offscreen = firstRow.x < 0 || firstRow.x > 1280 || firstRow.y < 0;
    console.log('FLY-IN', firstRow.phase === 'entry' && offscreen && landRow && welcomeRow && welcomeRow.t - landRow.t < 50 ? 'PASS' : 'FAIL',
        '| starts', firstRow.x + ',' + firstRow.y, '| lands +' + (landRow && landRow.t - t0Log) + 'ms at', landRow && landRow.x + ',' + landRow.y,
        '| welcome +' + (welcomeRow && welcomeRow.t - t0Log) + 'ms');

    // Three drag + drops: a held line on pickup, a flip line on every drop
    const flipLines = [];
    for (let k = 0; k < 3; k++) {
        await sleep(1500);
        const r = await ev('(() => { const b = document.querySelector(".pb-bug").getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()');
        const mark = await ev('window.__pbLog.length');
        await mouse('mouseMoved', r.x, r.y, { buttons: 0 });
        await mouse('mousePressed', r.x, r.y);
        for (let i = 1; i <= 3; i++) await mouse('mouseMoved', r.x + i * 32, r.y - i * 16);
        await sleep(700);
        await mouse('mouseReleased', r.x + 96, r.y - 48);
        await sleep(700);
        const rows = await ev('window.__pbLog.slice(' + mark + ')');
        const held = rows.find((q) => q.state === 'held' && q.kind === 'held');
        const flip = rows.find((q) => q.state === 'flip' && q.kind === 'flip');
        flipLines.push({ held: held && held.say, flip: flip && flip.say });
    }
    flipLines.forEach((f, i) => console.log('drop', i + 1, JSON.stringify(f)));
    console.log('FLIPS', flipLines.every((f) => f.held && f.flip) ? 'PASS' : 'FAIL');

    // Spaced clicks: each first click speaks a fresh line
    await sleep(1600);
    const clicks = [];
    const spots = [[1180, 140], [1150, 700], [120, 160]];
    for (const [cx, cy] of spots) {
        const before = await st();
        await mouse('mousePressed', cx, cy);
        await mouse('mouseReleased', cx, cy);
        const q = await st();
        clicks.push({ kind: q.sayKind, say: q.say, changed: q.say !== before.say });
        await sleep(1100);
    }
    clicks.forEach((c, i) => console.log('click', i + 1, JSON.stringify(c)));
    console.log('CLICKS', clicks.every((c) => (c.kind === 'click' || c.kind === 'wake') && c.changed) ? 'PASS' : 'FAIL');

    // Rapid burst: first hit speaks, later hits rotate at most every ~0.9s, burst tail still gets a line
    const bmark = await ev('window.__pbLog.length');
    await ev(`(() => { for (let i = 0; i < 10; i++) {
        const o = { clientX: 1100, clientY: 180 + i * 4, bubbles: true, button: 0, pointerId: 1 };
        document.elementFromPoint(o.clientX, o.clientY).dispatchEvent(new PointerEvent('pointerdown', o));
    } })()`);
    await sleep(1400);
    const brows = await ev('window.__pbLog.slice(' + bmark + ')');
    const lines = brows.filter((q, i) => q.say && (i === 0 || q.say !== brows[i - 1].say)).map((q) => q.kind + ':' + q.say);
    console.log('burst of 10 synchronous clicks ->', JSON.stringify(lines));
    console.log('BURST', lines.length >= 1 && lines.length <= 3 && lines.every((l) => l.startsWith('click:')) ? 'PASS' : 'FAIL');

    const url = await ev('location.href');
    console.log('url still', url);
    console.log('ERRORS', errors.length ? errors : 'none');
    ws.close();
})().catch((e) => console.log('TEST ERROR', e.message)).finally(() => { clearTimeout(hard); kill(); process.exit(0); });
