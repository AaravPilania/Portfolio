const { execSync } = require('child_process');
const times = ['00:00:00.5', '00:00:02', '00:00:04', '00:00:06'];
times.forEach((t, i) => {
  execSync('ffmpeg -y -ss ' + t + ' -i public/videos/the-purity-revealed.mp4 -vframes 1 scratch/purity_' + i + '.jpg', { stdio: 'ignore' });
});
console.log('Extracted frames');
