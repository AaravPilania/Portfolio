const fs = require('fs');

function inspectHero(file) {
  if (!fs.existsSync(file)) return;
  const html = fs.readFileSync(file, 'utf-8');
  const idx = html.indexOf('ll-section--hero_extended');
  if (idx !== -1) {
    console.log(`=== HERO IN ${file} ===`);
    console.log(html.slice(idx - 100, idx + 1200));
  }
}

inspectHero('./pacome.html');
