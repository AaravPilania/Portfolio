// HEADFUL=1 node scratch/calendar/v9/camprof.js -> camera mode at Fine, 1920x1080: piece counts and a CPU profile of
// 4 s, top self-time functions.
const path = require('path');
const os = require('os');
const { launch, sleep } = require('../v4/cdp.js');

const CAM = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-video-capture=' + path.join(os.tmpdir(), 'cal-fakecam.y4m')];
(async () => {
    const { page, close } = await launch({ w: 1920, h: 1080, args: ['--ignore-gpu-blocklist', ...CAM], timeout: 120000 });
    await page.goto('http://localhost:3010/contact.html');
    for (let i = 0; i < 60; i++) { await sleep(250); if (await page.eval(`!!(window.__calendarContact && __calendarContact.ready())`)) break; }
    await page.eval(`document.getElementById('gcCamGo').click()`);
    for (let i = 0; i < 40; i++) { await sleep(100); if (await page.eval(`document.body.classList.contains('is-cam')`)) break; }
    await sleep(1500);
    const n = []; for (let i = 0; i < 10; i++) { n.push(await page.eval(`__calendarContact.pieces()`)); await sleep(97); }
    console.log('pieces', n.join(' '));
    await page.send('Profiler.enable');
    await page.send('Profiler.setSamplingInterval', { interval: 200 });
    await page.send('Profiler.start');
    await sleep(4000);
    const { profile } = await page.send('Profiler.stop');
    const dt = profile.timeDeltas, self = new Map(), byId = new Map(profile.nodes.map((x) => [x.id, x]));
    for (let i = 0; i < profile.samples.length; i++) {
        const nd = byId.get(profile.samples[i]); const k = (nd.callFrame.functionName || '(anon)') + ':' + nd.callFrame.lineNumber;
        self.set(k, (self.get(k) || 0) + (dt[i] || 0) / 1000);
    }
    console.log([...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => k + ' ' + v.toFixed(0) + 'ms').join('\n'));
    await close();
    process.exit(0);
})();
