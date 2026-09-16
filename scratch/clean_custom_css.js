const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'public', 'css', 'custom.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Remove all dither container & canvas CSS
css = css.replace(/\.ll-dither-transition-container\s*\{[^}]*\}/g, '');
css = css.replace(/\.ll-dither-canvas\s*\{[^}]*\}/g, '');

// Remove black slate from .ll-section--services and ensure it is transparent
css = css.replace(/\.ll-section--services\s*\{[^}]*\}/g, '.ll-section--services { position: relative !important; background-color: transparent !important; background: transparent !important; }');
css = css.replace(/\.ll-services-pixel-bg-canvas\s*\{[^}]*\}/g, '');

// Clean up any double blank lines
css = css.replace(/\n\s*\n\s*\n/g, '\n\n');

fs.writeFileSync(cssPath, css, 'utf8');
console.log('Successfully updated public/css/custom.css');
