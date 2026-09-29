const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function run() {
    const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
    const userData = path.resolve(__dirname, 'edge_canvas_check_' + Date.now());

    const proc = spawn(edgePath, [
        '--remote-debugging-port=9231',
        '--headless=new',
        '--user-data-dir=' + userData,
        '--no-first-run',
        '--window-size=1440,900',
        'http://localhost:3010/'
    ], { stdio: 'ignore' });

    let tabs = null;
    for (let i = 0; i < 25; i++) {
        await new Promise(r => setTimeout(r, 200));
        try {
            const res = await fetch('http://127.0.0.1:9231/json');
            tabs = await res.json();
            if (tabs && tabs.find(t => t.url.includes('3010'))) break;
        } catch (e) {}
    }

    if (!tabs) {
        proc.kill();
        return;
    }

    const tab = tabs.find(t => t.url.includes('3010'));
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    function call(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = Math.floor(Math.random() * 1000000);
            function onMsg(raw) {
                const data = JSON.parse(raw.data);
                if (data.id === id) {
                    ws.removeEventListener('message', onMsg);
                    if (data.error) reject(data.error);
                    else resolve(data.result);
                }
            }
            ws.addEventListener('message', onMsg);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    await call('Page.enable');
    await call('Runtime.enable');

    await new Promise(r => setTimeout(r, 1500));

    const evalRes = await call('Runtime.evaluate', {
        expression: `(function() {
            const results = [];
            const canvases = Array.from(document.querySelectorAll('canvas'));
            canvases.forEach((c, idx) => {
                let dataUrl = '';
                try {
                    dataUrl = c.toDataURL();
                } catch(e) {
                    dataUrl = 'error: ' + e.message;
                }
                results.push({
                    idx,
                    id: c.id,
                    className: c.className,
                    dataUrlPrefix: dataUrl.slice(0, 100),
                    dataUrlLen: dataUrl.length
                });
            });
            return results;
        })()`,
        returnByValue: true
    });

    console.log(JSON.stringify(evalRes.result.value, null, 2));

    ws.close();
    proc.kill();
}

run().catch(console.error);
