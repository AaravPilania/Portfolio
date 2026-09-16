const fs = require('fs');
const path = require('path');

function updateHtml(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');

  // 1. Add hero-avatar-engine.js script in head if not present
  if (!html.includes('hero-avatar-engine.js')) {
    html = html.replace('</head>', '    <script src="/js/hero-avatar-engine.js"></script>\n</head>');
    console.log('Added hero-avatar-engine.js to head in', filePath);
  }

  // 2. Remove the video src in hero_extended backdrop item
  const oldHeroVideoRegex = /<div class="ll-block--backdrop-item absolute inset-0 h-full w-full pointer-events-none opacity-0 js-backdrop-video-item\s*"[^>]*>[\s\S]*?<video class="ll-part--video js-backdrop-item"[\s\S]*?<\/video>[\s\S]*?<\/div>/;

  const newHeroBackdrop = `<div class="ll-block--backdrop-item absolute inset-0 h-full w-full pointer-events-none opacity-0 js-backdrop-video-item" style="aspect-ratio: 1672/941;">
    <video class="ll-part--video js-backdrop-item" width="1672" height="941" preload="none" muted playsinline style="opacity: 0; display: none;" data-width="1672" data-height="941" data-nogrid="true"></video>
</div>`;

  if (oldHeroVideoRegex.test(html)) {
    html = html.replace(oldHeroVideoRegex, newHeroBackdrop);
    console.log('Replaced hero video with clean 1672x941 backdrop container in', filePath);
  } else {
    console.log('oldHeroVideoRegex did not match directly, checking fallback...');
    // Fallback: replace any video inside hero_extended
    const heroStart = html.indexOf('ll-section--hero_extended');
    if (heroStart !== -1) {
      const heroEnd = html.indexOf('</section>', heroStart);
      let heroSub = html.substring(heroStart, heroEnd);
      heroSub = heroSub.replace(/<video[\s\S]*?<\/video>/, '<video class="ll-part--video js-backdrop-item" width="1672" height="941" preload="none" muted playsinline style="opacity: 0; display: none;" data-width="1672" data-height="941" data-nogrid="true"></video>');
      html = html.substring(0, heroStart) + heroSub + html.substring(heroEnd);
      console.log('Fallback hero video replacement applied in', filePath);
    }
  }

  // 3. Remove/empty showreel preview in mobile toggle
  html = html.replace(/<div class="ll-block--video-autoplay absolute inset-0 object-cover js-showreel-preview-mobile">[\s\S]*?<video[\s\S]*?<\/video>[\s\S]*?<\/div>/, '<div class="ll-block--video-autoplay absolute inset-0 object-cover js-showreel-preview-mobile"></div>');

  fs.writeFileSync(filePath, html, 'utf8');
  console.log('Saved', filePath);
}

updateHtml(path.join(__dirname, '../public/index.html'));
updateHtml(path.join(__dirname, '../index.html'));
