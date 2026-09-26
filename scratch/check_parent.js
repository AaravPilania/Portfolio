const { spawn } = require('child_process');

async function test() {
    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    const proc = spawn(edgePath, [
        '--remote-debugging-port=9262',
        '--headless=new',
        '--user-data-dir=C:\\Users\\gaura\\AppData\\Local\\Temp\\edge_dbg_' + Date.now(),
        '--no-first-run',
        '--window-size=1440,900',
        'http://localhost:3010/'
    ], { stdio: 'ignore' });

    await new Promise(r => setTimeout(r, 4500));
    const res = await fetch('http://127.0.0.1:9262/json');
    const tabs = await res.json();
    const tab = tabs.find(t => t.url.includes('3010'));
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    const call = (method, params = {}) => new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 1000000);
        ws.addEventListener('message', function onMsg(raw) {
            const data = JSON.parse(raw.data);
            if (data.id === id) {
                ws.removeEventListener('message', onMsg);
                if (data.error) reject(data.error);
                else resolve(data.result);
            }
        });
        ws.send(JSON.stringify({ id, method, params }));
    });

    const parentInfo = await call('Runtime.evaluate', {
        expression: '(() => { const c = document.querySelector("#lamaCanvas"); return { parentTag: c ? c.parentElement.tagName : null, parentId: c ? c.parentElement.id : null, parentClass: c ? c.parentElement.className : null }; })()',
        returnByValue: true
    });
    console.log('PARENT:', parentInfo.result.value);
    ws.close();
    proc.kill();
}
test().catch(console.error);
