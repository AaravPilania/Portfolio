const fs = require('fs');
const path = require('path');

const jsPath = path.join(__dirname, '..', 'public', 'js', 'lamalama-interactive.js');
let js = fs.readFileSync(jsPath, 'utf8');

// Remove initDitherTransition function
js = js.replace(/\/\* =+ *\r?\n *5\. PIXELATED \/ DITHER DISSOLVING TRANSITION[\s\S]*?function initDitherTransition\(\)\s*\{[\s\S]*?\n  \}/g, '');

// Remove call to initDitherTransition() in init()
js = js.replace(/\s*initDitherTransition\(\);/g, '');

// Remove any canvas creation related to dither or services pixel bg
js = js.replace(/\s*initServicesPixelAnimation\(\);/g, '');
js = js.replace(/function initServicesPixelAnimation\(\)\s*\{[\s\S]*?\n  \}/g, '');

fs.writeFileSync(jsPath, js, 'utf8');
console.log('Successfully cleaned public/js/lamalama-interactive.js');
