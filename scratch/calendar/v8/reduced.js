// node scratch/calendar/v8/reduced.js -> scratch/calendar/v8/grain-1920-reduced.png with prefers-reduced-motion, grain on
const path = require('path');
const { launch, sleep } = require('../v4/cdp.js');

(async () => {
    const { page, close } = await launch({ w: 1920, h: 1080, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await page.goto('http://localhost:3010/contact.html');
    await sleep(4000);
    const a = await page.eval(`CalendarGrain.perf().draws`);
    await sleep(2000);
    const b = await page.eval(`CalendarGrain.perf().draws`);
    await page.shot(path.join(__dirname, 'grain-1920-reduced.png'));
    console.log('grain draws', a, '->', b, 'scene', await page.eval(`__calendarContact.scene(__calendarContact.P.textFull)`), 'errors', JSON.stringify(page.errors));
    await close();
    process.exit(0);
})();
