const fs = require('fs');
const s = fs.readFileSync('scratch/lamalama_live.html', 'utf8');
const p = s.indexOf('case_item');
if (p !== -1) {
  console.log(s.substring(p - 100, p + 2500));
} else {
  console.log('case_item not found in lamalama_live.html');
}
