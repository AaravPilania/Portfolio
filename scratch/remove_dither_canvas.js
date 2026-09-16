const fs = require('fs');
const path = require('path');

function fixHtml(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');

  // 1. Remove the dither transition container and canvas
  html = html.replace(/<!-- Dither Dissolve Canvas[\s\S]*?<\/div>\s*<\/div>/g, '');
  html = html.replace(/<div class="ll-dither-transition-container"[\s\S]*?<\/canvas>\s*<\/div>/g, '');

  // 2. Clean up services section tag so it has no relative overflow-hidden or black background
  html = html.replace(
    /<section class="ll-section ll-section--services pt-section-3xl pb-section-xl text-textPrimary relative overflow-hidden"/g,
    '<section class="ll-section ll-section--services pt-section-3xl pb-section-xl text-textPrimary"'
  );

  // 3. Bump version query string to v=5.0
  html = html.replace(/custom\.css\?v=[^"']+/g, 'custom.css?v=5.0');
  html = html.replace(/lamalama-interactive\.js\?v=[^"']+/g, 'lamalama-interactive.js?v=5.0');

  fs.writeFileSync(filePath, html, 'utf8');
  console.log('Cleaned HTML in', filePath);
}

fixHtml(path.join(__dirname, '..', 'public', 'index.html'));
fixHtml(path.join(__dirname, '..', 'index.html'));
