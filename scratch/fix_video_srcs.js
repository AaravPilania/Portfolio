const fs = require('fs');
const path = require('path');

['public/index.html', 'index.html'].forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) return;
  let html = fs.readFileSync(fullPath, 'utf8');

  // Replace hero blob video with /videos/showreel.mp4
  html = html.replace('src="blob:https://lamalama.com/00f478c8-939a-4316-b4da-9242d8c64b5b"', 'src="/videos/showreel.mp4"');

  // Replace case blob video with /videos/paths-of-life.mp4
  html = html.replace('src="blob:https://lamalama.com/7f2c7d59-88df-45be-9cdc-b0cc69a22ba7"', 'src="/videos/paths-of-life.mp4"');

  fs.writeFileSync(fullPath, html);
  console.log('Replaced blob videos in', filePath);
});
