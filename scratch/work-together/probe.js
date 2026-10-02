// node scratch/work-together/probe.js -> calls the engine's measure() directly and prints any thrown error plus page errors
const { launch, sleep } = require('../calendar/v4/cdp.js');
(async () => {
    const { page, close } = await launch({ w: 1920, h: 1080, timeout: 120000 });
    await page.goto('http://localhost:3010/');
    for (let i = 0; i < 60; i++) { await sleep(500); if (await page.eval(`!!window.__workTogether`)) break; }
    await sleep(2000);
    console.log(await page.eval(`(() => { try { window.__workTogether.measure(); return JSON.stringify(window.__workTogether.state()); } catch (e) { return 'THROW ' + e.stack; } })()`));
    console.log(page.errors.join('\n') || 'no page errors');
    await close();
    process.exit(0);
})();
