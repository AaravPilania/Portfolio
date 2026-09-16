const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf-8');
const idx = html.indexOf('ll-section--services');
console.log(JSON.stringify(html.slice(idx - 40, idx + 400)));
