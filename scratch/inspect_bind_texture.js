const fs = require('fs');
const content = fs.readFileSync('public/assets/app-zxjZQ-wy.js', 'utf8');

console.log('--- around pos 164222 ---');
console.log(content.slice(163800, 166500));
