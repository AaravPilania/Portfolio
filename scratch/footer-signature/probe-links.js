// node scratch/footer-signature/probe-links.js -> footer links: back to top and Work ride Lenis all the way past the
// skills wheel; mailto / GitHub / contact hrefs are what they should be
const { open } = require('./site.js');

(async () => {
    const s = await open(1920, 1080);
    const g = await s.geo();
    const click = (q) => s.page.eval(`(() => { const el = document.querySelector('${q}'); el.click(); return 1; })()`);
    console.log('hrefs', await s.page.eval(`JSON.stringify([...document.querySelectorAll('.sig-footer a')].map((a) => a.getAttribute('href')))`));
    await s.glide(g.max, 0.5, 60);
    await s.sleep(1200);
    await click('.sig-back');
    for (let i = 0; i < 8; i++) { await s.sleep(500); console.log('top t+' + (i + 1) * 0.5 + 's', await s.y()); }
    await s.set(g.max);
    await s.sleep(1500);
    await click('.sig-nav a[data-sig-to="#section-projects"]');
    await s.sleep(4000);
    const proj = await s.page.eval(`Math.round(document.getElementById('section-projects').getBoundingClientRect().top)`);
    console.log('work: projects top on screen', proj, 'scrollTop', await s.y());
    await s.set(g.max);
    await s.sleep(1500);
    await click('.sig-nav a[data-sig-to="#work-together"]');
    await s.sleep(3500);
    console.log('stack: together top on screen', await s.page.eval(`String(Math.round(document.querySelector('#work-together').getBoundingClientRect().top))`), 'scrollTop', await s.y(), 'expected', g.together.top);
    console.log(s.page.errors.length ? 'errors ' + s.page.errors.join('\n') : 'errors none');
    await s.close();
    process.exit(0);
})();
