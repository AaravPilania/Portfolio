const fs = require('fs');

const html = fs.readFileSync('./public/index.html', 'utf-8');
const linkMatches = html.match(/<link[^>]+>/gi) || [];
console.log('--- LINK TAGS ---');
linkMatches.forEach(l => {
  if (l.includes('stylesheet') || l.includes('.css')) console.log(l);
});

const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
console.log('--- SCRIPT TAGS ---');
scriptMatches.forEach((s, idx) => {
  const src = s.match(/src=["']([^"']+)["']/);
  if (src) {
    console.log(`Script ${idx} src:`, src[1]);
  } else {
    console.log(`Inline Script ${idx} length:`, s.length, s.slice(0, 100).replace(/\n/g, ' '));
  }
});
