// HEADFUL=1 node scratch/main-v12/smooth.js [w h] [tag] -> real wheel input from slide 04's exit through slide 05 into the
// footer; per-rAF scrollTop, frame dt, long tasks and the sticker mode, written to smooth-<tag>.json, with a summary of
// frame pacing and scroll-position smoothness (velocity steps) around the moment the stickers drop.
const fs = require('fs');
const path = require('path');
const { open, sleep } = require('../footer-signature/site.js');
const W = +process.argv[2] || 1920, H = +process.argv[3] || 1080, TAG = process.argv[4] || 'v12';
(async () => {
    const { page, close, geo, set } = await open(W, H, { settle: 5000 });
    const g = await geo();
    await set(g.together.top - H * 0.6);
    await sleep(2500);
    await page.eval(`(() => {
        const sc = document.querySelector('.js-scroller');
        window.__log = []; window.__long = [];
        try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: false }); } catch (e) {}
        let last = 0;
        const wt = window.__workTogether;
        const f = (t) => { const s = wt && wt.state(); window.__log.push([+t.toFixed(2), +sc.scrollTop.toFixed(2), s ? s.mode : '', s ? +s.footTop.toFixed(1) : 0, wt ? wt.items.slice(0, 36).map((it) => +it.y.toFixed(2)) : []]); last = t; if (window.__log.length < 20000) requestAnimationFrame(f); };
        requestAnimationFrame(f);
        return 1;
    })()`);
    if (process.env.PROFILE) { await page.send('Profiler.enable'); await page.send('Profiler.setSamplingInterval', { interval: 200 }); await page.send('Profiler.start'); }
    // A steady trackpad-like stream: 40px notches every 16ms, in bursts, the way a long flick arrives
    for (let b = 0; b < 9; b++) {
        for (let i = 0; i < 24; i++) {
            await page.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: W * 0.5, y: H * 0.5, deltaX: 0, deltaY: 40 });
            await sleep(16);
        }
        await sleep(260);
    }
    await sleep(2500);
    if (process.env.PROFILE) {
        const { profile } = await page.send('Profiler.stop');
        const self = new Map(), dt = profile.timeDeltas, byId = new Map(profile.nodes.map((n) => [n.id, n]));
        const hits = new Map();
        profile.samples.forEach((id, i) => hits.set(id, (hits.get(id) || 0) + (dt[i] || 0)));
        hits.forEach((us, id) => { const f = byId.get(id).callFrame, k = f.functionName + ' ' + f.url.split('/').pop() + ':' + f.lineNumber; self.set(k, (self.get(k) || 0) + us); });
        console.log('profile self ms', JSON.stringify([...self].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, us]) => [k, Math.round(us / 1000)])));
    }
    const log = JSON.parse(await page.eval('JSON.stringify(window.__log)'));
    const long = JSON.parse(await page.eval('JSON.stringify(window.__long)'));
    fs.writeFileSync(path.join(__dirname, `smooth-${TAG}-${W}.json`), JSON.stringify({ log, long }));
    const dts = [], jumps = [];
    let fallAt = -1;
    for (let i = 1; i < log.length; i++) {
        const dt = log[i][0] - log[i - 1][0];
        dts.push(dt);
        if (fallAt < 0 && log[i][2] === 'fall' && log[i - 1][2] !== 'fall') fallAt = i;
    }
    // Velocity in px per ms per frame; a "step" is a frame whose velocity departs from the mean of its neighbours by
    // more than 0.6 px/ms (~10px at 60fps) — Lenis' lerp never does that on its own
    const v = [];
    for (let i = 1; i < log.length; i++) v.push((log[i][1] - log[i - 1][1]) / Math.max(1, log[i][0] - log[i - 1][0]));
    for (let i = 1; i < v.length - 1; i++) {
        const dev = v[i] - (v[i - 1] + v[i + 1]) / 2;
        if (Math.abs(dev) > 0.6) jumps.push({ i, t: log[i + 1][0], y: log[i + 1][1], v: +v[i].toFixed(2), dev: +dev.toFixed(2), mode: log[i + 1][2] });
    }
    const sorted = dts.slice().sort((a, b) => a - b), q = (p) => +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))].toFixed(1);
    const around = fallAt > 0 ? dts.slice(Math.max(0, fallAt - 10), fallAt + 20).map((d) => +d.toFixed(1)) : [];
    const back = log.some((r, i) => i && r[1] < log[i - 1][1] - 0.5);
    // Sticker screen motion across the drop: per sticker, |velocity on the drop frame - velocity the frame before|, px/ms
    let stick = null;
    if (fallAt > 2) {
        const vel = (i, k) => (log[i][4][k] - log[i - 1][4][k]) / Math.max(1, log[i][0] - log[i - 1][0]);
        const n = log[fallAt][4].length, d = [];
        for (let k = 0; k < n; k++) d.push(Math.abs(vel(fallAt, k) - vel(fallAt - 1, k)));
        d.sort((a, b) => a - b);
        // and the worst frame-to-frame velocity change of any sticker over the 40 frames after the drop
        let worst = 0;
        for (let i = fallAt + 1; i < Math.min(log.length, fallAt + 40); i++) for (let k = 0; k < n; k++) worst = Math.max(worst, Math.abs(vel(i, k) - vel(i - 1, k)));
        stick = { dropDvMedian: +d[n >> 1].toFixed(3), dropDvMax: +d[n - 1].toFixed(3), after40WorstDv: +worst.toFixed(3), scrollVelAtDrop: +v[fallAt - 1].toFixed(3) };
    }
    console.log(JSON.stringify({ frames: log.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: q(1), over25: dts.filter((d) => d > 25).length, fallFrame: fallAt, dtAroundFall: around, stickers: stick, steps: jumps.slice(0, 12), stepCount: jumps.length, backwards: back, long }));
    console.log(page.errors.length ? 'errors ' + page.errors.slice(0, 5).join('\n') : 'errors none');
    await close();
    process.exit(0);
})();
