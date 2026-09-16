const fs = require('fs');
const code = fs.readFileSync('public/assets/backdrop_theme-MLvCd1KU.js', 'utf8');
const noImport = code.replace(/import[\s\S]*?;/g, '').replace(/export\s*\{[^}]*\};/g, '');
try {
  new Function(noImport);
  console.log('Syntax check passed cleanly!');
} catch (err) {
  console.error('Syntax error:', err);
}
