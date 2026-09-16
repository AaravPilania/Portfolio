const fs = require('fs');

let html = fs.readFileSync('scratch/exact_lamalama_services.html', 'utf8');
const regex = /https:\/\/lamalama\.com\/wp-content\/uploads\/[^\s"']+/g;
const matches = html.match(regex) || [];
const unique = [...new Set(matches)];
console.log('Total unique images in services:', unique.length);

const localDir = 'public/images/lamalama';
unique.forEach(url => {
  const filename = url.split('/').pop();
  const exists = fs.existsSync(localDir + '/' + filename);
  console.log(filename, exists ? 'EXISTS' : 'MISSING');
});
