const fs = require('fs');

const html = fs.readFileSync('./public/index.html', 'utf-8');
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes('backdrop')) {
    console.log(i + 1, l.trim().slice(0, 120));
  }
});
