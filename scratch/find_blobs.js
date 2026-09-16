const fs = require('fs');
const off = fs.readFileSync('scratch/official_main_page.html', 'utf8');

const regex = /src="blob:[^"]+"/g;
const matches = off.match(regex) || [];
console.log('Total blob src matches:', matches.length);
matches.forEach((m, i) => console.log(i, m));

// Find context of each
let m;
while ((m = regex.exec(off)) !== null) {
  const start = Math.max(0, m.index - 100);
  const end = Math.min(off.length, m.index + 200);
  console.log('--- BLOB AT', m.index, '---');
  console.log(off.substring(start, end));
}
