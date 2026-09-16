const fs = require('fs');
const s = fs.readFileSync('public/test_pure.html', 'utf8');
const p = s.indexOf('data-slug="moov"');
const pDesc = s.indexOf('js-description', p);
console.log(s.substring(pDesc - 100, pDesc + 500));
