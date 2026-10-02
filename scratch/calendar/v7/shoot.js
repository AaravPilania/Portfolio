// node scratch/calendar/v7/shoot.js <tag> [glyphHex] -> stills at text-full, dance-mid and disappearance-mid for
// 1920x1080, 1366x768 and 390x844 into scratch/calendar/v7/<tag>-<w>-<phase>.png, plus per-letter bounding boxes of
// the glyph colour on the text-full canvas (width / height in CSS px) and any console errors.
const path = require('path');
const { launch, sleep } = require('../v4/cdp.js');

const tag = process.argv[2] || 'v7';
const hex = (process.argv[3] || 'b8860b').replace('#', '');
const target = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
const SIZES = [[1920, 1080], [1366, 768], [390, 844]];

(async () => {
    for (const [w, h] of SIZES) {
        const { page, close } = await launch({ w, h });
        await page.goto('http://localhost:3010/contact.html');
        for (let i = 0; i < 60; i++) { await sleep(250); if (await page.eval(`!!(window.__calendarContact && __calendarContact.ready())`)) break; }
        await sleep(800);
        const P = await page.eval(`__calendarContact.P`);
        const phases = { 'text-full': P.textFull + 0.4, 'dance-mid': (P.fine + P.dissolve) / 2, 'disappear-mid': P.dissolve + (P.outro - P.dissolve) * 0.45 };
        for (const [name, t] of Object.entries(phases)) {
            await page.eval(`__calendarContact.freeze(${t})`);
            await sleep(250);
            await page.shot(path.join(__dirname, `${tag}-${w}-${name}.png`));
            if (name !== 'text-full') continue;
            const letters = await page.eval(`(() => {
                const cv = document.getElementById('gcCanvas'), W = cv.width, H = cv.height, s = cv.width / innerWidth;
                const d = cv.getContext('2d').getImageData(0, 0, W, H).data, T = ${JSON.stringify(target)};
                const m = new Uint8Array(W * H);
                for (let i = 0; i < W * H; i++) m[i] = Math.abs(d[i * 4] - T[0]) + Math.abs(d[i * 4 + 1] - T[1]) + Math.abs(d[i * 4 + 2] - T[2]) < 30;
                const rowHas = (y) => { for (let x = 0; x < W; x++) if (m[y * W + x]) return true; return false; };
                const bands = []; let y0 = -1, gapRun = 0;
                for (let y = 0; y <= H; y++) {
                    const on = y < H && rowHas(y);
                    if (on) { if (y0 < 0) y0 = y; gapRun = 0; } else if (y0 >= 0 && ++gapRun > 12 * s) { bands.push([y0, y - gapRun + 1]); y0 = -1; }
                }
                const out = [];
                for (const [a, b] of bands) {
                    const colHas = (x) => { for (let y = a; y < b; y++) if (m[y * W + x]) return true; return false; };
                    let x0 = -1, gap = 0;
                    const minGap = Math.max(4, cv.width / 7 / 12 * 0.6);
                    for (let x = 0; x <= W; x++) {
                        const on = x < W && colHas(x);
                        if (on) { if (x0 < 0) x0 = x; gap = 0; }
                        else if (x0 >= 0 && ++gap > minGap) {
                            const x1 = x - gap + 1; let t = b, bo = a;
                            for (let yy = a; yy < b; yy++) for (let xx = x0; xx < x1; xx++) if (m[yy * W + xx]) { if (yy < t) t = yy; if (yy > bo) bo = yy; }
                            out.push({ w: +((x1 - x0) / s).toFixed(1), h: +((bo + 1 - t) / s).toFixed(1), ar: +((x1 - x0) / (bo + 1 - t)).toFixed(3) });
                            x0 = -1;
                        }
                    }
                }
                return out;
            })()`);
            console.log(w + 'x' + h, 'letters', JSON.stringify(letters));
        }
        console.log(w + 'x' + h, 'scenes', JSON.stringify(await page.eval(`Object.fromEntries(${JSON.stringify(Object.entries(phases))}.map(([k, t]) => [k, __calendarContact.scene(t)]))`)));
        console.log(w + 'x' + h, 'errors', JSON.stringify(page.errors));
        await close();
    }
    process.exit(0);
})();
