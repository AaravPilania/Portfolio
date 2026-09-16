const fs = require('fs');
const path = require('path');

function updateHtml(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');

  // Ensure version query string is bumped
  html = html.replace(/custom\.css\?v=[^"']+/g, 'custom.css?v=4.0');
  html = html.replace(/lamalama-interactive\.js\?v=[^"']+/g, 'lamalama-interactive.js?v=4.0');

  // Replace Hero section structure cleanly
  // The hero section must have:
  // 1. Full-section background video (z-index: 1, absolute inset-0)
  // 2. Bottom dither canvas (z-index: 2, absolute bottom-0, height 300px)
  // 3. Content container (z-index: 10, relative) with headline & paragraph cleanly on top

  // Find start of hero section
  const heroStartRegex = /<section class="ll-section ll-section--hero_extended[^>]*>([\s\S]*?)<\/section><div class="ll-flexible"><section id="work"/;
  const match = html.match(heroStartRegex);

  if (match) {
    const originalHeroContent = match[1];

    // Extract the content container (<div class="ll-container w-full ll-grid" ... > ... </div>)
    // In original, it had backdrop-video-item and dither canvas mixed inside.
    // Let's cleanly construct the hero section:

    const cleanHeroSection = `<section class="ll-section ll-section--hero_extended min-h-dvh relative overflow-hidden pb-hero flex items-end pt-section-lg text-textPrimary" data-component="sections/hero_extended" data-theme="none">
    <!-- Hero Background Video: Fills 100% of Hero Section -->
    <div class="ll-block--backdrop-item absolute inset-0 w-full h-full pointer-events-none js-backdrop-video-item" style="z-index: 1;">
        <video class="ll-part--video js-backdrop-item w-full h-full object-cover" width="1920" height="1080" preload="auto" autoplay loop muted playsinline data-fade-in style="opacity: 1; object-fit: cover; width: 100%; height: 100%;" data-loading="1" data-src="/videos/hero_authentic.mp4" src="/videos/hero_authentic.mp4" data-width="3840" data-height="2160" data-nogrid="true">
            Your browser does not support the video tag.
        </video>
    </div>

    <!-- Dither Dissolve Canvas: Positioned at the bottom of Hero Section behind text -->
    <div class="ll-dither-transition-container" aria-hidden="true" style="position: absolute; bottom: 0; left: 0; right: 0; height: 320px; z-index: 2; pointer-events: none; overflow: hidden;">
        <canvas class="ll-dither-canvas" id="hero-dither-canvas" style="position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated;"></canvas>
    </div>

    <!-- Hero Content: Above video and dither at z-index: 10 -->
    <div class="ll-container w-full ll-grid" style="position: relative; z-index: 10;" data-component="blocks/backdrop_theme" data-labels="YOU MADE IT[/split/]LET’S DO DAMAGE[/split/]LOOKING SHARP TODAY[/split/]NICE ENTRANCE" data-logo="logo">

<div class="absolute inset-0 pointer-events-none flex justify-end pr-4 z-[10] min-h-[max-content] -lg:hidden js-sticky-item-container">
    <div class="sticky top-0 w-[calc(160/16*1rem)] mb-auto overflow-hidden rounded px-3 backdrop-blur-sm opacity-0 max-h-max pointer-events-auto js-sticky-item" data-instant="true">
        <div class="absolute inset-0 bg-bgSecondary opacity-40 h-full w-full"></div>

        
<div class="flex flex-col js-sticky-item-showreel">
    

<div class="h-2 relative js-top-padding"></div>

<button class="flex justify-between relative items-center py-2 w-full ll-add-tag js-title-toggle">
    <div class="pb-0.5">
        This is us    </div>

    <div class="whitespace-nowrap pb-0.5 flex-shrink-0">
        ( <span class="hidden js-plus">+</span><span class="js-minus">-</span> )
    </div>
</button>
    <div class="relative w-full js-children-container">
        <button class="pt-3 pb-3 w-full cursor-pointer relative js-toggle-showreel" data-src="/videos/showreel.mp4" data-mobile_src="/videos/showreel.mp4">
                            <div class="h-[calc(200/16*1rem)] relative overflow-hidden pointer-events-none">
                                            
<div
    class="ll-block--video-autoplay absolute inset-0 object-cover js-showreel-preview"
        >
    
<video
    class="ll-part--video "
     width=1920     height=1080    preload="none"
         autoplay     loop     muted     playsInline     data-fade-in style="opacity: 1; object-fit: cover; width: 100%; height: 100%;"    data-loading="1"        data-src="/videos/showreel.mp4" src="/videos/showreel.mp4"
    data-width="3840" data-height="2160" >
    Your browser does not support the video tag.</video>
</div>                                    </div>
                    </button>
    </div>
</div>    </div>
</div>
<div class="col-start-1 col-span-6 mt-auto lg:col-start-1 lg:col-span-7">
        <div class="ll-part--label ll-add-tag">
        
<div class="relative ll-part--mono-text-reveal  js-mono-text-reveal"

                    data-component="parts/mono_text_reveal">
    <div class="js-animation-target absolute left-0 right-0 js-text-container">[ We are Lama Lama ]</div>
            <div class="opacity-0 js-text-container">[ We are Lama Lama ]</div>
    </div>
    </div>

    

<h1 class="ll-text-reveal opacity-0 ll-part--text-reveal ll-heading-1 mt-6 lg:ll-display-sm js-text-reveal"

                            data-component="parts/text_reveal">
        A creative digital agency that goes all in or not at all.</h1></div>

    

<p class="ll-text-reveal opacity-0 ll-part--text-reveal col-start-1 col-span-5 ll-body-md -lg:mt-6 lg:mt-auto lg:col-start-10 lg:col-span-3 js-text-reveal"

                            data-component="parts/text_reveal">
        We craft brands, products and experiences that hit harder, work smarter and connect deeper. With heart, with craft, and with a team that’s all in or not at all.</p>
</div></section><div class="ll-flexible"><section id="work"`;

    html = html.replace(heroStartRegex, cleanHeroSection);
    fs.writeFileSync(filePath, html, 'utf8');
    console.log('Successfully restructured hero in', filePath);
  } else {
    console.error('Hero regex did not match in', filePath);
  }
}

updateHtml(path.join(__dirname, '..', 'public', 'index.html'));
updateHtml(path.join(__dirname, '..', 'index.html'));
