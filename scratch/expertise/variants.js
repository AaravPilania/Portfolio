// node scratch/expertise/variants.js -> scratch/expertise/reduced-1366.png (prefers-reduced-motion: the star sits filled
// and still in the slide) and mobile-390.png (390x844, stuck on detent 1)
const path = require('path');
const { open, sleep } = require('./cdp');

const STATE = `JSON.stringify((() => { const s = document.querySelector('#skWheel .sk-star'), w = s.querySelector('.sk-star__word');
    return { solid: s.querySelector('.sk-star__solid').style.opacity, words: w.style.opacity, rows: w.querySelectorAll('text').length, t: s.style.transform,
        first: (w.querySelector('g[clip-path] g') || {}).getAttribute && w.querySelector('g[clip-path] g').getAttribute('transform') }; })())`;

async function run(W, H, reduced, out) {
    const b = await open(W, H, 9470 + (reduced ? 1 : 0));
    if (reduced) await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await b.send('Page.navigate', { url: 'http://localhost:3010/' });
    for (let i = 0; i < 80; i++) {
        await sleep(500);
        if (await b.evaluate(`!!document.querySelector('#skWheel.is-live')`)) break;
    }
    await sleep(3000);
    await b.evaluate(`(async () => {
        const sc = document.querySelector('.js-scroller'), tr = document.getElementById('skWheel');
        const go = () => { const r = tr.getBoundingClientRect(), s = sc.getBoundingClientRect(); return Math.round(r.top - s.top + sc.scrollTop); };
        sc.scrollTop = go() - 40;
        await new Promise((r) => setTimeout(r, 400));
        sc.scrollTop = go() + 2;
        await new Promise((r) => setTimeout(r, 1500));
    })()`);
    await sleep(4000);
    const a = await b.evaluate(STATE);
    await sleep(1500);
    console.log(out, a, '\n  1.5s later', await b.evaluate(STATE));
    await b.shot(path.join(__dirname, out));
    await b.close();
}

(async () => {
    await run(1366, 768, true, 'reduced-1366.png');
    await run(390, 844, false, 'mobile-390.png');
    process.exit(0);
})();
