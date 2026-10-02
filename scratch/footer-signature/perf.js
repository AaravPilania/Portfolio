// HEADFUL=1 node scratch/footer-signature/perf.js [w h] [base] -> rAF frame times per phase with real wheel input (no
// screenshots while measuring), plus CDP script time per second. `base` = port 3011 (a HEAD checkout) for comparison.
const { launch, sleep } = require('../calendar/v4/cdp.js');
const W = +process.argv[2] || 1920, H = +process.argv[3] || 1080, PORT = process.argv[4] === 'base' ? 3011 : 3010;

(async () => {
    const { page, close } = await launch({ w: W, h: H, timeout: 420000, args: ['--ignore-gpu-blocklist'] });
    await page.send('Performance.enable', {});
    await page.goto(`http://localhost:${PORT}/`);
    for (let i = 0; i < 90; i++) { await sleep(500); if (await page.eval(`!!document.querySelector('.js-scroller') && !!window.__workTogether`)) break; }
    await sleep(4000);
    const geo = JSON.parse(await page.eval(`(() => { const sc = document.querySelector('.js-scroller'), s = sc.getBoundingClientRect(), y = sc.scrollTop; const t = (q) => { const el = document.querySelector(q); return el ? Math.round(el.getBoundingClientRect().top - s.top + y) : null; }; return JSON.stringify({ together: t('.ll-section--together'), footer: t('.sig-footer'), max: sc.scrollHeight - sc.clientHeight }); })()`));
    const jump = (v) => page.eval(`(() => { const sc = document.querySelector('.js-scroller'); sc.scrollTop = ${Math.round(v)}; return sc.scrollTop; })()`);
    await page.eval(`(() => { window.__dts = []; let l = 0; const f = (t) => { if (l) window.__dts.push(t - l); l = t; requestAnimationFrame(f); }; requestAnimationFrame(f); return 1; })()`);
    const metric = async () => { const m = (await page.send('Performance.getMetrics', {})).metrics; const o = {}; m.forEach((x) => { o[x.name] = x.value; }); return o; };
    let m0 = null, t0 = 0;
    const begin = async () => { await page.eval(`window.__dts = []`); m0 = await metric(); t0 = Date.now(); };
    const end = async (label) => {
        const m1 = await metric(), secs = (Date.now() - t0) / 1000;
        const r = JSON.parse(await page.eval(`(() => { const d = window.__dts.slice().sort((a, b) => a - b); const q = (p) => d.length ? +d[Math.min(d.length - 1, Math.floor(d.length * p))].toFixed(1) : 0; return JSON.stringify({ n: d.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: q(1) }); })()`));
        r.scriptMsPerS = +(((m1.ScriptDuration - m0.ScriptDuration) * 1000) / secs).toFixed(1);
        r.taskMsPerS = +(((m1.TaskDuration - m0.TaskDuration) * 1000) / secs).toFixed(1);
        console.log('perf', label, JSON.stringify(r));
    };
    const wheel = async (dy, n, gap = 16) => {
        for (let i = 0; i < n; i++) {
            await page.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: W * 0.5, y: H * 0.5, deltaX: 0, deltaY: dy });
            await sleep(gap);
        }
    };
    const mouse = (x, y) => page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });

    await jump(geo.together - H * 1.2);
    await sleep(1500);
    await begin(); await wheel(60, 70); await sleep(1200); await end('wheel 4->5');
    await jump(geo.together + H * 0.35);
    await sleep(1500);
    await begin();
    for (let i = 0; i < 40; i++) { await mouse(W * (0.2 + 0.6 * ((i % 10) / 10)), H * 0.5); await sleep(75); }
    await end('slide5 conveyor + pointer');
    await begin(); await wheel(60, 50); await sleep(2500); await end('wheel 5->footer, fall');
    await jump(geo.max);
    await sleep(3500);
    await begin(); await sleep(3000); await end('footer pile asleep');
    await begin(); await wheel(-60, 30); await sleep(1800); await end('wheel back, lift');
    console.log('state', await page.eval(`JSON.stringify(window.__workTogether.state())`));
    console.log(page.errors.length ? 'errors ' + page.errors.join('\n') : 'errors none');
    await close();
    process.exit(0);
})();
