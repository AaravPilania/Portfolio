const fs = require('fs');
const txt = fs.readFileSync('public/coded-avatar/avatar.svg', 'utf8');
const match = txt.match(/\bd="([^"]+)"/);
console.log('Match full length:', match ? match[1].length : 'none');
if (match) {
  console.log('Starts with:', match[1].substring(0, 50));
  console.log('Ends with:', match[1].substring(match[1].length - 50));
}
