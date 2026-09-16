const fs = require('fs');
const path = require('path');

let css = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'custom.css'), 'utf8');

// 1. Update reveal rules to strictly hide elements during intro
const oldReveal = `/* Entrance & Reveal States - Hidden during intro */
.ll-text-reveal {
  opacity: 0 !important;
  transform: translateY(28px);
  will-change: opacity, transform;
}

.ll-text-reveal.is-revealed {
  opacity: 1 !important;
  transform: translateY(0) !important;
  transition: opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
}

.js-header, .js-menu, .js-sticky-items, .js-sticky-bar, .js-sticky-item {
  opacity: 0 !important;
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.js-header.is-revealed,
.js-menu.is-revealed,
.js-sticky-items.is-revealed,
.js-sticky-bar.is-revealed,
.js-sticky-item.is-revealed,
.is-revealed {
  opacity: 1 !important;
  transform: none !important;
}`;

const newReveal = `/* Entrance & Reveal States - Strictly hidden until authentic intro animation completes */
.ll-section--hero_extended .ll-text-reveal,
.ll-text-reveal {
  opacity: 0 !important;
  visibility: hidden !important;
  transform: translateY(28px) !important;
  transition: none !important;
}

.ll-text-reveal.is-revealed {
  opacity: 1 !important;
  visibility: visible !important;
  transform: translateY(0) !important;
  transition: opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.js-header, .js-menu, .js-sticky-items, .js-sticky-bar, .js-sticky-item {
  opacity: 0 !important;
  visibility: hidden !important;
  transition: none !important;
}

.js-header.is-revealed,
.js-menu.is-revealed,
.js-sticky-items.is-revealed,
.js-sticky-bar.is-revealed,
.js-sticky-item.is-revealed,
.is-revealed {
  opacity: 1 !important;
  visibility: visible !important;
  transform: none !important;
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) !important;
}`;

if (css.includes(oldReveal)) {
  css = css.replace(oldReveal, newReveal);
} else {
  // Replace .ll-text-reveal block
  css = css.replace(/\.ll-text-reveal\s*\{[^}]*\}/g, '.ll-section--hero_extended .ll-text-reveal, .ll-text-reveal { opacity: 0 !important; visibility: hidden !important; transform: translateY(28px) !important; }');
  css = css.replace(/\.ll-text-reveal\.is-revealed\s*\{[^}]*\}/g, '.ll-text-reveal.is-revealed { opacity: 1 !important; visibility: visible !important; transform: translateY(0) !important; transition: opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1) !important; }');
}

// 2. Add hero, dither transition and services pixel background CSS
const extraCSS = `
/* ===================================================
   HERO VIDEO & NATURAL COLOR DISPLAY
   =================================================== */
.ll-section--hero_extended {
  position: relative !important;
  overflow: hidden !important;
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
  z-index: 6 !important;
}

/* ===================================================
   PIXELATED / DITHER DISSOLVING TRANSITION (IMAGE 2)
   =================================================== */
.ll-dither-transition-container {
  position: absolute !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  width: 100% !important;
  height: 380px !important;
  z-index: 4 !important;
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

/* ===================================================
   SERVICES ("WHAT WE DO") ANIMATED PIXEL GRID BACKGROUND
   =================================================== */
.ll-section--services {
  position: relative !important;
  overflow: hidden !important;
  background-color: #000000 !important;
}

.ll-services-pixel-bg-canvas {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  z-index: 0 !important;
  pointer-events: none !important;
  image-rendering: pixelated !important;
}

.ll-section--services .ll-container {
  position: relative !important;
  z-index: 2 !important;
}

.ll-section--services video {
  display: none !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
`;

// Remove old dither transition section if present to avoid duplication
css = css.replace(/\/\* =+ *\r?\n *PIXELATED \/ DITHER DISSOLVING TRANSITION[\s\S]*?\.ll-dither-canvas\s*\{[^}]*\}/g, '');

css += '\n' + extraCSS;

fs.writeFileSync(path.join(__dirname, '..', 'public', 'css', 'custom.css'), css, 'utf8');
console.log('Updated public/css/custom.css successfully');
