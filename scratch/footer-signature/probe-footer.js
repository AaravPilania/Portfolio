// node scratch/footer-signature/probe-footer.js [w h tag] [rm] -> slide 05 conveyor, the drop into the footer, the
// signature mid / complete, the settled pile and the lift back, with rAF frame times (HEADFUL=1 for real-GPU numbers)
const path = require('path');
const { open } = require('./site.js');
const W = +process.argv[2] || 1920, H = +process.argv[3] || 1080, TAG = process.argv[4] || 'f', RM = process.argv[5] === 'rm';

(async () => {
    const s = await open(W, H, { rm: RM });
    const g = await s.geo();
    console.log('geo', JSON.stringify(g));
    const shot = async (name) => s.page.shot(path.join(__dirname, `${TAG}-${W}-${name}.png`));
    const st = async (label) => console.log(label, await s.page.eval(`JSON.stringify(Object.assign(window.__workTogether.state(), { sig: window.__sigFooter && window.__sigFooter.state() }))`));
    await s.page.eval(`(() => { window.__dts = []; let l = 0; const f = (t) => { if (l) window.__dts.push(t - l); l = t; requestAnimationFrame(f); }; requestAnimationFrame(f); return 1; })()`);
    const perf = async (label) => {
        const r = JSON.parse(await s.page.eval(`(() => { const d = window.__dts.slice().sort((a, b) => a - b); window.__dts = []; const q = (p) => d.length ? +d[Math.min(d.length - 1, Math.floor(d.length * p))].toFixed(1) : 0; return JSON.stringify({ n: d.length, p50: q(0.5), p95: q(0.95), max: q(1) }); })()`));
        console.log('perf', label, JSON.stringify(r));
    };

    await s.glide(g.together.top - H * 0.4, 0.25, 60);
    await s.sleep(500);
    await shot('enter');
    await s.glide(g.together.top + H * 0.35, 0.12, 60);
    await s.page.eval(`window.__dts = []`);
    await s.sleep(2500);
    await perf('slide5');
    await shot('slide5');
    await s.sleep(1500);
    await shot('slide5b');
    await st('slide5');

    const fy = g.footer.top - H * 0.8;
    await s.glide(fy, 0.08, 50);
    await s.sleep(250);
    await shot('fall-a');
    await s.sleep(400);
    await shot('fall-b');
    await st('fall');
    await s.glide(g.footer.top - H * 0.45, 0.06, 60);
    await s.sleep(150);
    await shot('sig-mid');
    await st('sig-mid');
    await s.glide(g.max, 0.06, 60);
    await s.sleep(300);
    await shot('land');
    await s.sleep(3200);
    await perf('footer');
    await shot('piled');
    await st('piled');
    await s.sleep(1500);
    await st('piled+1.5s');

    await s.glide(g.footer.top - H * 1.0, 0.08, 50);
    await s.sleep(450);
    await shot('lift-a');
    await s.sleep(1200);
    await shot('lift-b');
    await st('lift');
    await s.glide(g.footer.top - H * 0.8, 0.08, 50);
    await s.sleep(1500);
    await st('refall');
    console.log(s.page.errors.length ? 'errors ' + s.page.errors.join('\n') : 'errors none');
    await s.close();
    process.exit(0);
})();
