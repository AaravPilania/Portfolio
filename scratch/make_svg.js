const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/portrait_path.json')));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${data.width} ${data.height}" width="${data.width}" height="${data.height}">
  <rect width="100%" height="100%" fill="${data.bgColor}"/>
  <path fill="#0a0a0a" fill-rule="evenodd" d="${data.pathD}"/>
</svg>`;
fs.writeFileSync(path.join(__dirname, '../public/portrait.svg'), svg);
console.log('SVG written successfully! Size:', svg.length);
