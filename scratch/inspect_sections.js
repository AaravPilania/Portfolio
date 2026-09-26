const fs = require('fs');
const html = fs.readFileSync('final/index.html', 'utf8');
const sections = [...html.matchAll(/<section[^>]*class=["']([^"']*)["'][^>]*>/gi)].map(m => m[1]);
console.log('All sections:', sections);

const divs = [...html.matchAll(/<div[^>]*class=["']([^"']*(?:scroller|scroll-content|heroTrack)[^"']*)["'][^>]*>/gi)].map(m => m[1]);
console.log('Scroll containers/tracks:', divs);
