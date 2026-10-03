// node summ.js ref/styles-1920x1080.json  -> compact list of visible UI elements
const d = require(require('path').resolve(process.argv[2]));
const seen = new Set();
for (const it of d.items) {
    const r = it.rect;
    if (r.x >= d.w || r.y >= d.h || r.x + r.w <= 0 || r.y + r.h <= 0) continue;
    const s = it.style;
    const key = it.tag + it.text + r.x + r.y;
    if (seen.has(key)) continue; seen.add(key);
    const fam = s['font-family'].split(',')[0].replace(/"/g, '');
    console.log(`${it.tag}.${it.cls.split(' ').filter((c) => /js-|ll-/.test(c) || it.cls.length < 50).slice(0, 3).join('.')} "${it.text.slice(0, 40)}" ${JSON.stringify(it.data) === '{}' ? '' : JSON.stringify(it.data)}
   @${r.x},${r.y} ${r.w}x${r.h} (b${r.bottom} r${r.right}) ${fam} ${s['font-size']}/${s['line-height']} w${s['font-weight']} ls${s['letter-spacing']} ${s['text-transform']} c=${s.color} bg=${s['background-color']} bd=${s['border-top']} rad=${s['border-radius']} pad=${s.padding} op=${s.opacity} z=${s['z-index']} bf=${s['backdrop-filter']}`);
}
