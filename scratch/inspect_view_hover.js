const fs = require('fs');
const s = fs.readFileSync('public/test_pure.html', 'utf8');
const p = s.indexOf('data-slug="moov"');
const pView = s.indexOf('js-view-hover', p);
console.log(s.substring(pView - 200, pView + 400));
