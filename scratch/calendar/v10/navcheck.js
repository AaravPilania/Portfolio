// HEADFUL=1 node scratch/calendar/v10/navcheck.js 1366 768 -> opens / closes the contact nav by real clicks and Esc, logs state
const path = require('path');
const { launch, sleep } = require('../v4/cdp.js');
const [w, h] = [Number(process.argv[2] || 1366), Number(process.argv[3] || 768)];

(async () => {
    const { page, close } = await launch({ w, h, args: ['--ignore-gpu-blocklist', '--mute-audio'] });
    await page.goto('http://localhost:3010/contact.html?gate=0');
    await sleep(3000);
    const click = async (sel) => {
        const [x, y] = await page.eval(`(() => { const b = document.querySelector('${sel}').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()`);
        const top = await page.eval(`(() => { const e = document.elementFromPoint(${x}, ${y}); return e ? e.tagName + '.' + e.className : null; })()`);
        await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
        await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
        await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
        return [Math.round(x), Math.round(y), top];
    };
    const st = () => page.eval(`document.querySelector('.ap-nav__burger').getAttribute('aria-expanded')`);
    for (let i = 0; i < 3; i++) {
        console.log('click', JSON.stringify(await click('.ap-nav__burger')));
        await sleep(1000);
        console.log('open?', await st());
        if (i === 0) await page.shot(path.join(__dirname, `${w}-nav-open.png`));
        await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await sleep(800);
        console.log('after esc', await st());
    }
    console.log('errors', JSON.stringify(page.errors));
    await close();
    process.exit(0);
})();
