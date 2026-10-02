// node scratch/footer-signature/lando-src.js -> landonorris.com HTML + scripts into lando-src/, then greps them for the
// signature (geometry type, draw-on uniform, scroll binding, material)
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'lando-src');
fs.mkdirSync(OUT, { recursive: true });
const get = async (u) => { try { const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36' } }); return r.ok ? r.text() : ''; } catch (e) { return ''; } };
(async () => {
    const base = 'https://landonorris.com/';
    const html = await get(base);
    fs.writeFileSync(path.join(OUT, 'index.html'), html);
    console.log('html', html.length);
    const srcs = [...html.matchAll(/(?:src|href)=["']([^"']+?\.(?:js|mjs|json|glb|gltf|svg))(?:\?[^"']*)?["']/g)].map((m) => new URL(m[1], base).href);
    const seen = new Set(srcs), queue = [...srcs];
    while (queue.length && seen.size < 200) {
        const u = queue.shift();
        if (!/\.(m?js)$/.test(u.split('?')[0])) { console.log('asset', u); continue; }
        const js = await get(u);
        const name = u.split('/').pop().split('?')[0];
        fs.writeFileSync(path.join(OUT, name), js);
        console.log(name, js.length);
        for (const m of js.matchAll(/["'`]((?:https?:)?\/?[\w/.@-]+\.(?:m?js))["'`]/g)) {
            try { const v = new URL(m[1], u).href; if (!seen.has(v) && /landonorris|webflow|cdn/.test(v)) { seen.add(v); queue.push(v); } } catch (e) { /* skip */ }
        }
    }
    for (const f of fs.readdirSync(OUT)) {
        const s = fs.readFileSync(path.join(OUT, f), 'utf8');
        for (const k of ['signature', 'Signature', 'TubeGeometry', 'drawRange', 'uProgress', 'u_progress', 'MeshLine', 'strokeDashoffset']) {
            const n = s.split(k).length - 1;
            if (n) console.log(f, k, n);
        }
    }
})();
