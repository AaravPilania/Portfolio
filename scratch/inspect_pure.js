const fs = require('fs');

const testHtml = fs.readFileSync('public/test_pure.html', 'utf8');
const indexHtml = fs.readFileSync('public/index.html', 'utf8');

const regex = /data-component=["']([^"']+)["']/g;
const comps = new Set();
let m;
while ((m = regex.exec(testHtml)) !== null) {
  comps.add(m[1]);
}
console.log('Test components:', Array.from(comps));

// Find all canvas tags
console.log('Canvases in testHtml:', testHtml.match(/<canvas[^>]*>/gi));
console.log('Canvases in indexHtml:', indexHtml.match(/<canvas[^>]*>/gi));

// Find all video tags
console.log('Videos in testHtml:', testHtml.match(/<video[^>]*>/gi));
console.log('Videos in indexHtml:', indexHtml.match(/<video[^>]*>/gi));
