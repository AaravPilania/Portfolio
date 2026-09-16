const fs = require('fs');
const content = fs.readFileSync('public/assets/app-zxjZQ-wy.js', 'utf8');
const exportIdx = content.lastIndexOf('export{');
const exportsStr = content.slice(exportIdx);

// Look for what is exported as n
const matchN = exportsStr.match(/(\w+)\s+as\s+n[,}]/);
console.log('Exported as n:', matchN ? matchN[1] : 'not found');

if (matchN) {
  const origName = matchN[1];
  // find definition of origName
  const defRegex = new RegExp(`(?:var|let|const|class|function)\\s+${origName}\\b[^;{]+`, 'g');
  const defMatches = [...content.matchAll(defRegex)].map(m => m[0]);
  console.log('Definition matches for ' + origName + ':', defMatches);
}

// Search for 'router' in app-zxjZQ-wy.js
let pos = 0;
while ((pos = content.indexOf('router', pos)) !== -1) {
  console.log('Found "router" at pos', pos, ':', content.slice(Math.max(0, pos - 50), pos + 100));
  pos += 6;
}
