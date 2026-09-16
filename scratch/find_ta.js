const fs = require('fs');
const code = fs.readFileSync('public/assets/app-zxjZQ-wy.js', 'utf8');
const idx = code.indexOf('handleLoad=');
console.log('Index of handleLoad=:', idx);
if (idx !== -1) {
  console.log(code.substring(idx - 100, idx + 800));
}
