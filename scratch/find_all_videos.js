const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const vids = [...html.matchAll(/<video\b[^>]*>[\s\S]*?<\/video>/gi)];
vids.forEach((v, i) => {
  const idx = v.index;
  const tag = v[0].substring(0, 100).replace(/\s+/g, ' ');
  const parentTag = html.substring(Math.max(0, idx - 150), idx).replace(/\s+/g, ' ');
  console.log(`Video ${i} at ${idx}: parent: ${parentTag} | tag: ${tag}`);
});
