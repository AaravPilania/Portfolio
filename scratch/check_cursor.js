const fs = require('fs');
const js = fs.readFileSync('scratch/interactive_pre1556.js', 'utf-8');
const start = js.indexOf('function initCursor');
console.log(js.slice(start, start + 1200));
