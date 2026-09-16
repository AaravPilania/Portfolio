const fs = require('fs');

// 1. Prepare exact services markup
let services = fs.readFileSync('scratch/exact_lamalama_services.html', 'utf8');

// Replace remote image URLs with local cached images
services = services.replace(/https:\/\/lamalama\.com\/wp-content\/uploads\/[0-9]{4}\/[0-9]{2}\/([^\s"']+)/g, '/images/lamalama/$1');
services = services.replace(/https:\/\/lamalama\.com\/wp-content\/uploads\/([^\s"']+)/g, '/images/lamalama/$1');

// Replace HLS video url with local video mp4
services = services.replace(/data-src="https:\/\/vz-f76b55f9-7b8\.b-cdn\.net\/[^"]+"/g, 'data-src="/videos/digital-travel.mp4"');

// 2. Update index.html and public/index.html
function updateIndex(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  
  const marker = html.indexOf('ll-section--services');
  if (marker === -1) {
    console.error('Services marker not found in', filePath);
    return;
  }
  const start = html.lastIndexOf('<section', marker);
  const end = html.indexOf('</section>', marker) + 10;
  
  // Replace section
  html = html.substring(0, start) + services + html.substring(end);
  
  // Remove script tag for services-reaction-diffusion.js
  html = html.replace(/\s*<script src="\/js\/services-reaction-diffusion\.js[^"]*"><\/script>/g, '');
  
  fs.writeFileSync(filePath, html, 'utf8');
  console.log('Successfully updated services in', filePath);
}

updateIndex('public/index.html');
updateIndex('index.html');
