const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const out = path.resolve('scratch', 'preview_portrait.png');

try {
  execSync(`"${browserPath}" --headless --disable-gpu --screenshot="${out}" --window-size=1440,900 --virtual-time-budget=2000 http://localhost:3000/test_portrait.html`, { timeout: 20000 });
  console.log('Done, size:', fs.statSync(out).size);
} catch (e) {
  console.error('Error:', e.message);
}
