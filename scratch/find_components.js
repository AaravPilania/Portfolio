const fs = require('fs');
const s = fs.readFileSync('public/index.html', 'utf8');
const regex = /data-component="([^"]+)"/g;
const set = new Set();
let match;
while ((match = regex.exec(s)) !== null) {
  set.add(match[1]);
}
console.log(Array.from(set));
