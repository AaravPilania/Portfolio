const fs = require('fs');

function addCanvas(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  if (html.includes('id="heroPortraitCanvas"')) {
    console.log(filePath, 'already has heroPortraitCanvas');
    return;
  }
  const target = 'data-component="sections/hero_extended" data-theme="none">';
  const replacement = 'data-component="sections/hero_extended" data-theme="none">\n                    <canvas id="heroPortraitCanvas" class="ll-hero-portrait-canvas" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1; pointer-events: none;"></canvas>';
  
  if (html.includes(target)) {
    html = html.replace(target, replacement);
    fs.writeFileSync(filePath, html, 'utf8');
    console.log('Successfully inserted heroPortraitCanvas into', filePath);
  } else {
    console.error('Target not found in', filePath);
  }
}

addCanvas('public/index.html');
addCanvas('index.html');
