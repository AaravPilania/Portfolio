// HEADFUL=1 node scratch/calendar/v13/probe.js W H "<expr>" -> evaluates expr on our contact page after the gate
const { launch, sleep } = require('../v4/cdp.js');
const [w, h, expr] = [+process.argv[2] || 1920, +process.argv[3] || 1080, process.argv[4]];
(async () => {
    const { page, close } = await launch({ w, h, timeout: 120000, args: ['--ignore-gpu-blocklist', '--mute-audio'] });
    await page.goto('http://localhost:3010/contact.html');
    for (let t = 0; t < 20000 && !(await page.eval('!!(window.__calendarContact && __calendarContact.ready())')); t += 100) await sleep(100);
    await sleep(800);
    await page.eval(`document.querySelector('.ss-gate [data-sound="0"]').click()`);
    await sleep(3000);
    console.log(JSON.stringify(await page.eval(expr), null, 1));
    console.log('errors', JSON.stringify(page.errors));
    await close();
    process.exit(0);
})();
