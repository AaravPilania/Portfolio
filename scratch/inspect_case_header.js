const fs = require('fs');
const s = fs.readFileSync('public/index.html', 'utf8');
const p = s.indexOf('ll-section--case_highlighted');
console.log(s.substring(p, p + 2500));
