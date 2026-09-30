// Checks the guide prototype pages still mount GLITCH with the fly-in
const { spawn, execSync } = require('child_process');
const path = require('path');
const os = require('os');

const PORT = 9400 + Math.floor(Math.random() * 500);
const profile = path.join(os.tmpdir(), 'pb-harness-' + Date.now());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, '--window-size=1280,800', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
function kill() {
    try { execSync('taskkill /PID ' + chrome.pid + ' /T /F', { stdio: 'ignore' }); } catch (e) { /* gone */ }
    try {
        execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name=\'chrome.exe\'\\" | Where-Object { $_.CommandLine -like \'*' + path.basename(profile) + '*\' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"', { stdio: 'ignore', timeout: 30000 });
    } catch (e) { /* best effort */ }
}
const hard = setTimeout(() => { console.log('HARD TIMEOUT'); kill(); process.exit(2); }, 200000);

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
    });
    const send = (method, params = {}) => new Promise((r, j) => {
        const i = ++id;
        waiters.set(i, r);
        ws.send(JSON.stringify({ id: i, method, params }));
        setTimeout(() => { if (waiters.has(i)) { waiters.delete(i); j(new Error('timeout ' + method)); } }, 30000);
    });
    const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.result.value;
    await send('Runtime.enable');

    const pages = [
        ['bug-picker', 'http://localhost:3010/guide/bug-picker.html', 'window'],
        ['pixel-bug', 'http://localhost:3010/guide/pixel-bug.html', 'document.getElementById("siteFrame").contentWindow'],
    ];
    for (const [name, url, win] of pages) {
        await send('Page.navigate', { url });
        const t0 = Date.now();
        const seen = new Set();
        let s = null;
        while (Date.now() - t0 < 60000) {
            s = await ev('(() => { try { const w = ' + win + '; return w.__pixelBugState ? w.__pixelBugState() : null; } catch (e) { return null; } })()');
            if (s && s.live) seen.add(s.phase || s.state);
            if (s && s.live && s.say) break;
            await sleep(150);
        }
        console.log(name, s && s.live && s.say ? 'PASS' : 'FAIL', '| phases seen', [...seen].join(' > '), '| say', JSON.stringify(s && s.say));
    }
    console.log('ERRORS', errors.length ? errors : 'none');
    ws.close();
})().catch((e) => console.log('TEST ERROR', e.message)).finally(() => { clearTimeout(hard); kill(); process.exit(0); });
