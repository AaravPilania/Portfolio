const { execSync } = require('child_process');
const fs = require('fs');

for (let s = 2; s < 25; s += 3) {
  const t = '00:00:' + (s < 10 ? '0' + s : s);
  execSync('ffmpeg -y -ss ' + t + ' -i public/videos/the-purity-revealed.mp4 -vframes 1 scratch/purity_s' + s + '.jpg', { stdio: 'ignore' });
}
console.log('Extracted purity frames');
