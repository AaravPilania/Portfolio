const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'index.html');
let content = fs.readFileSync(srcPath, 'utf8');

// 1. Update hero video from showreel.mp4 to hero_authentic.mp4
const oldHeroBlock = `<div
    class="ll-block--backdrop-item absolute inset-0 h-full w-full pointer-events-none opacity-0 js-backdrop-video-item "
     style='aspect-ratio: 3840/2160;'    >
    
<video
    class="ll-part--video js-backdrop-item"
     width=1920     height=1080    preload="none"
         autoplay     loop     muted     playsInline     data-fade-in style="opacity: 0;"    data-loading="1"        data-src="/videos/showreel.mp4"
    data-width="3840" data-height="2160" data-nogrid="true">
    Your browser does not support the video tag.</video>
</div>`;

const newHeroBlock = `<div
    class="ll-block--backdrop-item absolute inset-0 h-full w-full pointer-events-none opacity-100 js-backdrop-video-item "
     style='aspect-ratio: 3840/2160;'    >
    
<video
    class="ll-part--video js-backdrop-item"
     width=1920     height=1080    preload="auto"
         autoplay     loop     muted     playsInline     data-fade-in style="opacity: 1; object-fit: cover; width: 100%; height: 100%;"    data-loading="1"        data-src="/videos/hero_authentic.mp4" src="/videos/hero_authentic.mp4"
    data-width="3840" data-height="2160" data-nogrid="true">
    Your browser does not support the video tag.</video>
</div>`;

// 2. Also update showreel preview inside "This is us" to hero_authentic.mp4
const oldPreviewVideo = `data-src="/videos/showreel.mp4" data-mobile_src="/videos/showreel.mp4">
                            <div class="h-[calc(200/16*1rem)] relative overflow-hidden pointer-events-none">
                                            
<div
    class="ll-block--video-autoplay absolute inset-0 object-cover js-showreel-preview"
        >
    
<video
    class="ll-part--video "
     width=1920     height=1080    preload="none"
         autoplay     loop     muted     playsInline     data-fade-in style="opacity: 0;"    data-loading="1"        data-src="/videos/showreel.mp4"
    data-width="3840" data-height="2160" >
    Your browser does not support the video tag.</video>`;

const newPreviewVideo = `data-src="/videos/hero_authentic.mp4" data-mobile_src="/videos/hero_authentic.mp4">
                            <div class="h-[calc(200/16*1rem)] relative overflow-hidden pointer-events-none">
                                            
<div
    class="ll-block--video-autoplay absolute inset-0 object-cover js-showreel-preview"
        >
    
<video
    class="ll-part--video "
     width=1920     height=1080    preload="auto"
         autoplay     loop     muted     playsInline     data-fade-in style="opacity: 1; object-fit: cover; width: 100%; height: 100%;"    data-loading="1"        data-src="/videos/hero_authentic.mp4" src="/videos/hero_authentic.mp4"
    data-width="3840" data-height="2160" >
    Your browser does not support the video tag.</video>`;

// 3. Remove services section video (me_coding.mp4)
const servicesVideoBlock = `            <div
    class="ll-block--backdrop-item absolute inset-0 h-full w-full pointer-events-none opacity-100 js-backdrop-video-item "
     style='aspect-ratio: 16/9;'    >
    
<video
    class="ll-part--video js-backdrop-item"
     width=1920     height=1080    preload="auto"
         autoplay     loop     muted     playsInline     data-fade-in style="opacity: 1; object-fit: cover; width: 100%; height: 100%;"    data-loading="1"        data-src="/videos/me_coding.mp4" src="/videos/me_coding.mp4"
    data-width="1920" data-height="1080" >
    Your browser does not support the video tag.</video>
</div>`;

console.log('Hero block found:', content.includes(oldHeroBlock));
console.log('Preview block found:', content.includes(oldPreviewVideo));
console.log('Services block found:', content.includes(servicesVideoBlock));

if (content.includes(oldHeroBlock)) {
  content = content.replace(oldHeroBlock, newHeroBlock);
}

if (content.includes(oldPreviewVideo)) {
  content = content.replace(oldPreviewVideo, newPreviewVideo);
}

if (content.includes(servicesVideoBlock)) {
  content = content.replace(servicesVideoBlock, '');
}

// Write to both public/index.html and index.html
fs.writeFileSync(path.join(__dirname, '..', 'public', 'index.html'), content, 'utf8');
fs.writeFileSync(srcPath, content, 'utf8');
console.log('Updated public/index.html and index.html successfully!');
