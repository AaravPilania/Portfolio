const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function capture(name, url, waitBudget = 1500) {
  const out = path.resolve('scratch', `${name}.png`);
  try {
    const cmd = `"${browserPath}" --headless --disable-gpu --screenshot="${out}" --window-size=1440,900 --virtual-time-budget=${waitBudget} ${url}`;
    execSync(cmd, { timeout: 35000 });
    console.log(`Captured ${name}, size: ${fs.statSync(out).size}`);
    return out;
  } catch (e) {
    console.error(`Error capturing ${name}:`, e.message);
    return null;
  }
}

capture('live_site', 'http://localhost:3000/', 1500);
