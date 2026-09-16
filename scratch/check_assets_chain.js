const https = require('https');
const fs = require('fs');

function get(file) {
  return new Promise((resolve) => {
    https.get('https://lamalama.com/wp-content/themes/lamalama2025/dist/assets/' + file, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      let c = '';
      res.on('data', d => c += d);
      res.on('end', () => resolve(c));
    }).on('error', () => resolve(''));
  });
}

async function main() {
  const scripts = await get('scripts-u0yHvTls.js');
  console.log('scripts length:', scripts.length);
  const appMatch = scripts.match(/app-[a-zA-Z0-9_\-]+\.js/);
  console.log('App match in scripts:', appMatch);
  
  // Find all referenced asset names
  const allAssets = scripts.match(/[a-zA-Z0-9_\-]+-[a-zA-Z0-9_\-]{8}\.js/g);
  console.log('Assets referenced:', [...new Set(allAssets || [])]);

  // Let's also check if segment or backdrop exists in allAssets
  const segMatch = (scripts.match(/segment-[a-zA-Z0-9_\-]+\.js/) || [])[0];
  console.log('segment match:', segMatch);
}

main();
