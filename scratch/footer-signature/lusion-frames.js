// HEADFUL=1 node scratch/footer-signature/lusion-frames.js -> lusion.co, wheel to "Let's work together", then a dense
// settled frame sequence (lusion-NN.png every 250 ms) and a pair with the pointer at opposite corners (camera look)
const path = require('path');
const { launch, sleep } = require('../calendar/v4/cdp.js');
const OUT = path.join(__dirname, 'lusion');
require('fs').mkdirSync(OUT, { recursive: true });
const W = 1920, H = 1080;

(async () => {
    const { page, close } = await launch({ w: W, h: H, timeout: 420000, args: ['--ignore-gpu-blocklist'] });
    await page.goto('https://lusion.co/');
    await sleep(16000);
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: W / 2, y: H / 2 });
    const find = () => page.eval(`(() => {
        const e = document.getElementById('home-goal');
        if (!e) return null; const r = e.getBoundingClientRect();
        return { top: Math.round(r.top), bottom: Math.round(r.bottom) };
    })()`);
    let hits = 0;
    for (let i = 0; i < 700; i++) {
        const r = await find();
        if (i % 20 === 0) console.log('w', i, JSON.stringify(r));
        if (r && r.bottom < H * (+process.env.END || 1.25)) { if (++hits > 3) break; } else hits = 0;
        const near = r && r.bottom < H * 3;
        if (near && i % 4 === 0) await page.shot(path.join(OUT, `approach-${String(i).padStart(3, '0')}.png`));
        await page.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: W / 2, y: H / 2, deltaX: 0, deltaY: near ? 80 : 240 });
        await sleep(near ? 220 : 110);
    }
    await sleep(3000);
    console.log('at', JSON.stringify(await find()));
    for (let i = 0; i < 24; i++) {
        const t0 = Date.now();
        await page.shot(path.join(OUT, `seq-${String(i).padStart(2, '0')}.png`));
        console.log('f', i, Date.now());
        await sleep(Math.max(0, 250 - (Date.now() - t0)));
    }
    for (const [n, x, y] of [['tl', 40, 40], ['br', W - 40, H - 40]]) {
        for (let k = 0; k < 12; k++) { await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: W / 2 + (x - W / 2) * k / 11, y: H / 2 + (y - H / 2) * k / 11 }); await sleep(40); }
        await sleep(1800);
        await page.shot(path.join(OUT, `look-${n}.png`));
    }
    await close();
    process.exit(0);
})();
