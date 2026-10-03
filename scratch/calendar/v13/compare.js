// node scratch/calendar/v13/compare.js -> diff.md (theirs vs ours per element, all sizes) + compare/WxH.png side-by-sides
// with alignment guides (magenta = their box edges, cyan = ours) drawn across both panes.
const path = require('path');
const fs = require('fs');
const { launch } = require('../v4/cdp.js');

const SIZES = [[1920, 1080], [1366, 768], [390, 844]];
const D = __dirname;
fs.mkdirSync(path.join(D, 'compare'), { recursive: true });

const vis = (i) => i.style.opacity !== '0' && i.rect.y >= 0 && i.rect.y < 4000 && i.rect.x >= 0;
const has = (s) => (i) => (i.cls || '').includes(s);
const txt = (re) => (i) => re.test(i.text);
const and = (...f) => (i) => f.every((g) => g(i));
const nth = (n, ...f) => (items) => items.filter((i) => vis(i) && and(...f)(i))[n];
const first = (...f) => nth(0, ...f);
const widest = (...f) => (items) => items.filter((i) => vis(i) && and(...f)(i)).sort((a, b) => b.rect.w - a.rect.w)[0];
const low = (H) => (i) => i.rect.y > H * 0.45;

const PAIRS = (W, H) => [
    ['Header pill', first(has('max-w-[calc(438')), first(has('ap-nav__bar'))],
    ['Header message', first(has('js-animation-target'), (i) => i.rect.y < 80 && i.text), first(has('gc-m__live'), (i) => i.rect.y < 80)],
    ['Headline', first(has('js-contact-title')), first((i) => i.id === 'gcHead')],
    ['Headline line 1', first(txt(/^Brief$/), (i) => i.rect.x < W / 2), first(has('gc-l'), txt(/^Brief me/))],
    ['Avatar card', first(has('js-contact-card')), first((i) => i.id === 'gcCard')],
    ['Card text', first(has('js-animation-target'), txt(/^\+31 20 6220440/)), first(has('gc-m__live'), txt(/gmail/), (i) => i.rect.h < 30)],
    ['[ Get in touch ] label', first(has('js-animation-target'), txt(/get in touch/i), (i) => i.rect.x < W * 0.8 && i.rect.y > 200), first(has('gc-m__live'), txt(/get in touch/i))],
    ['Description', first(has('js-contact-description')), first(has('gc-lines'))],
    ['Description line 1', first(txt(/^Nieuwe$/)), first(has('gc-l'), txt(/^New Delhi/))],
    ['Button 1', first(has('ll-part--buttons-button'), low(H)), first(has('gc-btn'), (i) => /gc-btn--[dm]/.test(i.cls))],
    ['Button 2', nth(1, has('ll-part--buttons-button'), low(H)), nth(1, has('gc-btn'), (i) => /gc-btn--[dm]/.test(i.cls))],
    ['Button 1 text', first(has('js-animation-target'), low(H), (i) => /start a project|\+31 20 622 0440/i.test(i.text)), first(has('gc-m__live'), low(H), (i) => /start a project|@aaravpilania/i.test(i.text))],
    ['Footer col 1', first(has('js-animation-target'), txt(/20\+ digital freaks/i)), first(has('gc-m__live'), txt(/one creative developer/i))],
    ['Footer "Follow / Elsewhere"', first(has('js-animation-target'), txt(/^follow us$/i), (i) => i.rect.y > H * 0.9), first(has('gc-m__live'), txt(/^elsewhere$/i), (i) => i.rect.y > H * 0.9)],
    ['Follow row label (mobile)', first(has('js-animation-target'), txt(/follow us/i), (i) => i.rect.y < H * 0.9 && i.rect.y > H * 0.5), first(has('gc-m__live'), txt(/elsewhere/i), (i) => i.rect.y < H * 0.9 && i.rect.y > H * 0.5)],
    ['Booth panel', first(has('sticky top-0 w-[calc(160')), first(has('gc-panel--booth'))],
    ['Booth title', first(has('pb-0.5'), txt(/join in our dna/i)), first(txt(/^Join the calendar$/))],
    ['Booth button', widest(txt(/activate camera/i), has('js-animation-target')), widest((i) => i.id === 'gcBook' || has('gc-cam-m')(i))],
    ['Settings title', first(has('pb-0.5'), txt(/grid settings/i)), first(txt(/^Calendar settings$/))],
];
const KEYS = ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'color', 'background-color', 'border-top', 'border-radius', 'padding'];
const short = (k, v) => (k === 'font-family' ? v.split(',')[0].replace(/"/g, '') : v);
const r = (i) => (i ? `${i.rect.x},${i.rect.y} ${i.rect.w}×${i.rect.h}` : '—');

let md = '# Contact v13 — style diff, lamalama.com/contact vs ours\n\nBoxes are CSS px at the viewport (x,y w×h). Style rows list only properties that differ; "=" means all compared properties match ('
    + KEYS.join(', ') + '). Text/fonts are SuisseBPIntl + Sometype on both.\n';
const guides = {};
for (const [W, H] of SIZES) {
    const T = require(`./ref/styles-${W}x${H}.json`).items, O = require(`./ours/styles-${W}x${H}.json`).items;
    md += `\n## ${W}×${H}\n\n| Element | Theirs box | Ours box | Δy / Δx | Style differences (theirs → ours) |\n|---|---|---|---|---|\n`;
    guides[W] = [];
    for (const [name, ft, fo] of PAIRS(W, H)) {
        const t = ft(T), o = fo(O);
        if (!t && !o) continue;
        const dd = t && o ? `${o.rect.y - t.rect.y} / ${o.rect.x - t.rect.x}` : '—';
        let diff = '—';
        if (t && o) {
            const ds = KEYS.filter((k) => short(k, t.style[k]) !== short(k, o.style[k])).map((k) => `${k}: ${short(k, t.style[k])} → ${short(k, o.style[k])}`);
            diff = ds.length ? ds.join('<br>') : '=';
        }
        md += `| ${name} | ${r(t)} | ${r(o)} | ${dd} | ${diff} |\n`;
        guides[W].push({ name, t: t && t.rect, o: o && o.rect });
    }
}
fs.writeFileSync(path.join(D, 'diff.md'), md);
console.log('diff.md written');

(async () => {
    const { page, close } = await launch({ w: 1200, h: 800, timeout: 120000 });
    for (const [W, H] of SIZES) {
        const a = 'data:image/png;base64,' + fs.readFileSync(path.join(D, 'ref', `${W}x${H}.png`)).toString('base64');
        const b = 'data:image/png;base64,' + fs.readFileSync(path.join(D, 'ours', `${W}x${H}.png`)).toString('base64');
        const url = await page.eval(`(async () => {
            const load = (s) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = s; });
            const [A, B] = await Promise.all([load(${JSON.stringify(a)}), load(${JSON.stringify(b)})]);
            const W = ${W}, H = ${H}, gap = Math.round(W * 0.02), head = Math.max(28, Math.round(W * 0.018));
            const c = document.createElement('canvas'); c.width = W * 2 + gap; c.height = H + head;
            const x = c.getContext('2d');
            x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
            x.drawImage(A, 0, head, W, H); x.drawImage(B, W + gap, head, W, H);
            x.font = '600 ' + Math.round(head * 0.5) + 'px monospace'; x.fillStyle = '#fff'; x.textBaseline = 'middle';
            x.fillText('THEIRS — lamalama.com/contact ' + W + '×' + H + '  (magenta = their edges)', 8, head / 2);
            x.fillText('OURS — /contact.html  (cyan = our edges)', W + gap + 8, head / 2);
            const lw = Math.max(1, W / 1200);
            const line = (col, x0, y0, x1, y1, dash) => { x.strokeStyle = col; x.lineWidth = lw; x.setLineDash(dash ? [6 * lw, 4 * lw] : []); x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); };
            for (const g of ${JSON.stringify(guides[W])}) {
                for (const [rc, col, dash] of [[g.t, 'rgba(255,0,200,.85)', false], [g.o, 'rgba(0,230,255,.85)', true]]) {
                    if (!rc) continue;
                    for (const yy of [rc.y, rc.y + rc.h]) line(col, 0, head + yy + .5, c.width, head + yy + .5, dash);
                    for (const off of [0, W + gap]) { line(col, off + rc.x + .5, head, off + rc.x + .5, head + H, dash); x.strokeRect(off + rc.x, head + rc.y, rc.w, rc.h); }
                }
            }
            return c.toDataURL('image/png');
        })()`);
        fs.writeFileSync(path.join(D, 'compare', `${W}x${H}.png`), Buffer.from(url.split(',')[1], 'base64'));
        console.log('compare', W);
    }
    await close();
    process.exit(0);
})();
