// HEADFUL=1 node scratch/calendar/v11/shoot.js [1920,390] -> stills into scratch/calendar/v11/ at the dance's key
// moments (frozen with __calendarContact.freeze), the gate, a pointer ink trail, a check that no grain appears without
// pointer movement through the whole dance, rAF perf over a live cycle, console errors.
const path = require('path');
const { launch, sleep } = require('../v4/cdp.js');

const ALL = [[1920, 1080], [390, 844]];
const pick = process.argv[2] && /\d/.test(process.argv[2]) ? process.argv[2].split(',').map(Number) : null;
const SIZES = pick ? ALL.filter(([w]) => pick.includes(w)) : ALL;
const GL = process.env.HEADFUL ? ['--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const BASE = 'http://localhost:3010/';

async function until(page, expr, ms = 8000) {
    for (let t = 0; t < ms; t += 50) { if (await page.eval(expr)) return true; await sleep(50); }
    return false;
}

(async () => {
    for (const [w, h] of SIZES) {
        const mobile = w < 700;
        const { page, close } = await launch({ w, h, args: [...GL, '--mute-audio'], timeout: 300000 });
        const out = (n) => path.join(__dirname, `${w}-${n}.png`);
        if (mobile) await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
        await page.goto(BASE + 'contact.html');
        await until(page, `!!(window.__calendarContact && __calendarContact.ready())`, 20000);
        await until(page, `!!document.querySelector('.ss-gate.is-in')`, 4000);
        await sleep(900);
        await page.shot(out('gate'));
        console.log(w, 'gate text', JSON.stringify(await page.eval(`document.querySelector('.ss-gate') && document.querySelector('.ss-gate').innerText.replace(/\\s+/g, ' ').slice(0, 220)`)));
        const r = await page.eval(`(() => { const b = document.querySelector('.ss-gate [data-sound="0"]').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()`);
        await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r[0], y: r[1] });
        await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r[0], y: r[1], button: 'left', clickCount: 1 });
        await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r[0], y: r[1], button: 'left', clickCount: 1 });
        await sleep(1500);

        const P = await page.eval(`__calendarContact.P`), BEAT = await page.eval(`__calendarContact.BEAT`), LOOP = await page.eval(`__calendarContact.LOOP`);
        const n = await page.eval(`__calendarContact.frames()`);
        console.log(w, 'loop', LOOP.toFixed(4), 'beat', BEAT.toFixed(5), 'frames', n, 'dance', (P.dance / BEAT).toFixed(2), 'dissolve', (P.dissolve / BEAT).toFixed(2), 'outro', (P.outro / BEAT).toFixed(2));
        const fr = (f) => P.dance + (f + 0.5) / 30;
        const shots = [
            ['a-start', fr(8)], ['b-repeat-before', fr(62)], ['c-repeat-after', fr(70)], ['d-mid', fr(200)], ['e-continuation', fr(400)],
            ['f-cut-before', fr(471)], ['g-ext-1', fr(476)], ['h-ext-2', fr(510)], ['i-ext-3', fr(545)], ['j-final-pose', 56.5 * BEAT],
            ['k-disappear-1', 58.6 * BEAT], ['l-disappear-2', 59.4 * BEAT], ['m-week', 62 * BEAT],
        ];
        // park the pointer away and let any ink dry before the stills
        await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 2, y: 2 });
        await sleep(2000);
        for (const [name, t] of shots) {
            await page.eval(`__calendarContact.freeze(${t})`);
            await sleep(350);
            await page.shot(out(name));
            console.log(w, name, 't', t.toFixed(3), 'beat', (t / BEAT).toFixed(2), await page.eval(`__calendarContact.scene(${t})`));
        }
        await page.eval(`__calendarContact.freeze(null)`);

        // no pointer for a whole dance: the grain canvas must stay hidden (no puffs or ripples from the dancer)
        const dt = await page.eval(`(() => { const t = __calendarContact.time(); return t; })()`);
        const toDance = ((P.dance - dt) % LOOP + LOOP) % LOOP;
        await sleep(toDance * 1000 + 200);
        const seen = await page.eval(`new Promise((res) => { let shown = 0, frames = 0; const end = performance.now() + ${((P.dissolve - P.dance) * 1000 + 500).toFixed(0)};
            const f = (ts) => { frames++; if (CalendarGrain.active || getComputedStyle(document.querySelector('.gc-grain') || document.body).visibility === 'visible' && document.querySelector('.gc-grain')) shown++; if (ts < end) requestAnimationFrame(f); else res({ frames, shown, scene: __calendarContact.scene(__calendarContact.time()) }); };
            requestAnimationFrame(f); })`);
        console.log(w, 'dance without pointer: frames', seen.frames, 'grain visible on', seen.shown, 'ended at', seen.scene);

        // pointer ink over the dancer mid-extension
        await page.eval(`__calendarContact.freeze(${fr(520)})`);
        await sleep(400);
        const N = 26, pts = [];
        for (let i = 0; i <= N; i++) { const k = i / N; pts.push([w * (0.2 + 0.6 * k), h * (0.35 + Math.sin(k * Math.PI) * 0.3)]); }
        if (mobile) {
            await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0][0], y: pts[0][1], id: 1 }] });
            for (let i = 1; i <= N; i++) { await page.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: pts[i][0], y: pts[i][1], id: 1 }] }); await sleep(16); if (i === 20) await page.shot(out('trail')); }
            await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        } else {
            for (let i = 0; i <= N; i++) { await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pts[i][0], y: pts[i][1] }); await sleep(16); if (i === 20) await page.shot(out('trail')); }
        }
        console.log(w, 'grain while drawing', await page.eval(`CalendarGrain.active`));
        await sleep(2200);
        console.log(w, 'grain 2.2 s after the pointer stops', await page.eval(`CalendarGrain.active`));
        await page.eval(`__calendarContact.freeze(null)`);

        await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
        await page.eval(`__calendarContact.perfReset()`);
        await sleep(LOOP * 1000 + 500);
        console.log(w, 'perf over a full cycle', JSON.stringify(await page.eval(`__calendarContact.perf()`)));
        console.log(w, 'errors', JSON.stringify(page.errors));
        await close();
    }
    process.exit(0);
})();
