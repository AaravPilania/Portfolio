const fs = require('fs');
const s = fs.readFileSync('index.html', 'utf8');
const idx = s.indexOf('ll-section--case_highlighted');
console.log(s.substring(idx - 250, idx + 450));
