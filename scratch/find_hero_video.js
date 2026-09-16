const fs = require('fs');
const s = fs.readFileSync('public/index.html', 'utf8');
const p = s.indexOf('data-component="blocks/backdrop_theme"');
console.log(s.substring(p, p + 1500));
