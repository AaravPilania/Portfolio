// HEADFUL=1 node scratch/main-v12/lando.js -> landonorris.com wheeled to its footer; frames of the signature draw-on
// (lando-XX.png) for the side-by-side with ours
const path = require('path');
const { launch, sleep } = require('../calendar/v4/cdp.js');
const OUT = __dirname;
(async () => {
    const W = 1920, H = 1080;
    const { page, close } = await launch({ w: W, h: H, timeout: 300000, args: ['--ignore-gpu-blocklist'] });
    await page.goto('https://landonorris.com/');
    await sleep(9000);
    // cookie banners / loaders out of the way
    await page.eval(`(() => { document.querySelectorAll('button, a').forEach((b) => { if (/accept|agree|got it|enter/i.test(b.textContent || '')) try { b.click(); } catch (e) {} }); return 1; })()`);
    await sleep(1500);
    const wheel = async (dy, n, gap = 30) => {
        for (let i = 0; i < n; i++) {
            await page.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: W / 2, y: H / 2, deltaX: 0, deltaY: dy });
            await sleep(gap);
        }
    };
    const docH = async () => page.eval(`Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)`);
    const y = async () => page.eval(`window.scrollY || document.documentElement.scrollTop`);
    console.log('docH', await docH());
    let last = -1, same = 0;
    for (let k = 0; k < 400 && same < 6; k++) {
        await wheel(120, 6, 25);
        await sleep(120);
        const v = await y();
        if (Math.abs(v - last) < 2) same++; else same = 0;
        last = v;
    }
    console.log('bottom y', last);
    // back up a little and step down again to catch the draw-on in frames
    await wheel(-120, 14, 40);
    await sleep(1500);
    for (let i = 0; i < 10; i++) {
        await wheel(120, 2, 40);
        await sleep(700);
        await page.shot(path.join(OUT, 'lando-' + String(i).padStart(2, '0') + '.png'));
        console.log('shot', i, await y());
    }
    await sleep(2500);
    await page.shot(path.join(OUT, 'lando-final.png'));
    await close();
    process.exit(0);
})();
