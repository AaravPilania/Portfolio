// node scratch/main-v12/probe.js "<js expression returning JSON-able>" [w h] -> evaluates on the loaded page
const { open } = require('../footer-signature/site.js');
const W = +process.argv[3] || 1920, H = +process.argv[4] || 1080;
(async () => {
    const { page, close } = await open(W, H, { settle: 4000 });
    console.log(await page.eval(`(async () => JSON.stringify(await (async () => { ${process.argv[2]} })()))()`));
    await close();
    process.exit(0);
})();
