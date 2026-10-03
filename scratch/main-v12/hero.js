// node scratch/main-v12/hero.js [w h] [tag] -> hero frames from slide 1 into slide 2 (hero-<tag>-XX.png) plus the
// marquee line-1 x offsets of every layer per frame, to prove one continuous line across the hand-off
const path = require('path');
const { open, sleep } = require('../footer-signature/site.js');
const W = +process.argv[2] || 1920, H = +process.argv[3] || 1080, TAG = process.argv[4] || 'v12';
(async () => {
    const { page, close, set } = await open(W, H, { settle: 5000 });
    const probe = () => page.eval(`JSON.stringify((() => {
        const q = (sel) => [...document.querySelectorAll(sel)].map((t) => { const g = t.querySelector('.marquee-group'), r = g.getBoundingClientRect(), cs = getComputedStyle(t.closest('.hero-marquee-incard, .hero-marquee-outline-clip, #heroMarquee'));
            return { x: +r.left.toFixed(2), y: +r.top.toFixed(1), op: +getComputedStyle(t).opacity * +cs.opacity }; });
        return { st: document.querySelector('.js-scroller').scrollTop, base: q('#heroMarquee .track-line-1'), incard: q('.hero-marquee-incard .track-line-1'), outline: q('.hero-marquee-outline-clip .track-line-1'), base2: q('#heroMarquee .track-line-2') };
    })())`);
    const steps = [0, 0.08, 0.16, 0.24, 0.3, 0.38, 0.5, 0.7, 0.95];
    for (let i = 0; i < steps.length; i++) {
        await set(steps[i] * H * 1.25);
        await sleep(i === 0 ? 1200 : 650);
        await page.shot(path.join(__dirname, `hero-${TAG}-${W}-${String(i).padStart(2, '0')}.png`));
        console.log(i, steps[i], await probe());
    }
    console.log(page.errors.length ? 'errors ' + page.errors.slice(0, 5).join('\n') : 'errors none');
    await close();
    process.exit(0);
})();
