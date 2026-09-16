const fs = require('fs');
const path = require('path');

function updateHtmlFile(filePath) {
  console.log(`Updating ${filePath}...`);
  let html = fs.readFileSync(filePath, 'utf8');

  // 1. Ensure Cache-Busting on custom.css and lamalama-interactive.js
  html = html.replace(
    /<link\s+rel=["']stylesheet["']\s+href=["']\/css\/custom\.css[^"']*["']/g,
    '<link rel="stylesheet" href="/css/custom.css?v=3.2"'
  );
  html = html.replace(
    /<script\s+src=["']\/js\/lamalama-interactive\.js[^"']*["']><\/script>/g,
    '<script src="/js/lamalama-interactive.js?v=3.2"></script>'
  );

  // 2. Remove mix-blend-exclusion from hero section and ensure relative overflow-hidden
  html = html.replace(
    /<section class="ll-section ll-section--hero_extended min-h-dvh mix-blend-exclusion pb-hero flex items-end pt-section-lg text-textPrimary"/g,
    '<section class="ll-section ll-section--hero_extended min-h-dvh relative overflow-hidden pb-hero flex items-end pt-section-lg text-textPrimary"'
  );

  // Ensure hero container has z-index
  html = html.replace(
    /<div class="ll-container w-full ll-grid"data-component="blocks\/backdrop_theme"/g,
    '<div class="ll-container w-full ll-grid" style="position: relative; z-index: 6;" data-component="blocks/backdrop_theme"'
  );
  html = html.replace(
    /<div class="ll-container w-full ll-grid" data-component="blocks\/backdrop_theme"/g,
    '<div class="ll-container w-full ll-grid" style="position: relative; z-index: 6;" data-component="blocks/backdrop_theme"'
  );

  // Ensure hero video has z-index: 1 and natural display
  html = html.replace(
    /<div\s+class="ll-block--backdrop-item absolute inset-0 h-full w-full pointer-events-none opacity-100 js-backdrop-video-item\s*"\s+style='aspect-ratio: 3840\/2160;'\s*>/g,
    '<div class="ll-block--backdrop-item absolute inset-0 h-full w-full pointer-events-none opacity-100 js-backdrop-video-item" style="aspect-ratio: 3840/2160; z-index: 1;">'
  );

  // Ensure hero dither transition canvas is inserted at the bottom of the hero section if not already present
  if (!html.includes('id="hero-dither-canvas"')) {
    const heroEndTarget = '</div></section><div class="ll-flexible"><section id="work"';
    const ditherBlock = `    <div class="ll-dither-transition-container" aria-hidden="true" style="position: absolute; bottom: 0; left: 0; right: 0; height: 380px; z-index: 4; pointer-events: none; overflow: hidden;">
        <canvas class="ll-dither-canvas" id="hero-dither-canvas" style="position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated;"></canvas>
    </div>
</div></section><div class="ll-flexible"><section id="work"`;
    html = html.replace(heroEndTarget, ditherBlock);
  }

  // 3. Ensure Services section ("What We Do") has the hidden backdrop video item for WebGL
  if (!html.includes('js-backdrop-video-item') || !html.includes('data-src="/videos/showreel.mp4"')) {
    // Check if services section has the backdrop item
    const servicesTarget = '<section class="ll-section ll-section--services pt-section-3xl pb-section-xl text-textPrimary" data-component="sections/services" data-theme="dark"><div class="ll-container ll-grid" data-component="blocks/backdrop_theme" data-labels="HOW WE PAY RENT[/split/]OUR PARTY TRICKS[/split/]WHERE THE MAGIC HAPPENS" data-logo="smile">';
    const servicesBackdropItem = `<section class="ll-section ll-section--services pt-section-3xl pb-section-xl text-textPrimary relative overflow-hidden" data-component="sections/services" data-theme="dark"><div class="ll-container ll-grid" data-component="blocks/backdrop_theme" data-labels="HOW WE PAY RENT[/split/]OUR PARTY TRICKS[/split/]WHERE THE MAGIC HAPPENS" data-logo="smile">
<div class="ll-block--backdrop-item absolute inset-0 h-full w-full pointer-events-none opacity-0 js-backdrop-video-item" style="aspect-ratio: 1440/1920; opacity: 0 !important; visibility: hidden; pointer-events: none;">
    <video class="ll-part--video js-backdrop-item" width="1920" height="1080" preload="none" autoplay loop muted playsinline data-fade-in style="opacity: 0 !important; display: none; pointer-events: none;" data-loading="1" data-src="/videos/showreel.mp4" data-width="1440" data-height="1920">
        Your browser does not support the video tag.
    </video>
</div>`;
    if (html.includes(servicesTarget)) {
      html = html.replace(servicesTarget, servicesBackdropItem);
    }
  }

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`Successfully updated ${filePath}`);
}

updateHtmlFile(path.join(__dirname, '..', 'public', 'index.html'));
updateHtmlFile(path.join(__dirname, '..', 'index.html'));
