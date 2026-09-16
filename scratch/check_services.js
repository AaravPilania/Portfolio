const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const lines = html.split('\n');
for (let i = 4280; i < 4298; i++) {
  console.log((i+1) + ': ' + lines[i]);
}
