const fs = require('fs');

let html = fs.readFileSync('./public/index.html', 'utf-8');
const before = html.length;
html = html.replace(/<script[^>]*src=["'][^"']*hero-avatar-engine[^"']*["'][^>]*><\/script>\s*/gi, '');
console.log('Removed hero-avatar-engine script tag. Diff:', before - html.length);
fs.writeFileSync('./public/index.html', html);
