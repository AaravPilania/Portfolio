// node scratch/calendar/v10/nav-ref.js -> reference stills of the main site's header pill, closed and open, plus its computed styles
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('../v4/cdp.js');
const GL = process.env.HEADFUL ? ['--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

(async () => {
    for (const [w, h] of [[1920, 1080], [390, 844]]) {
        const { page, close } = await launch({ w, h, args: GL, timeout: 200000 });
        await page.goto('http://localhost:3010/index.html');
        await sleep(14000);
        await page.shot(path.join(__dirname, `navref-${w}-closed.png`));
        const info = await page.eval(`(() => {
            const m = document.querySelector('.js-menu'); if (!m) return null;
            const r = m.getBoundingClientRect(), cs = getComputedStyle(m);
            const msg = document.querySelector('.js-header-message-container');
            const items = [...document.querySelectorAll('.js-menu .js-nav-item, .js-menu .js-dropdown-toggle')].map((a) => ({ t: a.textContent.trim().replace(/\\s+/g, ' '), href: a.getAttribute('href') }));
            const bg = m.firstElementChild, bcs = getComputedStyle(bg);
            const tog = document.querySelector('.js-menu-toggle-button');
            return { rect: [r.x, r.y, r.width, r.height], cls: m.className, color: cs.color, bg: bcs.backgroundColor, bgOpacity: bcs.opacity, blur: cs.backdropFilter, radius: cs.borderRadius, z: cs.zIndex,
                msg: msg && msg.textContent.trim(), msgFont: msg && getComputedStyle(msg).fontFamily, items, togRect: tog && tog.getBoundingClientRect().toJSON() };
        })()`);
        console.log(w, JSON.stringify(info, null, 1));
        await page.eval(`document.querySelector('.js-menu-toggle-button') && document.querySelector('.js-menu-toggle-button').click()`);
        await sleep(1500);
        await page.shot(path.join(__dirname, `navref-${w}-open.png`));
        const open = await page.eval(`(() => { const m = document.querySelector('.js-menu'); const r = m.getBoundingClientRect(); return [r.height, [...m.querySelectorAll('.js-text')].map(e => e.textContent.trim() + ' ' + e.style.clipPath).slice(0,8)]; })()`);
        console.log(w, 'open', JSON.stringify(open));
        console.log('errors', page.errors.length);
        await close();
    }
    process.exit(0);
})();


