const fs = require('fs');
const s = fs.readFileSync('public/assets/app-zxjZQ-wy.js', 'utf8');
const p = s.indexOf('createTimeline=', 270000);
console.log(s.substring(p, p + 1000));
