// node scratch/expertise/shots.js [w] [h] [url] -> scratch/expertise/<w>-a-midflight.png, -b-step1.png, -c-step3.png
// (+ -crop variants round the asterisk, and -flap.png caught mid-flap on the way to step 3). Logs the R's ink centre
// against the asterisk's centre and the crossfade state for each shot.
const path = require('path');
const { open, sleep } = require('./cdp');

const W = +process.argv[2] || 1920, H = +process.argv[3] || 1080;
const URL = process.argv[4] || 'http://localhost:3010/';
const OUT = (n) => path.join(__dirname, W + '-' + n + '.png');

const STATE = `(() => {
    const star = document.querySelector('#skWheel .sk-star'), sr = star.getBoundingClientRect();
    const svg = star.querySelector('.sk-star__word'), solid = star.querySelector('.sk-star__solid');
    return JSON.stringify({
        star: [Math.round(sr.left), Math.round(sr.top), Math.round(sr.width), star.offsetWidth], transform: star.style.transform,
        solid: solid && solid.style.opacity, words: svg.style.opacity, rows: svg.querySelectorAll('text').length,
        tspans: svg.querySelectorAll('tspan').length, fontSize: svg.getAttribute('font-size'), font: svg.getAttribute('font-family'),
        loaded: document.fonts.check('700 100px Brier'),
    });
})()`;

(async () => {
    const b = await open(W, H, 9463 + (W % 7));
    await b.send('Page.navigate', { url: URL });
    for (let i = 0; i < 80; i++) {
        await sleep(500);
        if (await b.evaluate(`typeof window.__pixelBugLeash === 'function'`)) break;
    }
    await sleep(2500);
    const crop = async (name) => {
        const r = JSON.parse(await b.evaluate(`(() => { const r = document.querySelector('#skWheel .sk-star').getBoundingClientRect(); return JSON.stringify([r.left, r.top, r.width, r.height]); })()`));
        const x = Math.max(0, r[0]), y = Math.max(0, r[1]);
        await b.shot(OUT(name + '-crop'), { x, y, width: Math.min(W, r[0] + r[2]) - x, height: Math.min(H, r[1] + r[3]) - y });
    };
    // (a) the flight at about the middle of the crossfade
    await b.evaluate(`(async () => {
        const sc = document.querySelector('.js-scroller'), tr = document.getElementById('skWheel');
        const A = Math.round(tr.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop);
        sc.scrollTop = A - sc.clientHeight * ${process.env.TRAVEL_GAP || 0.36};
        await new Promise((r) => setTimeout(r, 2200));
    })()`);
    console.log('a', await b.evaluate(STATE));
    await b.shot(OUT('a-midflight'));
    await crop('a-midflight');
    // (b) stuck on detent 1
    await b.evaluate(`(async () => {
        const sc = document.querySelector('.js-scroller'), tr = document.getElementById('skWheel');
        const go = () => { const r = tr.getBoundingClientRect(), s = sc.getBoundingClientRect(); return Math.round(r.top - s.top + sc.scrollTop); };
        sc.scrollTop = go() - 40;
        await new Promise((r) => setTimeout(r, 400));
        sc.scrollTop = go() + 2;
        await new Promise((r) => setTimeout(r, 1500));
    })()`);
    await sleep(4000);
    console.log('b', await b.evaluate(STATE));
    await b.shot(OUT('b-step1'));
    await crop('b-step1');
    // (d) the right-hand arm, from the hub to its tip, at 2x
    const arm = JSON.parse(await b.evaluate(`(() => { const s = document.querySelector('#skWheel .sk-star'), r = s.getBoundingClientRect();
        return JSON.stringify([(r.left + r.right) / 2, (r.top + r.bottom) / 2, s.offsetWidth / 24]); })()`));
    const ax = Math.max(0, arm[0] - 1.5 * arm[2]);
    await b.shot(OUT('d-arm-zoom'), { x: ax, y: arm[1] - 2.2 * arm[2], width: arm[0] + 11.2 * arm[2] - ax, height: 4.4 * arm[2], scale: 2 });
    // (c) two detents on, with a frame caught mid-flap on the second
    const key = async () => { for (const type of ['keyDown', 'keyUp']) await b.send('Input.dispatchKeyEvent', { type, key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40, nativeVirtualKeyCode: 40 }); };
    await key();
    await sleep(3200);
    await key();
    await sleep(+(process.env.FLAP_AT || 170));
    await crop('flap');
    await sleep(4000);
    console.log('c', await b.evaluate(STATE));
    await b.shot(OUT('c-step3'));
    await crop('c-step3');
    console.log('cursor', await b.evaluate(`(() => { const d = document.querySelector('.site-cursor-dot'); if (!d) return null; const c = getComputedStyle(d); return [c.backgroundColor, c.zIndex].join(' '); })()`));
    await b.close();
    process.exit(0);
})();
