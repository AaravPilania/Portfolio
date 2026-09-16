const https = require('https');
const fs = require('fs');

https.get('https://lamalama.com/wp-content/themes/lamalama2025/dist/assets/main-UvL14t5G.js', {
  headers: { 'User-Agent': 'Mozilla/5.0' }
}, (res) => {
  let code = '';
  res.on('data', chunk => code += chunk);
  res.on('end', () => {
    console.log('main js length:', code.length);
    const imports = code.match(/from\s*["'](\.\/[^"']+)["']/g);
    console.log('imports:', imports);
    const dynamicImports = code.match(/import\(["'](\.\/[^"']+)["']\)/g);
    console.log('dynamic imports:', dynamicImports);
  });
});
