// node measure.js [w h] -> autoplaying contact.html for SECS (default 46 s, two loop seams). Every rAF records the drawn
// scene key and the audio clock at that rAF's timestamp. Reports: dance step cadence (vsyncs between steps), each
// step's timing error against its ideal audio time T.dance + k/30, the same for every beat-grid state change, loop wraps
// and the scene order across them, rAF / draw percentiles, console errors.
const { launch, sleep } = require('./cdp');
const W = +process.argv[2] || 1920, H = +process.argv[3] || 1080, SECS = +(process.env.SECS || 46);
(async () => {
    const { page, close } = await launch({ w: W, h: H, timeout: (SECS + 90) * 1000 });
    await page.goto('http://localhost:3010/contact.html');
    for (let i = 0; i < 80; i++) { await sleep(250); if (await page.eval(`!!(window.__calendarContact && __calendarContact.ready() && CalendarAudio.isRunning())`)) break; }
    console.log('ready', await page.eval(`__calendarContact.ready()`), 'audio running', await page.eval(`CalendarAudio.isRunning()`), 'ctx rate', await page.eval(`(() => { try { return CalendarAudio.isRunning() && 44100; } catch (e) { return null; } })()`));
    await sleep(500);
    await page.eval(`__calendarContact.perfReset()`);
    const rec = await page.eval(`new Promise((res) => { const out = []; const end = performance.now() + ${SECS * 1000}; const L = __calendarContact.LOOP;
        const f = (ts) => { const a = CalendarAudio.timeAt(ts); out.push([ts, a, __calendarContact.drawn()]); if (ts < end) requestAnimationFrame(f); else res(out); };
        requestAnimationFrame(f); })`);
    const P = await page.eval(`__calendarContact.P`), LOOP = await page.eval(`__calendarContact.LOOP`), BEAT = await page.eval(`__calendarContact.BEAT`);
    const perf = await page.eval(`__calendarContact.perf()`);
    const mode = (k) => Math.floor(k / 10000 / 16 / 10), arg = (k) => k % 10000;
    // dance cadence and timing
    const gaps = [], errs = [], stateErrs = [];
    let lastStepI = -1, wraps = 0, prevA = null;
    const seq = [];
    const boundaries = Object.values(P).filter((v) => typeof v === 'number').sort((a, b) => a - b);
    for (let i = 1; i < rec.length; i++) {
        const [ts, a, k] = rec[i], [, a0, k0] = rec[i - 1];
        if (a === null) continue;
        const t = ((a % LOOP) + LOOP) % LOOP;
        if (prevA !== null && t < prevA - 5) { wraps++; console.log('wrap at raw audio', a.toFixed(4), 'from', prevA.toFixed(4), 'to', t.toFixed(4)); }
        if (prevA !== null && t < prevA && t > prevA - 5) console.log('clock went backwards', prevA, t);
        prevA = t;
        const m = ['week', 'empty', 'text', 'dance', 'weekgrid'][mode(k)];
        if (seq[seq.length - 1] !== m) seq.push(m);
        if (k === k0) continue;
        if (mode(k) === 3 && mode(k0) === 3 && arg(k) !== arg(k0)) {
            const ideal = P.dance + arg(k) / 30;
            errs.push((t - ideal) * 1000);
            if (lastStepI >= 0) gaps.push(i - lastStepI);
            lastStepI = i;
        } else {
            // a beat-grid state change: nearest boundary or sub-step (32nd / 16th notes) at or before t
            const grid = BEAT / 8;
            const near = Math.round(t / grid) * grid;
            stateErrs.push((t - near) * 1000);
        }
    }
    const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(2); };
    const hist = {}; gaps.forEach((g) => { hist[g] = (hist[g] || 0) + 1; });
    const dts = rec.slice(1).map((r, i) => r[0] - rec[i][0]);
    console.log('frames', rec.length, 'rAF interval p50', pct(dts, 0.5), 'p95', pct(dts, 0.95), 'max', pct(dts, 1));
    console.log('dance steps', errs.length, 'vsyncs between steps', JSON.stringify(hist));
    console.log('dance step error vs audio (ms): min', pct(errs, 0), 'p5', pct(errs, 0.05), 'p50', pct(errs, 0.5), 'p95', pct(errs, 0.95), 'max', pct(errs, 1),
        ' |err|<=10ms', (errs.filter((e) => Math.abs(e) <= 10).length / errs.length * 100).toFixed(1) + '%');
    console.log('beat-grid state changes', stateErrs.length, 'error vs 32nd grid (ms): min', pct(stateErrs, 0), 'p50', pct(stateErrs, 0.5), 'max', pct(stateErrs, 1));
    console.log('loop wraps', wraps, 'scene order', seq.join(' > '));
    console.log('page perf', JSON.stringify(perf));
    console.log(page.errors.length ? 'errors:\n  ' + page.errors.join('\n  ') : 'errors: none');
    await close();
    process.exit(0);
})();
