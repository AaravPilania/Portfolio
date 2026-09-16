const fs = require('fs');
const content = fs.readFileSync('public/assets/app-zxjZQ-wy.js', 'utf8');

// Find all import statements in the file
const regex = /import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g;
let m;
while ((m = regex.exec(content)) !== null) {
  console.log(`Import from "${m[2]}":`, m[1].slice(0, 100));
}
