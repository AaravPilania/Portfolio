const fs = require('fs');
const s = fs.readFileSync('public/index.html', 'utf8');
const lines = s.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('js-line') || line.includes('scale-x')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
