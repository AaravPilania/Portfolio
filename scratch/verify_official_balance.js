const fs = require('fs');
const html = fs.readFileSync('scratch/official_main_page.html', 'utf8');

const scrollerStart = html.indexOf('class="ll-scroller js-scroller"');
const mainEnd = html.indexOf('</main>');
const section = html.substring(scrollerStart - 4, mainEnd);

const tags = [...section.matchAll(/<\/?div\b[^>]*>/gi)];
let depth = 0;
let minDepth = 0;

for (let i = 0; i < tags.length; i++) {
  const t = tags[i];
  if (t[0].startsWith('</')) depth--;
  else if (!t[0].endsWith('/>')) depth++;
  if (depth < minDepth) minDepth = depth;
}
console.log('Official tags:', tags.length, 'Final depth:', depth, 'Min depth reached:', minDepth);
