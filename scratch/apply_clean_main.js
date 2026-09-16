const fs = require('fs');
const path = require('path');

// 1. Read current public/index.html
const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');

// 2. Read official main#page
const officialMain = fs.readFileSync(path.join(__dirname, 'official_main_page.html'), 'utf8');

// 3. Find <main in public/index.html and </main>
const mainStart = indexHtml.indexOf('<main');
const mainEnd = indexHtml.indexOf('</main>') + 7;

if (mainStart === -1 || mainEnd === -1) {
  console.error('Could not find <main> in public/index.html');
  process.exit(1);
}

// 4. Splice in officialMain
let newHtml = indexHtml.substring(0, mainStart) + officialMain + indexHtml.substring(mainEnd);

// 5. Ensure NO hero-avatar-engine.js script tag exists anywhere
newHtml = newHtml.replace(/<script[^>]*hero-avatar-engine[^>]*><\/script>\s*/gi, '');

// 6. Write to public/index.html and root index.html
fs.writeFileSync(path.join(__dirname, '../public/index.html'), newHtml);
fs.writeFileSync(path.join(__dirname, '../index.html'), newHtml);
console.log('Successfully updated public/index.html and index.html with clean official main#page! Size:', newHtml.length);
