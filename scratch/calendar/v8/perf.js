// HEADFUL=1 node scratch/calendar/v8/perf.js [query] -> rAF deltas and per-frame cost (calendar render + grain
// upload/draw) over one full 21 s loop at 1920x1080, plus the grain's own cost and console errors.
const { launch, sleep } = require('../v4/cdp.js');

const query = process.argv[2] || '';
(async () => {
    const { page, close } = await launch({ w: 1920, h: 1080 });
    await page.goto('http://localhost:3010/contact.html' + query);
    for (let i = 0; i < 60; i++) { await sleep(250); if (await page.eval(`!!(window.__calendarContact && __calendarContact.ready())`)) break; }
    await sleep(1500);
    await page.eval(`__calendarContact.perfReset()`);
    await sleep(22000);
    const out = await page.eval(`({ cal: __calendarContact.perf(), grain: window.CalendarGrain ? CalendarGrain.perf() : null, on: !!(window.CalendarGrain && CalendarGrain.enabled), gl: (() => { const c = document.querySelector('.gc-grain'); if (!c) return null; const g = c.getContext('webgl2'); const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'n/a'; })() })`);
    console.log(query || '(default)', JSON.stringify(out));
    console.log('errors', JSON.stringify(page.errors));
    await close();
    process.exit(0);
})();
