const fs = require('fs');

const html = fs.readFileSync('./public/index.html', 'utf-8');
const scrollerStart = html.indexOf('class="ll-scroller');
const mainEnd = html.indexOf('</main>');

let depth = 0;
const tagRegex = /<\/?div[^>]*>/gi;
tagRegex.lastIndex = scrollerStart;

let match;
while ((match = tagRegex.exec(html)) !== null && match.index < mainEnd) {
  const tag = match[0];
  if (tag.startsWith('</')) {
    depth--;
    if (depth < 0) {
      const lineNo = html.slice(0, match.index).split('\n').length;
      console.log(`NEGATIVE DEPTH ${depth} at line ${lineNo}:`, tag);
      console.log(html.slice(match.index - 80, match.index + 80).replace(/\n/g, ' '));
    }
  } else if (!tag.endsWith('/>')) {
    depth++;
  }
}
