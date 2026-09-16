const fs = require('fs');

const html = fs.readFileSync('./public/index.html', 'utf-8');

// Let's count divs from scroller start to </main>
const scrollerStart = html.indexOf('class="ll-scroller');
const mainEnd = html.indexOf('</main>');

let depth = 0;
const tagRegex = /<\/?div[^>]*>/gi;
tagRegex.lastIndex = scrollerStart;

let match;
while ((match = tagRegex.exec(html)) !== null && match.index < mainEnd) {
  const tag = match[0];
  if (tag.startsWith('</')) depth--;
  else if (!tag.endsWith('/>')) depth++;
}

console.log('Div depth right before </main>:', depth);
