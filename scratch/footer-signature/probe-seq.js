// HEADFUL=1 node scratch/footer-signature/probe-seq.js [w h] -> our slide 05 every ~740ms (seq-ours-NN.png, the same
// spacing as lusion/seq-NN.png), measured sticker rise speeds, and rAF times over the whole 4 -> 5 -> footer glide
const path = require('path');
const { open } = require('./site.js');
const W = +process.argv[2] || 1920, H = +process.argv[3] || 1080;

(async () => {
    const s = await open(W, H);
    const g = await s.geo();
    await s.page.eval(`(() => { window.__dts = []; let l = 0; const f = (t) => { if (l) window.__dts.push(t - l); l = t; requestAnimationFrame(f); }; requestAnimationFrame(f); return 1; })()`);
    const perf = async (label) => {
        const r = JSON.parse(await s.page.eval(`(() => { const d = window.__dts.slice().sort((a, b) => a - b); window.__dts = []; const q = (p) => d.length ? +d[Math.min(d.length - 1, Math.floor(d.length * p))].toFixed(1) : 0; return JSON.stringify({ n: d.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: q(1) }); })()`));
        console.log('perf', label, JSON.stringify(r));
    };
    await s.glide(g.services.top + g.services.h - H * 1.1, 0.3, 60);
    await s.sleep(800);
    await s.page.eval(`window.__dts = []`);
    await s.glide(g.together.top + H * 0.35, 0.04, 40);
    await perf('glide 4->5');
    await s.sleep(1500);
    const pos = [];
    for (let i = 0; i < 8; i++) {
        const t0 = Date.now();
        pos.push(JSON.parse(await s.page.eval(`JSON.stringify(window.__workTogether.items.map((s) => [s.y, s.o * (s.ks > 0.5 ? 1 : 0), s.cyc]))`)));
        await s.page.shot(path.join(__dirname, `seq-ours-${W}-${String(i).padStart(2, '0')}.png`));
        const wait = 740 - (Date.now() - t0);
        if (wait > 0) await s.sleep(wait);
    }
    await perf('slide5 idle');
    const t = JSON.parse(await s.page.eval(`JSON.stringify(window.__workTogether.items.map((s) => -s.vy))`)).sort((a, b) => a - b);
    const q = (p) => Math.round(t[Math.floor((t.length - 1) * p)]);
    console.log('rise px/s', JSON.stringify({ p10: q(0.1), p50: q(0.5), p90: q(0.9) }), 'per H', (q(0.5) / H).toFixed(3));
    await s.glide(g.max, 0.04, 40);
    await s.sleep(2500);
    await perf('glide 5->footer + pile');
    await s.glide(g.footer.top - H * 1.0, 0.04, 40);
    await s.sleep(1500);
    await perf('reverse + lift');
    console.log(s.page.errors.length ? 'errors ' + s.page.errors.join('\n') : 'errors none');
    await s.close();
    process.exit(0);
})();
