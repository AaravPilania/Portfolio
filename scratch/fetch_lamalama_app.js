const https = require('https');
const fs = require('fs');

https.get('https://lamalama.com/wp-content/themes/lamalama2025/dist/assets/app-B43p2XC9.js', {
  headers: { 'User-Agent': 'Mozilla/5.0' }
}, (res) => {
  let c = '';
  res.on('data', d => c += d);
  res.on('end', () => {
    fs.writeFileSync('scratch/original_lamalama_app.js', c);
    console.log('Saved original app, size:', c.length);
    
    // Find segment module
    const seg = c.match(/segment-[a-zA-Z0-9_\-]+\.js/g);
    console.log('segment referenced:', seg);
    
    // Find backdrop module
    const bd = c.match(/backdrop_theme-[a-zA-Z0-9_\-]+\.js/g);
    console.log('backdrop referenced:', bd);
  });
});
