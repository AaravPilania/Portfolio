const fs = require('fs');
const content = fs.readFileSync('final/index.html', 'utf8');
content.split('\n').forEach((l, i) => {
  if (l.includes('<section') || l.includes('sticky-hero') || l.includes('section-projects') || l.includes('hero-shrink-card')) {
    console.log(i + ': ' + l.trim().slice(0, 100));
  }
});
