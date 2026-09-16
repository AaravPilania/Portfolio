const fs = require('fs');
const s = fs.readFileSync('public/index.html', 'utf8');
const p = s.indexOf('paths-of-life');
const pContent = s.indexOf('js-content', p);
const pSlider = s.indexOf('js-content-slider', p);
console.log(s.substring(pSlider, pSlider + 2000));
