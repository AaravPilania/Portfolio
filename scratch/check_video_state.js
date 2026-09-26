const { spawn } = require('child_process');

async function main() {
    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    const proc = spawn(edgePath, [
        '--remote-debugging-port=9231',
        '--headless=new',
        '--user-data-dir=C:\\Users\\gaura\\AppData\\Local\\Temp\\edge_dbg_' + Date.now(),
        '--no-first-run',
        '--window-size=1440,900',
        'http://localhost:3010/'
    ], { stdio: 'ignore' });

    await new Promise(r => setTimeout(r, 4500));
    const res = await fetch('http://127.0.0.1:9231/json');
    const tabs = await res.json();
    const tab = tabs.find(t => t.url.includes('3010'));
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    const call = (expr) => new Promise(res => {
        ws.send(JSON.stringify({
            id: 1,
            method: 'Runtime.evaluate',
            params: { expression: expr, returnByValue: true }
        }));
        ws.onmessage = (raw) => {
            res(JSON.parse(raw.data).result.result.value);
        };
    });

    const vState = await call(`(() => {
        const v = document.querySelector('video#servicesBgVideo') || document.querySelector('.ll-section--services video');
        return {
            found: !!v,
            currentTime: v ? v.currentTime : null,
            duration: v ? v.duration : null,
            videoWidth: v ? v.videoWidth : null,
            videoHeight: v ? v.videoHeight : null,
            paused: v ? v.paused : null,
            ended: v ? v.ended : null,
            muted: v ? v.muted : null,
            src: v ? v.src : null,
            networkState: v ? v.networkState : null,
            readyState: v ? v.readyState : null
        };
    })()`);

    console.log('VIDEO STATE:', vState);

    // Let's also grab a frame of the video onto a 2D canvas and sample its average luminance
    const lum = await call(`(() => {
        const v = document.querySelector('video#servicesBgVideo') || document.querySelector('.ll-section--services video');
        if (!v || v.videoWidth === 0) return { error: 'video not ready' };
        const testC = document.createElement('canvas');
        testC.width = 64;
        testC.height = 64;
        const ctx = testC.getContext('2d');
        ctx.drawImage(v, 0, 0, 64, 64);
        const data = ctx.getImageData(0, 0, 64, 64).data;
        let sum = 0;
        let max = 0;
        for (let i = 0; i < data.length; i += 4) {
            const gray = (data[i] + data[i+1] + data[i+2]) / 3;
            sum += gray;
            if (gray > max) max = gray;
        }
        return {
            avgLum: sum / (64 * 64),
            maxLum: max
        };
    })()`);

    console.log('VIDEO LUMINANCE:', lum);

    ws.close();
    proc.kill();
}

main().catch(console.error);
