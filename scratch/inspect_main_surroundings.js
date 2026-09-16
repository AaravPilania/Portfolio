const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

const mainStart = html.indexOf('<main');
const mainEnd = html.indexOf('</main>') + 7;

console.log('Header before main (length):', mainStart);
console.log('Snippet before main:', html.substring(mainStart - 300, mainStart));
console.log('Snippet after main:', html.substring(mainEnd, mainEnd + 400));
