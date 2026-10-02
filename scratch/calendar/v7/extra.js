// node scratch/calendar/v7/extra.js -> 1920 stills through refine, empty, first glyph, coarsen, plus reduced motion
const path = require('path');
const { launch, sleep } = require('../v4/cdp.js');

(async () => {
    const { page, close } = await launch({ w: 1920, h: 1080 });
    await page.goto('http://localhost:3010/contact.html');
    for (let i = 0; i < 60; i++) { await sleep(250); if (await page.eval(`!!(window.__calendarContact && __calendarContact.ready())`)) break; }
    await sleep(800);
    const P = await page.eval(`__calendarContact.P`), B = await page.eval(`__calendarContact.BEAT`);
    const S = B / 8;
    const at = { refine1: P.refine + S * 1.5, empty: P.empty + 0.05, ping: P.text + B * 2.2, coarsen1: P.coarsen + S * 0.5, coarsen3: P.coarsen + S * 2.5 };
    for (const [k, t] of Object.entries(at)) {
        await page.eval(`__calendarContact.freeze(${t})`);
        await sleep(200);
        await page.shot(path.join(__dirname, `extra-${k}.png`));
        console.log(k, t.toFixed(3), await page.eval(`__calendarContact.scene(${t})`));
    }
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await page.eval(`__calendarContact.freeze(null)`);
    await sleep(400);
    await page.shot(path.join(__dirname, 'extra-reduced.png'));
    console.log('errors', JSON.stringify(page.errors));
    await close();
    process.exit(0);
})();
