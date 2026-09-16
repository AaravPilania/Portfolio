const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

const sServices = html.indexOf('ll-section--services');
console.log('Services starts at:', sServices);
const sLogos = html.indexOf('ll-section--logos');
console.log('Logos starts at:', sLogos);

const servicesBlock = html.substring(sServices - 50, sLogos);

// Let's count tags inside services
const tags = [...servicesBlock.matchAll(/<\/?(section|div)\b[^>]*>/gi)];
let depth = 0;
for (let i = 0; i < tags.length; i++) {
  const t = tags[i];
  if (t[0].startsWith('</')) depth--;
  else if (!t[0].endsWith('/>')) depth++;
  if (depth <= 0 && i > 0) {
    console.log(`Tag ${i}: ${t[0]} at relative index ${t.index}, depth reached ${depth}`);
    console.log('Snippet:', servicesBlock.substring(t.index - 50, t.index + 50));
  }
}
console.log('Final depth of services block:', depth);
