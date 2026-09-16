const fs = require('fs');

const html = fs.readFileSync('./public/index.html', 'utf-8');
const scrollerIdx = html.indexOf('class="ll-scroller');
console.log('Scroller starts at char:', scrollerIdx);

// Let's count open divs from scrollerIdx
let depth = 0;
let pos = scrollerIdx;
const tagRegex = /<\/?div[^>]*>/gi;
tagRegex.lastIndex = scrollerIdx;

let match;
while ((match = tagRegex.exec(html)) !== null) {
  const tag = match[0];
  if (tag.startsWith('</')) {
    depth--;
    if (depth === 0) {
      console.log('Scroller closed at char:', match.index, tag);
      console.log('Context after close:', html.slice(match.index, match.index + 200));
      break;
    }
  } else if (!tag.endsWith('/>')) {
    depth++;
  }
}
console.log('Final depth:', depth);
