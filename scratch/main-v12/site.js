// Shared helpers for the footer-signature checks: open localhost:3010 and glide the Lenis scroller like a wheel would
const { launch, sleep } = require('./cdp.js');

async function open(w, h, opts = {}) {
    const { page, close } = await launch({ w, h, timeout: opts.timeout || 420000, args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
    if (opts.rm) await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    if (w < 700) await page.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await page.goto('http://localhost:' + (process.env.PORT || 3010) + '/' + (opts.query || ''));
    for (let i = 0; i < 90; i++) {
        await sleep(500);
        if (await page.eval(`!!document.querySelector('.js-scroller') && !!window.__workTogether && typeof window.__pixelBugLeash === 'function'`)) break;
    }
    await sleep(opts.settle || 3500);
    const geo = async () => JSON.parse(await page.eval(`(() => {
        const sc = document.querySelector('.js-scroller'), s = sc.getBoundingClientRect(), y = sc.scrollTop;
        const top = (q) => { const el = document.querySelector(q); if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top - s.top + y), h: Math.round(r.height) }; };
        return JSON.stringify({ services: top('.ll-section--services'), together: top('.ll-section--together'), footer: top('.sig-footer'), H: sc.clientHeight, max: sc.scrollHeight - sc.clientHeight, y });
    })()`));
    const y = () => page.eval(`document.querySelector('.js-scroller').scrollTop`);
    const set = (v) => page.eval(`(() => { const sc = document.querySelector('.js-scroller'); if (window.lenis && window.lenis.scrollTo) window.lenis.scrollTo(${Math.round(v)}, { immediate: true, force: true }); sc.scrollTop = ${Math.round(v)}; return sc.scrollTop; })()`);
    const glide = async (target, stepFrac = 0.35, pause = 70) => {
        const H = (await geo()).H;
        const from = await y();
        const n = Math.max(1, Math.ceil(Math.abs(target - from) / (H * stepFrac)));
        for (let k = 1; k <= n; k++) { await set(from + (target - from) * k / n); await sleep(pause); }
    };
    return { page, close, geo, y, set, glide, sleep };
}

module.exports = { open, sleep };
