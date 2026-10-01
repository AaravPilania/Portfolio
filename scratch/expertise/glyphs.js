// node scratch/expertise/glyphs.js -> Brier 700's ink boxes for E X P R T I S at 1000px (canvas measureText)
const { open, sleep } = require('./cdp');
(async () => {
    const b = await open(800, 600);
    await b.send('Page.navigate', { url: 'http://localhost:3010/fonts/Brier-Bold.woff2' });
    await sleep(800);
    await b.send('Page.navigate', { url: 'http://localhost:3010/__nope__' });
    await sleep(800);
    console.log(await b.evaluate(`(async () => {
        const f = new FontFace('Brier', 'url(/fonts/Brier-Bold.woff2)', { weight: '700' });
        await f.load(); document.fonts.add(f);
        const c = document.createElement('canvas').getContext('2d');
        c.font = '700 1000px Brier';
        const o = {};
        for (const ch of 'EXPRTISH') { const m = c.measureText(ch); o[ch] = [m.width, m.actualBoundingBoxLeft, m.actualBoundingBoxRight, m.actualBoundingBoxAscent, m.actualBoundingBoxDescent].map(Math.round); }
        const m = c.measureText('H'); o.font = [m.fontBoundingBoxAscent, m.fontBoundingBoxDescent];
        return JSON.stringify(o);
    })()`));
    await b.close();
    process.exit(0);
})();
