// node scratch/calendar/v8/slide4.js -> scratch/calendar/v8/slide4-1920-<n>.png: the main site's services section (slide 4)
// scrolled into view so its backdrop dot grid renders, for the grain comparison.
const path = require('path');
const { launch, sleep } = require('../v4/cdp.js');

(async () => {
    const { page, close } = await launch({ w: 1920, h: 1080, timeout: 300000, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    await page.goto('http://localhost:3010/');
    for (let i = 0; i < 120; i++) {
        await sleep(500);
        if (await page.eval(`typeof window.__pixelBugLeash === 'function' && !!document.querySelector('.js-scroller')`)) break;
    }
    for (let i = 0; i < 80; i++) {
        await sleep(500);
        if (await page.eval(`(() => { const c = document.getElementById('apIntro'); return !c || c.classList.contains('is-done'); })()`)) break;
    }
    await page.eval(`(() => { const c = document.getElementById('apIntro'); if (c) c.style.display = 'none'; })()`);
    await sleep(2000);
    const sTop = await page.eval(`(() => { const sc = document.querySelector('.js-scroller'); return Math.round(document.querySelector('.ll-section--services').getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop); })()`);
    const offs = [-700, -300, 0];
    for (let k = 0; k < offs.length; k++) {
        await page.eval(`document.querySelector('.js-scroller').scrollTop = ${sTop + offs[k]}`);
        await sleep(4000);
        await page.shot(path.join(__dirname, `slide4-1920-${k}.png`));
    }
    console.log('sTop', sTop, 'errors', JSON.stringify(page.errors.slice(0, 5)));
    await close();
    process.exit(0);
})();
