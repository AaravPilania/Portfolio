const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

// Find all section tags and their classes
const sectionRegex = /<section[^>]*class=["']([^"']*)["'][^>]*>/gi;
let match;
console.log('Sections in public/index.html:');
while ((match = sectionRegex.exec(html)) !== null) {
  console.log(match[1]);
}

// Find main tags
const mainRegex = /<main[^>]*class=["']([^"']*)["'][^>]*>/gi;
console.log('\nMain tags in public/index.html:');
while ((match = mainRegex.exec(html)) !== null) {
  console.log(match[1]);
}
