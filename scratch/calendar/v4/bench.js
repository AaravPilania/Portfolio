// node bench.js [w h] -> render() cost per scene (forced redraw) over the whole cycle at 1/60 s, plus a 60 Hz cadence
// simulation: scene keys at t = i/60 (+ the page's half-frame lead) -> vsyncs between dance steps.
const { launch, sleep } = require('./cdp');
const W = +process.argv[2] || 1920, H = +process.argv[3] || 1080;
(async () => {
    const { page, close } = await launch({ w: W, h: H });
    await page.goto('http://localhost:3010/contact.html?t=0');
    for (let i = 0; i < 60; i++) { await sleep(250); if (await page.eval(`!!(window.__calendarContact && __calendarContact.ready())`)) break; }
    await sleep(800);
    const r = await page.eval(`(() => {
        const C = __calendarContact, L = C.LOOP, by = {};
        for (let rep = 0; rep < 2; rep++) for (let t = 0; t < L; t += 1 / 60) {
            const name = C.scene(t).replace(/:\\d+/, '').replace(/\\/sweep\\d/, '/sweep'); const ms = C.bench(t);
            if (rep) (by[name] = by[name] || []).push(ms);
        }
        const out = {}; const all = [];
        for (const k in by) { const a = by[k].sort((x, y) => x - y); all.push(...a); out[k] = [a.length, +a[Math.floor(a.length / 2)].toFixed(2), +a[Math.floor(a.length * 0.95)].toFixed(2)]; }
        all.sort((x, y) => x - y);
        out.ALL = [all.length, +all[Math.floor(all.length / 2)].toFixed(2), +all[Math.floor(all.length * 0.95)].toFixed(2)];
        const gaps = {}; let last = -1, lastI = -1;
        for (let i = 0; i < L * 60 * 3; i++) {
            const t = ((i / 60.0002 + 0.37 + 1 / 120) % L);
            const k = C.key(t); const mode = Math.floor(k / 1600000), arg = k % 10000;
            if (mode === 3) { if (arg !== last) { if (lastI >= 0 && last >= 0) gaps[i - lastI] = (gaps[i - lastI] || 0) + 1; last = arg; lastI = i; } } else { last = -1; lastI = -1; }
        }
        return { out, gaps };
    })()`);
    console.log(W + 'x' + H, 'render ms [count, p50, p95] by scene:');
    for (const [k, v] of Object.entries(r.out)) console.log('  ', k.padEnd(22), JSON.stringify(v));
    console.log('60 Hz simulation, vsyncs between dance steps:', JSON.stringify(r.gaps));
    console.log(page.errors.length ? 'errors: ' + page.errors.join(' | ') : 'errors: none');
    await close(); process.exit(0);
})();
