const fs = require('fs');
const path = require('path');

const found = new Set();
function search(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git') search(full);
    } else if (f.endsWith('.js') || f.endsWith('.json') || f.endsWith('.html')) {
      try {
        const c = fs.readFileSync(full, 'utf-8');
        const matches = c.match(/([a-zA-Z0-9_\-\/\.]+\.mp4)/gi) || [];
        matches.forEach(m => found.add(m));
      } catch(e) {}
    }
  }
}
search('.');
console.log('Found video references:\n', Array.from(found));
