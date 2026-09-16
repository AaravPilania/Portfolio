const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

const heroStart = html.indexOf('ll-section--hero_extended');
if (heroStart !== -1) {
  const startTag = html.lastIndexOf('<section', heroStart);
  const nextSection = html.indexOf('<section', heroStart + 25);
  console.log(html.substring(startTag, nextSection));
} else {
  console.log('Not found');
}
