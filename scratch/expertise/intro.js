// node scratch/expertise/intro.js [w] [h] [url] -> scratch/expertise/intro-*.png: the EXPERTISE intro rising as the
// asterisk lands at full size, GLITCH parked on the take-off, then Frontend (ribbon starting), step 3 (loops), step 5.
const path = require('path');
const { open, sleep } = require('./cdp');

const W = +process.argv[2] || 1920, H = +process.argv[3] || 1080;
const URL = process.argv[4] || 'http://localhost:3010/';
const OUT = (n) => path.join(__dirname, 'intro-' + n + '.png');

const STATE = `(() => {
    const cats = [...document.querySelectorAll('#skWheel .sk-cat')];
    const up = cats.map((c) => {
        const ch = c.querySelector('.sk-title .sk-ch:last-child');
        return ch ? Math.round(ch.getBoundingClientRect().top) : null;
    });
    const star = document.querySelector('#skWheel .sk-star');
    return JSON.stringify({
        titles: cats.map((c) => c.querySelector('.sk-title').getAttribute('aria-label')),
        kickers: cats.map((c) => { const k = c.querySelector('.sk-kicker'); return k ? k.textContent : null; }),
        titleTops: up, star: star.style.transform,
    });
})()`;

(async () => {
    const b = await open(W, H, 9471);
    await b.send('Page.navigate', { url: URL });
    for (let i = 0; i < 80; i++) {
        await sleep(500);
        if (await b.evaluate(`typeof window.__pixelBugLeash === 'function' && !!document.querySelector('#skWheel .sk-ch')`)) break;
    }
    await sleep(6000);
    // Scroll in so the asterisk reaches full size and the stage sticks on the intro; catch EXPERTISE mid-rise
    await b.evaluate(`(async () => {
        const sc = document.querySelector('.js-scroller'), tr = document.getElementById('skWheel');
        const go = () => { const r = tr.getBoundingClientRect(), s = sc.getBoundingClientRect(); return Math.round(r.top - s.top + sc.scrollTop); };
        sc.scrollTop = go() - 40;
        await new Promise((r) => setTimeout(r, 400));
        sc.scrollTop = go() + 2;
        await new Promise((r) => setTimeout(r, +(${process.env.RISE_AT || 260})));
    })()`);
    console.log('1', await b.evaluate(STATE));
    await b.shot(OUT('1-expertise-rise'));
    await sleep(4500);
    console.log('2', await b.evaluate(STATE));
    await b.shot(OUT('2-glitch-at-start'));
    const key = async () => { for (const type of ['keyDown', 'keyUp']) await b.send('Input.dispatchKeyEvent', { type, key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40, nativeVirtualKeyCode: 40 }); };
    await key();
    await sleep(3600);
    console.log('3', await b.evaluate(STATE));
    await b.shot(OUT('3-step1-frontend'));
    await key(); await sleep(3400); await key(); await sleep(3600);
    console.log('4', await b.evaluate(STATE));
    await b.shot(OUT('4-step3-loops'));
    await key(); await sleep(3400); await key(); await sleep(3600);
    console.log('5', await b.evaluate(STATE));
    await b.shot(OUT('5-step5-tools'));
    console.log('cursor', await b.evaluate(`(() => { const d = document.querySelector('.site-cursor-dot'); if (!d) return null; const c = getComputedStyle(d); return [c.backgroundColor, c.zIndex].join(' '); })()`));
    await b.close();
    process.exit(0);
})();
