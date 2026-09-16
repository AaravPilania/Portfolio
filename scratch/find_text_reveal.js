const fs = require('fs');
const s = fs.readFileSync('public/index.html', 'utf8');
const pStart = s.indexOf('case_highlighted');
const pEnd = s.indexOf('ll-section--services', pStart);
const caseSection = s.substring(pStart, pEnd);
const regex = /class="[^"]*js-text-reveal[^"]*"/g;
let m;
while ((m = regex.exec(caseSection)) !== null) {
  console.log(m[0]);
}
