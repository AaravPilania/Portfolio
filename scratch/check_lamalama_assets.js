const https = require('https');
const fs = require('fs');

https.get('https://lamalama.com/', {
  headers: { 'User-Agent': 'Mozilla/5.0' }
}, (res) => {
  let html = '';
  res.on('data', chunk => html += chunk);
  res.on('end', () => {
    const scripts = html.match(/src="([^"]+\.js[^"]*)"/g);
    console.log('Scripts found:', scripts);
    
    // Also check if segment or app exists
    const distMatch = html.match(/\/dist\/assets\/[a-zA-Z0-9_\-]+\.js/g);
    console.log('Dist assets:', distMatch);
  });
});
