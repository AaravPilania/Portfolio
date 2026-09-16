const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'public', 'css', 'custom.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Replace the intro reveal section and menu styles
const targetPattern = /\/\* Entrance & Reveal States[\s\S]*?\/\* Header Dropdown Menu Transitions \*\//;
const newRevealStyles = `/* Entrance & Reveal States */
.ll-text-reveal {
  opacity: 0;
  visibility: hidden;
  transform: translateY(28px);
  will-change: opacity, transform;
}

.ll-text-reveal.is-revealed,
.ll-section--hero_extended .ll-text-reveal.is-revealed {
  opacity: 1 !important;
  visibility: visible !important;
  transform: translateY(0) !important;
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.js-header, .js-menu, .js-sticky-items, .js-sticky-bar, .js-sticky-item {
  opacity: 0 !important;
  visibility: hidden !important;
  transition: none !important;
}

/* NAVBAR FIX: Keep left: 50% and transform: translateX(-50%) perfectly centered! */
.js-menu {
  left: 50% !important;
  transform: translateX(-50%) !important;
}

.js-menu.is-revealed {
  opacity: 1 !important;
  visibility: visible !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.js-header.is-revealed,
.js-sticky-items.is-revealed,
.js-sticky-bar.is-revealed,
.js-sticky-item.is-revealed {
  opacity: 1 !important;
  visibility: visible !important;
  transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

/* Header Dropdown Menu Transitions */`;

css = css.replace(targetPattern, newRevealStyles);

// Remove any appended duplicate hero / dither blocks at the bottom and replace with clean definitions
const cleanBottomCSS = `
/* ===================================================
   HERO VIDEO, DITHER DISSOLVE & NAVBAR CENTERING
   =================================================== */
.ll-section--hero_extended {
  position: relative !important;
  overflow: hidden !important;
  min-height: 100vh !important;
  background-color: #000000 !important;
}

.ll-section--hero_extended .js-backdrop-video-item {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  z-index: 1 !important;
  pointer-events: none !important;
}

.ll-section--hero_extended .js-backdrop-video-item video {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  display: block !important;
  filter: none !important;
  mix-blend-mode: normal !important;
}

.ll-section--hero_extended .ll-container {
  position: relative !important;
  z-index: 10 !important;
}

.ll-section--hero_extended h1,
.ll-section--hero_extended p,
.ll-section--hero_extended .ll-part--mono-text-reveal {
  color: #ffffff !important;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.7);
}

.ll-dither-transition-container {
  position: absolute !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  width: 100% !important;
  height: 320px !important;
  z-index: 2 !important;
  pointer-events: none !important;
  overflow: hidden !important;
}

.ll-dither-canvas {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  image-rendering: pixelated !important;
}

.ll-section--services {
  position: relative !important;
  background-color: #000000 !important;
}

.ll-section--services video {
  display: none !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
`;

// Remove previous bottom block if exists
css = css.replace(/\/\* =+ *\r?\n *HERO VIDEO & NATURAL COLOR DISPLAY[\s\S]*$/g, '');
css += '\n' + cleanBottomCSS;

fs.writeFileSync(cssPath, css, 'utf8');
console.log('Successfully updated public/css/custom.css');
