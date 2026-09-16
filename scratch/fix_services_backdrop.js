const fs = require('fs');

function fixServices(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  const target = '<section class="ll-section ll-section--services pt-section-3xl pb-section-xl text-textPrimary" data-component="sections/services" data-theme="dark"><div class="ll-container ll-grid" data-component="blocks/backdrop_theme" data-labels="HOW WE PAY RENT[/split/]OUR PARTY TRICKS[/split/]WHERE THE MAGIC HAPPENS" data-logo="smile">';
  const replacement = '<section class="ll-section ll-section--services pt-section-3xl pb-section-xl text-textPrimary relative overflow-hidden" data-component="sections/services" data-theme="dark"><div class="ll-container ll-grid" data-component="blocks/backdrop_theme" data-labels="HOW WE PAY RENT[/split/]OUR PARTY TRICKS[/split/]WHERE THE MAGIC HAPPENS" data-logo="smile">\n<div class="ll-block--backdrop-item absolute inset-0 h-full w-full pointer-events-none opacity-0 js-backdrop-video-item" style="aspect-ratio: 1440/1920; opacity: 0 !important; visibility: hidden; pointer-events: none;">\n    <video class="ll-part--video js-backdrop-item" width="1920" height="1080" preload="none" autoplay loop muted playsinline data-fade-in style="opacity: 0 !important; display: none; pointer-events: none;" data-loading="1" data-src="/videos/showreel.mp4" data-width="1440" data-height="1920">\n        Your browser does not support the video tag.\n    </video>\n</div>';
  
  if (html.includes(target)) {
    html = html.replace(target, replacement);
    fs.writeFileSync(filePath, html, 'utf8');
    console.log('Successfully fixed services in ' + filePath);
  } else {
    console.log('Target not found in ' + filePath);
  }
}

fixServices('public/index.html');
fixServices('index.html');
