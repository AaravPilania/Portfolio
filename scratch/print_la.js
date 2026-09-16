const fs = require('fs');
const code = fs.readFileSync('public/assets/app-zxjZQ-wy.js', 'utf8');
const idx = code.indexOf('transitionIn=');
console.log('Index of transitionIn:', idx);
console.log(code.substring(idx - 100, idx + 2500));
