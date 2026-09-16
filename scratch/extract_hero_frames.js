const { execSync } = require('child_process');
const times = [1, 3, 5, 8, 11];
times.forEach(t => {
  execSync('ffmpeg -y -ss 00:00:0' + (t < 10 ? '0' + t : t) + ' -i public/videos/hero_authentic.mp4 -vframes 1 scratch/hero_' + t + '.jpg', { stdio: 'ignore' });
});
console.log('Extracted hero frames');
