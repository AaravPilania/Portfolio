const fs = require('fs');
const c = fs.readFileSync('final/index.html', 'utf8');
const target = ".sticky-hero-track";
const pos = c.indexOf(target);
console.log('sticky-hero-track CSS:\n', c.slice(pos, pos + 500));








