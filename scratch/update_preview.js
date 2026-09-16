const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'index.html');
let content = fs.readFileSync(srcPath, 'utf8');

// Replace showreel.mp4 in the "This is us" preview
content = content.replace(
  'data-src="/videos/showreel.mp4" data-mobile_src="/videos/showreel.mp4"',
  'data-src="/videos/hero_authentic.mp4" data-mobile_src="/videos/hero_authentic.mp4"'
);

content = content.replace(
  'data-fade-in style="opacity: 0;"    data-loading="1"        data-src="/videos/showreel.mp4"',
  'data-fade-in style="opacity: 1; object-fit: cover; width: 100%; height: 100%;"    data-loading="1"        data-src="/videos/hero_authentic.mp4" src="/videos/hero_authentic.mp4"'
);

fs.writeFileSync(path.join(__dirname, '..', 'public', 'index.html'), content, 'utf8');
fs.writeFileSync(srcPath, content, 'utf8');
console.log('Successfully updated This is us preview video!');
