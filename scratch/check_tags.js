const fs = require('fs');

const html = fs.readFileSync('./public/index.html', 'utf-8');
const scrollerIdx = html.indexOf('class="ll-scroller');
console.log('scroller at:', scrollerIdx);

// Check if there were unclosed divs or extra closing divs around hero
console.log(html.slice(1650, 1750));
