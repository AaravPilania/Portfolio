const fs = require('fs');

function addServicesVideo(filePath) {
  let html = fs.readFileSync(filePath, 'utf-8');

  const target = '<img class="ll-block--backdrop-item hidden js-fallback-image"';
  const videoBlock = `<div
    class="ll-block--backdrop-item absolute inset-0 h-full w-full pointer-events-none opacity-100 js-backdrop-video-item "
     style='aspect-ratio: 16/9;'    >
    
<video
    class="ll-part--video js-backdrop-item"
     width=1920     height=1080    preload="auto"
         autoplay     loop     muted     playsInline     data-fade-in style="opacity: 1; object-fit: cover; width: 100%; height: 100%;"    data-loading="1"        data-src="/videos/me_coding.mp4" src="/videos/me_coding.mp4"
    data-width="1920" data-height="1080" >
    Your browser does not support the video tag.</video>
</div>
    
            ` + target;

  if (html.includes(target) && !html.includes('/videos/me_coding.mp4')) {
    html = html.replace(target, videoBlock);
    fs.writeFileSync(filePath, html);
    console.log(`[${filePath}] Added services video successfully`);
  } else {
    console.log(`[${filePath}] Target not found or video already exists`);
  }
}

addServicesVideo('public/index.html');
addServicesVideo('index.html');
