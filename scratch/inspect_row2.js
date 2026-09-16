const fs = require('fs');
const s = fs.readFileSync('public/index.html', 'utf8');
const p = s.indexOf('the-disease-spread-on-tiktok');
console.log(s.substring(p - 300, p + 1500));
