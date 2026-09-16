const fs = require('fs');
const html = fs.readFileSync('scratch/official_main_page.html', 'utf8');

const regex = /(src|href)="([^"]+)"/g;
let m;
const urls = new Set();
while ((m = regex.exec(html)) !== null) {
  urls.add(m[2]);
}

const arr = Array.from(urls);
console.log('Total unique URLs:', arr.length);
const external = arr.filter(u => u.startsWith('http'));
console.log('External URLs sample:', external.slice(0, 10));
const local = arr.filter(u => !u.startsWith('http') && !u.startsWith('#'));
console.log('Local URLs sample:', local.slice(0, 10));
