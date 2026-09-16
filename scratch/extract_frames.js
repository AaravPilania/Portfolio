const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const files = fs.readdirSync('public/videos').filter(f => f.endsWith('.mp4'));
for (const f of files) {
  const outName = 'frame_' + f.replace(/[^a-zA-Z0-9]/g, '_') + '.png';
  const outPath = path.join('scratch', outName);
  try {
    execSync(`ffmpeg -y -ss 00:00:01 -i "public/videos/${f}" -vframes 1 "${outPath}"`, { stdio: 'ignore' });
  } catch(e) {}
}
console.log('Done extracting frames');
