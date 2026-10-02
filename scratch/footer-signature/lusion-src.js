// node scratch/footer-signature/lusion-src.js -> downloads lusion.co's scripts into lusion-src/ and greps them for the
// "work together" sticker code (names, physics, spring and noise constants)
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'lusion-src');
fs.mkdirSync(OUT, { recursive: true });

const get = async (u) => { const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 Chrome/130' } }); return r.ok ? r.text() : ''; };
(async () => {
    const html = await get('https://lusion.co/');
    fs.writeFileSync(path.join(OUT, 'index.html'), html);
    const srcs = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|mjs))"/g)].map((m) => new URL(m[1], 'https://lusion.co/').href);
    const seen = new Set(srcs);
    const queue = [...srcs];
    while (queue.length) {
        const u = queue.shift();
        const js = await get(u);
        const name = u.split('/').pop().split('?')[0];
        fs.writeFileSync(path.join(OUT, name), js);
        console.log(name, js.length);
        for (const m of js.matchAll(/["'`](\.{0,2}\/?[\w/.-]+\.js)["'`]/g)) {
            try {
                const v = new URL(m[1], u).href;
                if (v.includes('lusion.co') && !seen.has(v)) { seen.add(v); queue.push(v); }
            } catch (e) { /* not a url */ }
        }
    }
})();
