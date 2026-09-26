const fs = require('fs');
const content = fs.readFileSync('final/index.html', 'utf8');
console.log('Length:', content.length);
const scripts = [];
const regex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let m;
while ((m = regex.exec(content)) !== null) {
  const tag = m[0];
  const srcMatch = tag.match(/src=["']([^"']+)["']/i);
  if (srcMatch) {
    scripts.push({ src: srcMatch[1], type: tag.includes('type=') ? tag.match(/type=["']([^"']+)["']/i)[1] : 'normal' });
  } else {
    scripts.push({ inlineLength: m[1].length, snippet: m[1].slice(0, 100).replace(/\n/g, ' ') });
  }
}
console.log('Found scripts:', JSON.stringify(scripts, null, 2));
