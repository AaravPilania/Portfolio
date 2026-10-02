// HEADFUL=1 node scratch/calendar/v9/perf.js -> at 1920x1080 on the GPU: rAF deltas and per-frame cost (calendar render +
// grain) over one full 21 s loop with the pointer circling the grid the whole time (trail always live, beat puffs on),
// then 8 s of camera mode at Fine with the trail still live; at rest (no pointer) for comparison; audio clock state.
const path = require('path');
const os = require('os');
const { launch, sleep } = require('../v4/cdp.js');

const CAM = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-video-capture=' + path.join(os.tmpdir(), 'cal-fakecam.y4m')];
(async () => {
    const { page, close } = await launch({ w: 1920, h: 1080, args: ['--ignore-gpu-blocklist', ...CAM], timeout: 200000 });
    await page.goto('http://localhost:3010/contact.html');
    for (let i = 0; i < 60; i++) { await sleep(250); if (await page.eval(`!!(window.__calendarContact && __calendarContact.ready())`)) break; }
    await sleep(1500);
    const read = () => page.eval(`({ cal: __calendarContact.perf(), grain: CalendarGrain.perf(), active: CalendarGrain.active })`);
    const reset = () => page.eval(`__calendarContact.perfReset(); CalendarGrain.perfReset()`);
    let stop = false;
    const circle = async () => {
        let a = 0;
        while (!stop) {
            a += 0.09;
            await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 960 + Math.cos(a) * 520, y: 540 + Math.sin(a * 1.3) * 330 });
            await sleep(12);
        }
    };

    await reset();
    await sleep(8000);
    console.log('rest 8s', JSON.stringify(await read()));

    await reset();
    const mover = circle();
    await sleep(21500);
    console.log('trail, full loop', JSON.stringify(await read()));

    await page.eval(`document.getElementById('gcCamGo').click()`);
    for (let i = 0; i < 40; i++) { await sleep(100); if (await page.eval(`document.body.classList.contains('is-cam')`)) break; }
    await sleep(1000);
    await reset();
    await sleep(8000);
    console.log('camera fine + trail', JSON.stringify(await read()), JSON.stringify(await page.eval(`__calendarContact.cam()`)));
    await page.eval(`document.querySelector('[data-cell="1"]').click()`);
    await sleep(1000);
    await reset();
    await sleep(6000);
    console.log('camera mid + trail', JSON.stringify(await read()));
    stop = true;
    await mover;
    await page.eval(`document.getElementById('gcBack').click()`);
    await sleep(2500);
    console.log('audio', JSON.stringify(await page.eval(`({ running: CalendarAudio.isRunning(), loop: CalendarAudio.loopLength(), t: __calendarContact.time(), drift: (() => { const n = performance.now(); const a = CalendarAudio.timeAt(n); return a === null ? null : +(((a % __calendarContact.LOOP) + __calendarContact.LOOP) % __calendarContact.LOOP - __calendarContact.time()).toFixed(4); })() })`)));
    console.log('gl', await page.eval(`(() => { const g = document.querySelector('.gc-grain').getContext('webgl2'); const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'n/a'; })()`));
    console.log('errors', JSON.stringify(page.errors));
    await close();
    process.exit(0);
})();
