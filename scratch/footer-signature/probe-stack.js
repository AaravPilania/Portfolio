// node scratch/footer-signature/probe-stack.js [w h tag] -> canvases with their stacking, plus frames across the
// slide 4 -> 5 boundary (b4-<tag>-NN.png) so the backdrop's bottom wipe can be compared before/after
const path = require('path');
const { open } = require('./site.js');
const W = +process.argv[2] || 1920, H = +process.argv[3] || 1080, TAG = process.argv[4] || 'before';

(async () => {
    const s = await open(W, H);
    const g = await s.geo();
    console.log('geo', JSON.stringify(g));
    console.log('canvases', await s.page.eval(`JSON.stringify([...document.querySelectorAll('canvas')].map((c) => { const cs = getComputedStyle(c); let z = [], n = c; while (n && n !== document.body) { const k = getComputedStyle(n); if (k.zIndex !== 'auto' || k.position === 'fixed') z.push((n.className && String(n.className).slice(0, 30)) + ':' + k.position + ':' + k.zIndex); n = n.parentElement; } return { cls: String(c.className).slice(0, 40), wh: c.width + 'x' + c.height, pos: cs.position, z: z.slice(0, 4).join(' > ') }; }))`));
    const bottom = g.services.top + g.services.h;
    for (let i = 0; i <= 10; i++) {
        const target = bottom - H + (H * 1.25) * i / 10;
        await s.glide(target, 0.2, 40);
        await s.sleep(450);
        await s.page.shot(path.join(__dirname, `b4-${TAG}-${W}-${String(i).padStart(2, '0')}.png`));
    }
    console.log(s.page.errors.length ? 'errors ' + s.page.errors.join('\n') : 'errors none');
    await s.close();
    process.exit(0);
})();
