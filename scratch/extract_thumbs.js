const { execSync } = require('child_process');
const fs = require('fs');

const files = fs.readdirSync('public/videos').filter(f => f.endsWith('.mp4'));
fs.mkdirSync('scratch/video_thumbs', { recursive: true });

for (const f of files) {
  const out = 'scratch/video_thumbs/' + f.replace('.mp4', '.jpg');
  try {
    execSync('ffmpeg -y -ss 00:00:01 -i "public/videos/' + f + '" -vframes 1 "' + out + '"', { stdio: 'ignore' });
    console.log('Extracted', f, 'size:', fs.statSync(out).size);
  } catch(e) {
    console.log('Failed for', f);
  }
}
