// HEADFUL=1 node scratch/calendar/v12/shoot.js [1920,1366,390] -> stills of the Lama-Lama-arranged contact band
// (default, button hover with tooltip, copy feedback, the opened portrait card), layout boxes, rAF perf, errors.
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('../v4/cdp.js');

const ALL = [[1920, 1080], [1366, 768], [390, 844]];
const pick = process.argv[2] && /\d/.test(process.argv[2]) ? process.argv[2].split(',').map(Number) : null;
const SIZES = pick ? ALL.filter(([w]) => pick.includes(w)) : ALL;
const GL = process.env.HEADFUL ? ['--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const BASE = 'http://localhost:3010/';
const PERF = !process.env.NOPERF;

async function until(page, expr, ms = 8000) {
    for (let t = 0; t < ms; t += 50) { if (await page.eval(expr)) return true; await sleep(50); }
    return false;
}
const center = (page, sel) => page.eval(`(() => { const b = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()`);

(async () => {
    const report = {};
    for (const [w, h] of SIZES) {
        const mobile = w < 700;
        const { page, close } = await launch({ w, h, args: [...GL, '--mute-audio'], timeout: 300000 });
        const out = (n) => path.join(__dirname, `${w}-${n}.png`);
        await page.send('Browser.grantPermissions', { origin: 'http://localhost:3010', permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
        if (mobile) await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
        const tap = async (x, y) => {
            if (mobile) {
                await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
                await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            } else {
                await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
                await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
                await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
            }
        };
        await page.goto(BASE + 'contact.html');
        await until(page, `!!(window.__calendarContact && __calendarContact.ready())`, 20000);
        await until(page, `!!document.querySelector('.ss-gate.is-in')`, 4000);
        await sleep(700);
        const g = await center(page, '.ss-gate [data-sound="0"]');
        await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: g[0], y: g[1] });
        await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: g[0], y: g[1], button: 'left', clickCount: 1 });
        await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: g[0], y: g[1], button: 'left', clickCount: 1 });
        await sleep(1800);
        const P = await page.eval(`__calendarContact.P`), LOOP = await page.eval(`__calendarContact.LOOP`);
        const fr = (f) => P.dance + (f + 0.5) / 30;
        await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 2, y: 2 });
        await sleep(1500);
        await page.eval(`__calendarContact.freeze(${fr(200)})`);
        await sleep(400);
        await page.shot(out('a-default'));
        const boxes = await page.eval(`(() => { const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
            return { band: r('.gc-contact'), fringe: r('.gc-contact__fringe'), head: r('.gc-contact__head'), pill: r('.gc-card__pill'), label: r('.gc-contact__label'), lines: r('.gc-contact__lines'), ctas: r('.gc-contact__ctas'), strip: r('.gc-strip'),
                headFont: getComputedStyle(document.querySelector('.gc-contact__head')).fontFamily, playfair: document.fonts.check('700 40px "Playfair Display"'), playfairI: document.fonts.check('italic 700 40px "Playfair Display"'), clock: document.getElementById('gcClock').textContent }; })()`);
        console.log(w, 'boxes', JSON.stringify(boxes));
        await page.eval(`__calendarContact.freeze(56.5 * __calendarContact.BEAT)`);
        await sleep(400);
        await page.shot(out('b-pose'));
        await page.eval(`__calendarContact.freeze(${fr(200)})`);

        if (!mobile) {
            for (const [name, sel] of [['c-hover-start', '.gc-cta:nth-child(1)'], ['d-hover-call', '.gc-cta:nth-child(2)'], ['e-hover-pill', '.gc-card__pill']]) {
                const c = await center(page, sel);
                await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: c[0] - 30, y: c[1] - 4 });
                await sleep(60);
                await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: c[0] + 10, y: c[1] + 2 });
                await sleep(650);
                await page.shot(out(name));
                console.log(w, name, 'tip', JSON.stringify(await page.eval(`[document.getElementById('gcTip').classList.contains('is-on'), document.getElementById('gcTip').textContent]`)));
            }
            await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 2, y: 2 });
            await sleep(400);
        }
        const cp = await center(page, '.gc-copy');
        await tap(cp[0], cp[1]);
        await sleep(250);
        await page.shot(out('f-copied'));
        console.log(w, 'copy', JSON.stringify(await page.eval(`[document.querySelector('.gc-copy').textContent, location.pathname]`)));
        await sleep(1800);
        const pc = await center(page, '.gc-card__pill');
        await tap(pc[0], pc[1]);
        await sleep(700);
        if (!mobile) await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: w * 0.7, y: h * 0.3 });
        await sleep(200);
        await page.shot(out('g-card-open'));
        console.log(w, 'card', JSON.stringify(await page.eval(`[document.getElementById('gcInvite').classList.contains('is-open'), document.getElementById('gcInviteFold').getAttribute('aria-expanded'), document.getElementById('gcInviteBody').inert, (() => { const b = document.querySelector('.gc-card__sheet').getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; })()]`)));
        await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await sleep(600);
        console.log(w, 'after escape open?', await page.eval(`document.getElementById('gcInvite').classList.contains('is-open')`));
        await page.eval(`__calendarContact.freeze(null)`);

        if (PERF) {
            await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
            await page.eval(`__calendarContact.perfReset()`);
            await sleep(LOOP * 1000 + 500);
            const perf = await page.eval(`__calendarContact.perf()`);
            console.log(w, 'perf over a full cycle', JSON.stringify(perf));
            report[w] = { boxes, perf };
        }
        console.log(w, 'errors', JSON.stringify(page.errors));
        await close();
    }
    fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(report, null, 1));
    process.exit(0);
})();
