const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const scrollerStart = html.indexOf('class="ll-scroller js-scroller"');
const mainEnd = html.indexOf('</main>');
const section = html.substring(scrollerStart - 4, mainEnd);

const tags = [...section.matchAll(/<\/?div\b[^>]*>/gi)];
let depth = 0;
let minDepth = 0;
let firstNegative = null;

for (let i = 0; i < tags.length; i++) {
  const t = tags[i];
  if (t[0].startsWith('</')) depth--;
  else if (!t[0].endsWith('/>')) depth++;
  if (depth < minDepth) {
    minDepth = depth;
    if (firstNegative === null) firstNegative = { index: t.index, tag: t[0], tagIndex: i };
  }
}
console.log('Total tags:', tags.length, 'Final depth:', depth, 'Min depth reached:', minDepth);
if (firstNegative) {
  console.log('First negative depth at:', firstNegative);
  const snippet = section.substring(firstNegative.index - 100, firstNegative.index + 100);
  console.log('Context:', snippet);
}
