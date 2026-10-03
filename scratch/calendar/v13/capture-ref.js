// HEADFUL=1 node scratch/calendar/v13/capture-ref.js [w] [h] [url] [tag]
// Settled screenshot + computed styles of every visible UI element (header, contact section, sticky panels, tooltip).
const fs = require('fs');
const path = require('path');
const { launch, sleep } = require('../v4/cdp.js');

const W = +(process.argv[2] || 1920), H = +(process.argv[3] || 1080);
const URL = process.argv[4] || 'https://lamalama.com/contact';
const TAG = process.argv[5] || 'ref';
const OUT = path.join(__dirname, TAG === 'ref' ? 'ref' : 'ours');
fs.mkdirSync(OUT, { recursive: true });

const EXTRACT = `(() => {
  const props = ['font-family','font-size','font-weight','line-height','letter-spacing','text-transform','color','background-color','border-top','border-radius','padding','opacity','z-index','position','gap','backdrop-filter','text-align','white-space'];
  const roots = [...document.querySelectorAll(${JSON.stringify(TAG === 'ref'
        ? 'header, .js-menu, section.ll-section--contact, .ll-block--sticky-item, [class*="sticky"], .js-tooltip, [class*=tooltip]'
        : '.ap-nav, .gc-contact, .gc-tip, .ss-toggle, .gc-booth-chip')})];
  const seen = new Set(), out = [];
  const W = innerWidth, H = innerHeight;
  for (const root of roots) for (const el of [root, ...root.querySelectorAll('*')]) {
    if (seen.has(el)) continue; seen.add(el);
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
    const leaf = own || ['IMG','SVG','svg','A','BUTTON','INPUT','CANVAS','VIDEO','H1','H2','P'].includes(el.tagName);
    const box = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.borderTopWidth !== '0px';
    if (!leaf && !box) continue;
    const s = {}; for (const p of props) s[p] = cs.getPropertyValue(p);
    out.push({ tag: el.tagName.toLowerCase(), cls: (el.getAttribute('class') || '').slice(0, 160), text: own.slice(0, 80),
      data: Object.fromEntries(Object.entries(el.dataset).filter(([k]) => /label|text|tip|cal/i.test(k)).map(([k, v]) => [k, String(v).slice(0, 200)])),
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        xvw: +(r.x / W * 100).toFixed(2), yvh: +(r.y / H * 100).toFixed(2), bottom: Math.round(H - r.bottom), right: Math.round(W - r.right) },
      style: s });
  }
  return { w: W, h: H, rootFont: getComputedStyle(document.documentElement).fontSize, items: out };
})()`;

(async () => {
    const { page, close } = await launch({ w: W, h: H, timeout: 300000, args: ['--ignore-gpu-blocklist'] });
    await page.goto(URL);
    const t0 = Date.now();
    const readySel = TAG === 'ref' ? '.js-contact-title' : '#gcHead';
    for (let i = 0; i < 400; i++) {
        await sleep(100);
        const op = await page.eval(`(() => { const t = document.querySelector('${readySel}'); return t ? +getComputedStyle(t).opacity : 0; })()`);
        if (op > 0.5) break;
    }
    console.log('ready', Date.now() - t0, 'ms');
    await sleep(TAG === 'ref' ? 4000 : 3500);
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 4, y: Math.round(H * 0.5) });
    await sleep(900);
    const shot = path.join(OUT, `${W}x${H}.png`);
    await page.shot(shot);
    const data = await page.eval(EXTRACT);
    fs.writeFileSync(path.join(OUT, `styles-${W}x${H}.json`), JSON.stringify(data, null, 1));
    if (TAG === 'ref') {
        const html = await page.eval(`(() => [...document.querySelectorAll('header, .js-menu, section.ll-section--contact')].map((e) => e.outerHTML).join('\\n\\n<!-- ======== -->\\n\\n'))()`);
        fs.writeFileSync(path.join(OUT, `dom-${W}x${H}.html`), html || '');
    }
    console.log('items', data && data.items.length, 'errors', JSON.stringify(page.errors.filter((e) => !/doubleclick|analytics|google|fathom|cloudfront/.test(e)).slice(0, 6)));
    await close();
    process.exit(0);
})();
