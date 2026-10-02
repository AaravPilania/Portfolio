// node scratch/calendar/v9/check.js -> reduced motion (pointer moves and beats paint nothing), camera permission denied,
// and no camera at all: the chip's message, no camera mode, no live tracks, console errors.
const path = require('path');
const { launch, sleep } = require('../v4/cdp.js');

const GL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const ready = async (page) => { for (let i = 0; i < 80; i++) { await sleep(250); if (await page.eval(`!!(window.__calendarContact && __calendarContact.ready())`)) return; } };

(async () => {
    {
        const { page, close } = await launch({ w: 1920, h: 1080, args: GL });
        await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
        await page.goto('http://localhost:3010/contact.html');
        await ready(page);
        await sleep(1000);
        let shown = 0;
        for (let i = 0; i < 40; i++) {
            await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 400 + i * 25, y: 300 + i * 10 });
            await sleep(16);
            if (await page.eval(`CalendarGrain.active`)) shown++;
        }
        await page.eval(`__calendarContact.puff(__calendarContact.P.dance + 6)`);
        await sleep(200);
        console.log('reduced motion', JSON.stringify({ trail: await page.eval(`CalendarGrain.trail`), framesShown: shown, afterPuff: await page.eval(`CalendarGrain.active`) }));
        await page.shot(path.join(__dirname, '1920-reduced.png'));
        console.log('errors', JSON.stringify(page.errors));
        await close();
    }
    {
        const { page, close } = await launch({ w: 1920, h: 1080, args: [...GL, '--use-fake-device-for-media-stream'] });
        await page.send('Browser.setPermission', { permission: { name: 'videoCapture' }, setting: 'denied', origin: 'http://localhost:3010' });
        await page.goto('http://localhost:3010/contact.html');
        await ready(page);
        await page.eval(`document.getElementById('gcCamGo').click()`);
        await sleep(1500);
        console.log('denied', JSON.stringify(await page.eval(`({ msg: document.getElementById('gcCamMsg').textContent, hidden: document.getElementById('gcCamMsg').hidden, cam: __calendarContact.cam().on, label: document.querySelector('.gc-cam__label').textContent, live: CalendarCamera.liveTracks })`)));
        await page.shot(path.join(__dirname, '1920-denied.png'));
        console.log('errors', JSON.stringify(page.errors));
        await close();
    }
    {
        const { page, close } = await launch({ w: 390, h: 844, args: [...GL, '--use-fake-ui-for-media-stream'] });
        // headless Chrome always offers a virtual camera; a machine without one rejects like this
        await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Requested device not found', 'NotFoundError'));` });
        await page.goto('http://localhost:3010/contact.html');
        await ready(page);
        await page.eval(`document.getElementById('gcCamGo').click()`);
        await sleep(1500);
        console.log('no camera', JSON.stringify(await page.eval(`({ msg: document.getElementById('gcCamMsg').textContent, hidden: document.getElementById('gcCamMsg').hidden, cam: __calendarContact.cam().on, devices: 0 })`)));
        await page.shot(path.join(__dirname, '390-nocamera.png'));
        console.log('errors', JSON.stringify(page.errors));
        await close();
    }
    process.exit(0);
})();
