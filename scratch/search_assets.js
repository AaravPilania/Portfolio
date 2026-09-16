const fs = require('fs');
const path = require('path');

function searchAssets(term) {
  for (const f of fs.readdirSync('public/assets')) {
    if (f.endsWith('.js') || f.endsWith('.css')) {
      const c = fs.readFileSync('public/assets/' + f, 'utf-8');
      if (c.toLowerCase().includes(term.toLowerCase())) {
        console.log('Found ' + term + ' in ' + f);
        let pos = 0;
        let count = 0;
        while ((pos = c.toLowerCase().indexOf(term.toLowerCase(), pos)) !== -1 && count < 5) {
          console.log('  ' + c.slice(Math.max(0, pos - 40), pos + 100));
          pos += term.length + 40;
          count++;
        }
      }
    }
  }
}
searchAssets('dither');
searchAssets('bayer');
searchAssets('halftone');
