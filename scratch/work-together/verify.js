// node scratch/work-together/verify.js [w] [h] -> stills of the Let's work together section into scratch/work-together:
// wt-<w>-enter.png (section top at 45% of the viewport), wt-<w>-settled.png, wt-<w>-cursor.png (pointer resting on a sticker
// beside the headline: repel + cursor label). PERF=1 also samples rAF intervals for 4 s with the pointer moving, the
// engine's own draw cost, and ScriptDuration per frame. RM=1 emulates reduced motion. HEADFUL=1 uses a real GPU window.
const path = require('path');
const { launch, sleep } = require('../calendar/v4/cdp.js');
const W = +process.argv[2] || 1920, H = +process.argv[3] || 1080;
const OUT = __dirname;
const TAG = (process.env.RM ? 'rm-' : '') + W;

(async () => {
    const { page, close } = await launch({ w: W, h: H, timeout: 300000 });
    if (process.env.RM) await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    if (W < 700) await page.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await page.goto('http://localhost:3010/');
    for (let i = 0; i < 80; i++) {
        await sleep(500);
        if (await page.eval(`!!document.querySelector('.js-scroller') && !!window.__workTogether && typeof window.__pixelBugLeash === 'function'`)) break;
    }
    await sleep(3000);
    const geo = JSON.parse(await page.eval(`(() => {
        const sc = document.querySelector('.js-scroller'), s = sc.getBoundingClientRect(), y = sc.scrollTop;
        const el = document.querySelector('.ll-section--together'), r = el.getBoundingClientRect();
        return JSON.stringify({ top: Math.round(r.top - s.top + y), h: Math.round(r.height), H: sc.clientHeight, max: sc.scrollHeight - sc.clientHeight });
    })()`));
    console.log('geo', JSON.stringify(geo));
    const glide = async (target) => {
        const from = await page.eval(`document.querySelector('.js-scroller').scrollTop`);
        const n = Math.max(1, Math.ceil(Math.abs(target - from) / (geo.H * 0.5)));
        for (let k = 1; k <= n; k++) {
            await page.eval(`document.querySelector('.js-scroller').scrollTop = ${Math.round(from + (target - from) * k / n)}`);
            await sleep(90);
        }
    };
    const state = () => page.eval(`JSON.stringify({ y: Math.round(document.querySelector('.js-scroller').scrollTop), cls: document.querySelector('.ll-section--together').className,
        wt: window.__workTogether.state(), title: getComputedStyle(document.querySelector('.wt-title')).fontFamily.slice(0, 40),
        nav: document.body.classList.contains('sk-nav-hidden') ? 'hidden' : 'shown',
        label: (document.getElementById('cursorLabel') || {}).textContent && document.getElementById('cursorLabel').textContent.trim() + ' @' + document.getElementById('cursorLabel').style.opacity })`);
    // Jump close first: the wheel's stage catches viewport hops through its detents
    await page.eval(`document.querySelector('.js-scroller').scrollTop = ${geo.top - geo.H * 1.6}`);
    await sleep(800);
    await glide(geo.top - Math.round(geo.H * 0.45));
    await sleep(1400);
    console.log('enter', await state());
    await page.shot(path.join(OUT, `wt-${TAG}-enter.png`));
    await glide(geo.top + Math.round(geo.H * 0.05));
    await sleep(2600);
    console.log('settled', await state());
    await page.shot(path.join(OUT, `wt-${TAG}-settled.png`));
    // Rest the pointer on the sticker nearest to the headline's right edge
    const target = JSON.parse(await page.eval(`(() => {
        const st = window.__workTogether.state(), its = window.__workTogether.items.filter((s) => s.e > 0.95 && s.x > 40 && s.x < st.W - 40 && s.y > 80 && s.y < st.H - 40);
        const gx = st.safe.x1, gy = (st.safe.y0 + st.safe.y1) / 2;
        its.sort((a, b) => Math.hypot(a.x - gx, a.y - gy) - Math.hypot(b.x - gx, b.y - gy));
        const s = its[0]; return JSON.stringify({ x: Math.round(s.x), y: Math.round(s.y), n: s.def.n });
    })()`));
    const sx = target.x - 160, sy = target.y + 60;
    for (let k = 0; k <= 24; k++) {
        await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: sx + (target.x - sx) * k / 24, y: sy + (target.y - sy) * k / 24 });
        await sleep(30);
    }
    // the parallax shifts the field as the pointer arrives, so re-aim at the sticker's live position
    for (let k = 0; k < 4; k++) {
        await sleep(400);
        const p = JSON.parse(await page.eval(`(() => { const s = window.__workTogether.items.find((s) => s.def.n === ${JSON.stringify(target.n)}); return JSON.stringify({ x: Math.round(s.x), y: Math.round(s.y) }); })()`));
        await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y });
    }
    await sleep(900);
    console.log('cursor on', target.n, await state());
    await page.shot(path.join(OUT, `wt-${TAG}-cursor.png`));

    if (process.env.PERF) {
        await page.send('Performance.enable');
        const m0 = (await page.send('Performance.getMetrics')).metrics;
        const res = JSON.parse(await page.eval(`new Promise((done) => {
            const d = []; let last = 0, f = 0; const t0 = performance.now();
            const loop = (t) => { if (last) d.push(t - last); last = t; f++; if (t - t0 < 4000) requestAnimationFrame(loop); else {
                d.sort((a, b) => a - b); const q = (p) => d[Math.min(d.length - 1, Math.floor(d.length * p))];
                done(JSON.stringify({ frames: f, p50: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(2), p99: +q(0.99).toFixed(2), max: +d[d.length - 1].toFixed(2) }));
            } };
            requestAnimationFrame(loop);
        })`));
        // the pointer keeps moving across stickers during the sample in a parallel stream of events
        const m1 = (await page.send('Performance.getMetrics')).metrics;
        const get = (m, k) => (m.find((x) => x.name === k) || {}).value || 0;
        const scriptMs = (get(m1, 'ScriptDuration') - get(m0, 'ScriptDuration')) * 1000;
        console.log('raf', JSON.stringify(res), 'scriptMs/frame', (scriptMs / res.frames).toFixed(2));
        const cost = JSON.parse(await page.eval(`(() => { const t = []; for (let i = 0; i < 300; i++) { const a = performance.now(); window.__workTogether.draw(); t.push(performance.now() - a); }
            t.sort((a, b) => a - b); return JSON.stringify({ p50: +t[150].toFixed(3), p95: +t[285].toFixed(3) }); })()`));
        console.log('draw cost ms', JSON.stringify(cost));
    }
    console.log(page.errors.length ? 'errors:\n  ' + page.errors.join('\n  ') : 'errors: none');
    await close();
    process.exit(0);
})();
