const fs = require('fs');
const s = fs.readFileSync('public/test_pure.html', 'utf8');
const p = s.indexOf('data-slug="moov"');
console.log(s.substring(p + 1000, p + 4000));
