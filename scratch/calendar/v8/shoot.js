// node scratch/calendar/v8/shoot.js [sizes] -> stills at text-full, dance-coarse, dance-mid and disappear-mid with the
// grain on and ?grain=0, for 1920x1080, 1366x768 and 390x844, into scratch/calendar/v8/<grain|plain>-<w>-<phase>.png,
// plus glyph letter boxes (plain), grain state and console errors.
const path = require('path');
const { launch, sleep } = require('../v4/cdp.js');

const ALL = [[1920, 1080], [1366, 768], [390, 844]];
const pick = process.argv[2] ? process.argv[2].split(',').map(Number) : null;
const SIZES = pick ? ALL.filter(([w]) => pick.includes(w)) : ALL;
const GL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

(async () => {
    for (const [w, h] of SIZES) {
        for (const mode of ['grain', 'plain']) {
            const { page, close } = await launch({ w, h, args: GL });
            await page.goto('http://localhost:3010/contact.html' + (mode === 'plain' ? '?grain=0' : ''));
            for (let i = 0; i < 60; i++) { await sleep(250); if (await page.eval(`!!(window.__calendarContact && __calendarContact.ready())`)) break; }
            await sleep(800);
            const P = await page.eval(`__calendarContact.P`);
            const phases = {
                'text-full': P.textFull + 0.4,
                'dance-coarse': (P.dance + P.refine3) / 2,
                'dance-mid': (P.fine + P.dissolve) / 2,
                'disappear-mid': P.dissolve + (P.outro - P.dissolve) * 0.45,
            };
            for (const [name, t] of Object.entries(phases)) {
                await page.eval(`__calendarContact.freeze(${t})`);
                await sleep(300);
                await page.shot(path.join(__dirname, `${mode}-${w}-${name}.png`));
            }
            console.log(w + 'x' + h, mode, 'grain', JSON.stringify(await page.eval(`({ on: !!(window.CalendarGrain && CalendarGrain.enabled), el: !!document.querySelector('.gc-grain'), left: document.querySelector('.gc-grain')?.style.left, gutter: getComputedStyle(document.documentElement).getPropertyValue('--gc-gutter') })`)));
            if (mode === 'plain') console.log(w + 'x' + h, 'scenes', JSON.stringify(await page.eval(`Object.fromEntries(${JSON.stringify(Object.entries(phases))}.map(([k, t]) => [k, __calendarContact.scene(t)]))`)));
            console.log(w + 'x' + h, mode, 'errors', JSON.stringify(page.errors));
            await close();
        }
    }
    process.exit(0);
})();
