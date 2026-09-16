const fs = require('fs');
const code = fs.readFileSync('public/assets/app-zxjZQ-wy.js', 'utf8');
const idx = code.indexOf('DURATION_IN');
console.log('Index of DURATION_IN in app-zxjZQ-wy.js:', idx);
if (idx !== -1) {
  console.log('Snippet around DURATION_IN:');
  console.log(code.substring(Math.max(0, idx - 200), Math.min(code.length, idx + 800)));
}
