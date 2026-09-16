const fs = require('fs');

const appJs = fs.readFileSync('public/assets/app-zxjZQ-wy.js', 'utf8');
const backdropJs = fs.readFileSync('public/assets/backdrop_theme-MLvCd1KU.js', 'utf8');

// Find all occurrences of #version 300 es
function findShaders(src, name) {
  let idx = 0;
  while ((idx = src.indexOf('#version 300 es', idx)) !== -1) {
    // find start of template string
    const startBacktick = src.lastIndexOf('`', idx);
    const endBacktick = src.indexOf('`', idx);
    const shader = src.substring(startBacktick + 1, endBacktick);
    const varName = src.substring(Math.max(0, startBacktick - 30), startBacktick);
    console.log(`=== ${name} shader (${varName.trim()}) ===`);
    console.log(`Length: ${shader.length}, Lines: ${shader.split(/\r?\n/).length}`);
    idx = endBacktick + 1;
  }
}

findShaders(appJs, 'app-zxjZQ-wy.js');
findShaders(backdropJs, 'backdrop_theme-MLvCd1KU.js');
