const { spawn } = require('child_process');
const fs = require('fs');

async function check() {
    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    const proc = spawn(edgePath, [
        '--remote-debugging-port=9241',
        '--headless=new',
        '--user-data-dir=C:\\Users\\gaura\\AppData\\Local\\Temp\\edge_dbg_' + Date.now(),
        '--no-first-run',
        '--window-size=1440,900',
        'http://localhost:3010/'
    ], { stdio: 'ignore' });

    await new Promise(r => setTimeout(r, 4500));
    const res = await fetch('http://127.0.0.1:9241/json');
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

    // Hide upper & scroll to services
    await call('Runtime.evaluate', {
        expression: `(() => {
            const upper = document.querySelector('.js-upper-canvas');
            if (upper) upper.style.display = 'none';
            const loader = document.querySelector('.js-loader');
            if (loader) loader.style.display = 'none';
            const sec = document.querySelector('.ll-section--services');
            if (sec) sec.scrollIntoView();
        })()`
    });

    await new Promise(r => setTimeout(r, 1000));

    // Sample pixels from lamaCanvas
    const canvasEval = await call('Runtime.evaluate', {
        expression: `(() => {
            const c = document.querySelector('#lamaCanvas');
            if (!c) return { err: 'no canvas' };
            const gl = c.getContext('webgl2');
            if (!gl) return { err: 'no webgl2' };
            
            // Read 100x100 pixels from center
            const pixels = new Uint8Array(100 * 100 * 4);
            gl.readPixels(Math.floor(c.width/2), Math.floor(c.height/2), 100, 100, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            
            let nonZero = 0;
            let maxR = 0, maxG = 0, maxB = 0, maxA = 0;
            for (let i = 0; i < pixels.length; i += 4) {
                if (pixels[i] > 0 || pixels[i+1] > 0 || pixels[i+2] > 0 || pixels[i+3] > 0) {
                    nonZero++;
                }
                if (pixels[i] > maxR) maxR = pixels[i];
                if (pixels[i+1] > maxG) maxG = pixels[i+1];
                if (pixels[i+2] > maxB) maxB = pixels[i+2];
                if (pixels[i+3] > maxA) maxA = pixels[i+3];
            }

            // Also check layers between canvas and user
            const elementsAtPoint = document.elementsFromPoint(c.width/2, c.height/2).map(el => ({
                tag: el.tagName,
                id: el.id,
                className: el.className,
                bg: window.getComputedStyle(el).backgroundColor,
                opacity: window.getComputedStyle(el).opacity,
                zIndex: window.getComputedStyle(el).zIndex
            }));

            return {
                canvasWidth: c.width,
                canvasHeight: c.height,
                canvasOpacity: c.style.opacity,
                pixelsNonZero: nonZero,
                maxRGBA: [maxR, maxG, maxB, maxA],
                elementsAtCenter: elementsAtPoint
            };
        })()`,
        returnByValue: true
    });
    console.log('Canvas Eval:', JSON.stringify(canvasEval.result.value, null, 2));

    ws.close();
    proc.kill();
}
check().catch(console.error);
