const fs = require('fs');

// 1. Restore segment-DtAQyFoF.js to original lamalama
const origSeg = fs.readFileSync('scratch/original_segment.js', 'utf8');
fs.writeFileSync('public/assets/segment-DtAQyFoF.js', origSeg, 'utf8');
console.log('Restored public/assets/segment-DtAQyFoF.js');

// 2. Restore backdrop_theme-MLvCd1KU.js shader
let origBackdrop = fs.readFileSync('scratch/original_backdrop_theme.js', 'utf8');
// Keep the import pointing to the local app bundle name
origBackdrop = origBackdrop.replace('./app-B43p2XC9.js', './app-zxjZQ-wy.js');
// Keep the custom guard for hero & case_highlighted webgl
origBackdrop = origBackdrop.replace(
  'this.backdropContent&&(this.IS_WEBGL=!1)',
  'this.backdropContent&&!this.section.classList.contains(`ll-section--case_highlighted`)&&!this.section.classList.contains(`ll-section--hero_extended`)&&(this.IS_WEBGL=!1)'
);
fs.writeFileSync('public/assets/backdrop_theme-MLvCd1KU.js', origBackdrop, 'utf8');
console.log('Restored public/assets/backdrop_theme-MLvCd1KU.js');

// 3. Restore background grid / cursor shader in app-zxjZQ-wy.js (around line 570 - 775)
let app = fs.readFileSync('public/assets/app-zxjZQ-wy.js', 'utf8');
const origApp = fs.readFileSync('scratch/original_lamalama_app.js', 'utf8');

// Find the grid shader in origApp around 804427
const origGridShaderStart = origApp.indexOf('float drawLLLogo(vec2 rect, float opacity, float full) {', 750000);
const origGridShaderEnd = origApp.indexOf('export{', origGridShaderStart);
const origGridShaderPart = origApp.substring(origGridShaderStart, origGridShaderEnd);

// Find the corresponding grid shader in app-zxjZQ-wy.js
const currGridShaderStart = app.indexOf('float drawAPLogo(vec2 rect, float opacity, float full) {', 750000);
const currGridShaderEnd = app.indexOf('export{', currGridShaderStart);

if (currGridShaderStart > -1 && origGridShaderStart > -1) {
  app = app.substring(0, currGridShaderStart) + origGridShaderPart + app.substring(currGridShaderEnd);
  fs.writeFileSync('public/assets/app-zxjZQ-wy.js', app, 'utf8');
  console.log('Restored background grid shader in public/assets/app-zxjZQ-wy.js');
} else {
  console.error('Could not find grid shader in app-zxjZQ-wy.js', { currGridShaderStart, origGridShaderStart });
}
