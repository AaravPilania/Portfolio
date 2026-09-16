const fs = require('fs');

function revertHtml(filePath) {
  let html = fs.readFileSync(filePath, 'utf-8');

  // 1. Hero backdrop item: restore video inside (already done, but check if needed)
  const heroTarget = '<div class="ll-block--backdrop-item absolute inset-0 h-full w-full pointer-events-none opacity-0 js-backdrop-video-item" style="aspect-ratio: 3840/2160;"></div>';
  const heroReplacement = `<div
    class="ll-block--backdrop-item absolute inset-0 h-full w-full pointer-events-none opacity-0 js-backdrop-video-item "
     style='aspect-ratio: 3840/2160;'    >
    
<video
    class="ll-part--video js-backdrop-item"
     width=1920     height=1080    preload="none"
         autoplay     loop     muted     playsInline     data-fade-in style="opacity: 0;"    data-loading="1"        data-src="/videos/showreel.mp4"
    data-width="3840" data-height="2160" data-nogrid="true">
    Your browser does not support the video tag.</video>
</div>`;

  if (html.includes(heroTarget)) {
    html = html.replace(heroTarget, heroReplacement);
    console.log(`[${filePath}] Replaced hero backdrop`);
  }

  // 2. Services section: remove ASCII canvas, restore backdrop video item inside container
  const servicesRegex = /<\/section><section class="ll-section ll-section--services pt-section-3xl pb-section-xl text-textPrimary relative overflow-hidden" data-component="sections\/services" data-theme="dark">\s*<div class="ll-block--backdrop-item absolute inset-0 h-full w-full pointer-events-none overflow-hidden" style="z-index: 0;">\s*<canvas id="what-we-do-ascii-canvas" class="w-full h-full block pointer-events-none"><\/canvas>\s*<\/div>\s*<div class="ll-container ll-grid relative z-10"/;

  const servicesReplacement = `</section><section class="ll-section ll-section--services pt-section-3xl pb-section-xl text-textPrimary" data-component="sections/services" data-theme="dark"><div class="ll-container ll-grid"`;

  if (servicesRegex.test(html)) {
    // Also we need to inject the backdrop video item right inside <div class="ll-container ll-grid"data-component="blocks/backdrop_theme" ...>
    // Let's check what follows <div class="ll-container ll-grid relative z-10"
    html = html.replace(servicesRegex, servicesReplacement);
    
    // Now check if backdrop video is inside ll-container
    const containerTag = '<div class="ll-container ll-grid"data-component="blocks/backdrop_theme" data-labels="HOW WE PAY RENT[/split/]OUR PARTY TRICKS[/split/]WHERE THE MAGIC HAPPENS" data-logo="smile">';
    const containerWithVideo = `<div class="ll-container ll-grid"data-component="blocks/backdrop_theme" data-labels="HOW WE PAY RENT[/split/]OUR PARTY TRICKS[/split/]WHERE THE MAGIC HAPPENS" data-logo="smile">

        
<div
    class="ll-block--backdrop-item absolute inset-0 h-full w-full pointer-events-none opacity-100 js-backdrop-video-item "
     style='aspect-ratio: 16/9;'    >
    
<video
    class="ll-part--video js-backdrop-item"
     width=1920     height=1080    preload="auto"
         autoplay     loop     muted     playsInline     data-fade-in style="opacity: 1; object-fit: cover; width: 100%; height: 100%;"    data-loading="1"        data-src="/videos/me_coding.mp4" src="/videos/me_coding.mp4"
    data-width="1920" data-height="1080" >
    Your browser does not support the video tag.</video>
</div>`;

    if (html.includes(containerTag) && !html.includes('/videos/me_coding.mp4')) {
      html = html.replace(containerTag, containerWithVideo);
      console.log(`[${filePath}] Replaced services backdrop with video`);
    } else {
      console.log(`[${filePath}] Container tag status: found=${html.includes(containerTag)}, alreadyHasVideo=${html.includes('/videos/me_coding.mp4')}`);
    }
  } else {
    console.log(`[${filePath}] Services regex did NOT match`);
  }

  fs.writeFileSync(filePath, html);
  console.log(`[${filePath}] Written successfully`);
}

revertHtml('public/index.html');
revertHtml('index.html');
