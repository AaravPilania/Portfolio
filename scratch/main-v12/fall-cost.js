// HEADFUL=1 node scratch/main-v12/fall-cost.js -> wraps Matter's entry points in the page and steps the scroller through
// the sticker drop, printing the main-thread ms Matter costs per frame around the trigger (body creation, steps, the
// ghost overlap tests), the sticker canvas' drawImage time, and the frame gaps.
const { open, sleep } = require('./site.js');
const W = +process.argv[2] || 1920, H = +process.argv[3] || 1080;
(async () => {
    const { page, close, geo, set } = await open(W, H, { settle: 6000 });
    const g = await geo();
    await set(g.footer.top - H * 1.05);
    await sleep(2500);
    await page.eval(`(() => {
        const M = window.Matter, acc = { create: 0, step: 0, collide: 0, n: 0 };
        const wrap = (o, k, slot) => { const f = o[k]; o[k] = function () { const t = performance.now(); try { return f.apply(this, arguments); } finally { acc[slot] += performance.now() - t; if (slot === 'collide') acc.n++; } }; };
        wrap(M.Bodies, 'rectangle', 'create'); wrap(M.Engine, 'update', 'step'); wrap(M.Collision, 'collides', 'collide');
        window.__fc = []; let last = 0;
        const f = (t) => { const s = window.__workTogether.state(); window.__fc.push([+(t - last).toFixed(1), s.mode, +acc.create.toFixed(1), +acc.step.toFixed(1), +acc.collide.toFixed(1), acc.n]); acc.create = acc.step = acc.collide = 0; acc.n = 0; last = t; requestAnimationFrame(f); };
        requestAnimationFrame(f);
        return 1;
    })()`);
    const sc = (v) => page.eval(`(() => { const sc = document.querySelector('.js-scroller'); sc.scrollTop = ${Math.round(v)}; return 1; })()`);
    const y0 = g.footer.top - H * 1.05, y1 = g.footer.top - H * 0.6;
    for (let k = 0; k <= 30; k++) { await sc(y0 + (y1 - y0) * k / 30); await sleep(40); }
    await sleep(1500);
    const fc = JSON.parse(await page.eval('JSON.stringify(window.__fc)'));
    const i = fc.findIndex((r) => r[1] === 'fall');
    console.log('frames around the drop: [gap ms, mode, create ms, step ms, collide ms, collide calls]');
    fc.slice(Math.max(0, i - 3), i + 14).forEach((r) => console.log(JSON.stringify(r)));
    const tot = fc.slice(i, i + 90).reduce((a, r) => [a[0] + r[2], a[1] + r[3], a[2] + r[4]], [0, 0, 0]);
    console.log('first 90 fall frames total ms create/step/collide', tot.map((v) => +v.toFixed(1)));
    await close();
    process.exit(0);
})();
