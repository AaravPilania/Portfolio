const fs = require('fs');
const s = fs.readFileSync('public/index.html', 'utf8');
const pStart = s.indexOf('case_highlighted');
const pEnd = s.indexOf('ll-section--services', pStart);
const caseSection = s.substring(pStart, pEnd);
console.log('Has js-line in case_highlighted:', caseSection.includes('js-line'));
console.log('Has js-mono-text-reveal in case_highlighted:', caseSection.includes('js-mono-text-reveal'));
console.log('Has js-text-reveal in case_highlighted:', caseSection.includes('js-text-reveal'));
