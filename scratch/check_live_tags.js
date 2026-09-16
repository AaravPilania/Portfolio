const fs = require('fs');
const s = fs.readFileSync('scratch/lamalama_live.html', 'utf8');
const p = s.indexOf('data-slug="moov"');
const pTags = s.indexOf('ll-part--tag-item', p);
console.log(s.substring(pTags - 100, pTags + 1500));
