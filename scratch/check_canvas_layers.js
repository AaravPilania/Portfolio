const { spawn } = require('child_process');

async function check() {
    const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
    const proc = spawn(edgePath, [
        '--remote-debugging-port=9231',
        '--headless=new',
        '--user-data-dir=C:\\Users\\gaura\\AppData\\Local\\Temp\\edge_dbg_' + Date.now(),
        'http://localhost:3010/'
    ], { stdio: 'ignore' });

    await new Promise(r => setTimeout(r, 1500));
    const res = await fetch('http://127.0.0.1:9231/json');
    const tabs = await res.json();
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

    await new Promise(r => setTimeout(r, 1000));

    const res2 = await call('Runtime.evaluate', {
        expression: `(() => {
            // Find which canvas has non-empty pixel data
            const canvases = Array.from(document.querySelectorAll('canvas'));
            return canvases.map(c => {
                const ctx = c.getContext('2d') || c.getContext('webgl2') || c.getContext('webgl');
                const st = window.getComputedStyle(c);
                return {
                    id: c.id,
                    className: c.className,
                    parentElement: c.parentElement?.tagName + '.' + c.parentElement?.className,
                    position: st.position,
                    zIndex: st.zIndex,
                    opacity: st.opacity,
                    display: st.display
                };
            });
        })()`,
        returnByValue: true
    });

    console.log('Canvases info:', JSON.stringify(res2.result.value, null, 2));

    // Scroll to .ll-section--services and inspect elementFromPoint at center of screen
    await call('Runtime.evaluate', {
        expression: `(() => {
            document.querySelector('.ll-section--services')?.scrollIntoView({ behavior: 'instant', block: 'start' });
        })()`
    });
    await new Promise(r => setTimeout(r, 500));

    const centerEl = await call('Runtime.evaluate', {
        expression: `(() => {
            const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
            return {
                tag: el?.tagName,
                id: el?.id,
                className: el?.className,
                zIndex: el ? window.getComputedStyle(el).zIndex : null
            };
        })()`,
        returnByValue: true
    });
    console.log('Element at center of screen:', centerEl.result.value);

    ws.close();
    proc.kill();
}

check().catch(console.error);
