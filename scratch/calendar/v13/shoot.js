// HEADFUL=1 node scratch/calendar/v13/shoot.js [1920,1366,390] -> ours/: settled stills + computed styles, hovers,
// settings (light), camera mode with a fake webcam (count-in, booked, back), rAF perf over a full cycle, errors.
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('../v4/cdp.js');

const ALL = [[1920, 1080], [1366, 768], [390, 844]];
const pick = process.argv[2] && /\d/.test(process.argv[2]) ? process.argv[2].split(',').map(Number) : null;
const SIZES = pick ? ALL.filter(([w]) => pick.includes(w)) : ALL;
const BASE = 'http://localhost:3010/';
const PERF = !process.env.NOPERF;
const OUT = path.join(__dirname, 'ours');
fs.mkdirSync(OUT, { recursive: true });

const EXTRACT = `(() => {
  const props = ['font-family','font-size','font-weight','line-height','letter-spacing','text-transform','color','background-color','border-top','border-radius','padding','opacity','z-index','position','gap','backdrop-filter','text-align','white-space'];
  const roots = [...document.querySelectorAll('.ap-nav, .gc-contact, .gc-side, .gc-bar, .gc-tip')];
  const seen = new Set(), out = [];
  const W = innerWidth, H = innerHeight;
  for (const root of roots) for (const el of [root, ...root.querySelectorAll('*')]) {
    if (seen.has(el)) continue; seen.add(el);
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
    const s = {}; for (const p of props) s[p] = cs.getPropertyValue(p);
    out.push({ tag: el.tagName.toLowerCase(), id: el.id, cls: (el.getAttribute('class') || '').slice(0, 160), text: own.slice(0, 80),
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(H - r.bottom), right: Math.round(W - r.right) }, style: s });
  }
  return { w: W, h: H, items: out };
})()`;

async function until(page, expr, ms = 8000) {
    for (let t = 0; t < ms; t += 50) { if (await page.eval(expr)) return true; await sleep(50); }
    return false;
}
const center = (page, sel) => page.eval(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => e.getBoundingClientRect().width > 0); if (!e) return null; const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()`);

(async () => {
    const report = {};
    for (const [w, h] of SIZES) {
        const mobile = w < 1000;
        const { page, close } = await launch({ w, h, timeout: 300000, args: ['--ignore-gpu-blocklist', '--mute-audio', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
        const out = (n) => path.join(OUT, `${w}x${h}${n ? '-' + n : ''}.png`);
        await page.send('Browser.grantPermissions', { origin: 'http://localhost:3010', permissions: ['videoCapture'] }).catch(() => {});
        if (w < 700) await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
        const mouse = (x, y) => page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
        const click = async (x, y) => {
            if (w < 700) {
                await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
                await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
                return;
            }
            await mouse(x, y);
            await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
            await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
        };
        await page.goto(BASE + 'contact.html');
        await until(page, `!!(window.__calendarContact && __calendarContact.ready())`, 20000);
        await until(page, `!!document.querySelector('.ss-gate.is-in')`, 4000);
        await sleep(700);
        const g = await center(page, '.ss-gate [data-sound="0"]');
        if (g) await click(g[0], g[1]);
        const P = await page.eval(`__calendarContact.P`), LOOP = await page.eval(`__calendarContact.LOOP`);
        const fr = (f) => P.dance + (f + 0.5) / 30;
        await page.eval(`__calendarContact.freeze(${fr(200)})`);
        if (!mobile) await mouse(4, Math.round(h * 0.5));
        await sleep(3200);
        await page.shot(out(''));
        fs.writeFileSync(path.join(OUT, `styles-${w}x${h}.json`), JSON.stringify(await page.eval(EXTRACT), null, 1));
        const fonts = await page.eval(`(async () => { await document.fonts.ready; return { suisseB: document.fonts.check('700 40px SuisseBPIntl'), suisse: document.fonts.check('400 20px SuisseBPIntl'), mono: document.fonts.check('500 10px Sometype'), label: document.querySelector('.gc-label').textContent, h1: document.getElementById('gcHead').getBoundingClientRect().toJSON() }; })()`);
        console.log(w, 'fonts', JSON.stringify(fonts));

        if (!mobile) {
            for (const [name, sel] of [['hover-start', '.gc-btn--d:nth-child(1)'], ['hover-call', '.gc-btn--d:nth-child(2)'], ['hover-card', '#gcCard']]) {
                const c = await center(page, sel);
                await mouse(c[0] - 40, c[1] - 30);
                await sleep(120);
                await mouse(c[0], c[1]);
                await sleep(700);
                await page.shot(out(name));
                console.log(w, name, 'tip', JSON.stringify(await page.eval(`[document.getElementById('gcTip').classList.contains('is-on'), document.getElementById('gcTip').textContent, document.getElementById('gcTip').firstChild.getBoundingClientRect().toJSON()]`)));
            }
            await mouse(4, Math.round(h * 0.5));
            await sleep(600);
            const s = await center(page, '#gcSet .gc-panel__head');
            await click(s[0], s[1]);
            await sleep(600);
            const lt = await center(page, '[data-theme-set="light"]');
            await click(lt[0], lt[1]);
            await mouse(4, Math.round(h * 0.5));
            await sleep(900);
            await page.shot(out('light'));
            const dk = await center(page, '[data-theme-set="dark"]');
            await click(dk[0], dk[1]);
            await click(s[0], s[1]);
            await mouse(4, Math.round(h * 0.5));
            await sleep(700);
        }
        // camera mode
        const b = await center(page, mobile ? '.gc-cam-m' : '#gcBook');
        await click(b[0], b[1]);
        await until(page, `__invite.state === 'live' || __invite.state === 'count'`, 8000);
        await page.eval(`__calendarContact.freeze(null)`);
        await sleep(1400);
        await page.shot(out('cam-live'));
        const booked = await until(page, `__invite.state === 'booked'`, 12000);
        await sleep(700);
        await page.shot(out('cam-booked'));
        console.log(w, 'camera', JSON.stringify({ booked, state: await page.eval('__invite.state'), tracks: await page.eval('__invite.liveTracks'), cam: await page.eval('__invite.cam') }));
        const bk = await center(page, '#gcBack');
        await click(bk[0], bk[1]);
        await sleep(1600);
        await page.shot(out('back'));
        console.log(w, 'after back', JSON.stringify({ cam: await page.eval('__invite.cam'), state: await page.eval('__invite.state') }));

        if (PERF) {
            await page.eval(`__calendarContact.freeze(null)`);
            await mouse(5, 5);
            await page.eval(`__calendarContact.perfReset()`);
            await sleep(LOOP * 1000 + 500);
            const perf = await page.eval(`__calendarContact.perf()`);
            console.log(w, 'perf over a full cycle', JSON.stringify(perf));
            report[w] = { perf };
        }
        report[w] = { ...(report[w] || {}), errors: page.errors };
        console.log(w, 'errors', JSON.stringify(page.errors));
        await close();
    }
    fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(report, null, 1));
    process.exit(0);
})();
