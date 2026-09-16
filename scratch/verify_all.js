const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function capture(name, url, waitBudget = 3000) {
  const out = path.resolve('scratch', `${name}.png`);
  try {
    execSync(`"${browserPath}" --headless --disable-gpu --screenshot="${out}" --window-size=1440,900 --virtual-time-budget=${waitBudget} ${url}`, { timeout: 25000 });
    console.log(`Captured ${name}, size: ${fs.statSync(out).size}`);
    return out;
  } catch (e) {
    console.error(`Error capturing ${name}:`, e.message);
    return null;
  }
}

console.log('Testing live site...');
capture('hero_slide', 'http://localhost:3000/', 4500);
