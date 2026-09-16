const { execSync } = require('child_process');
const f1 = 'C:/Users/gaura/.gemini/antigravity-ide/brain/2ded929c-541a-4bfa-b747-b56cd87797e7/.user_uploaded/media_1789280146276.png';
const f2 = 'C:/Users/gaura/.gemini/antigravity-ide/brain/2ded929c-541a-4bfa-b747-b56cd87797e7/.user_uploaded/media_1789280155106.png';

execSync('ffmpeg -y -i ' + f1 + ' -vf crop=800:350:200:100 scratch/f1_crop.png');
execSync('ffmpeg -y -i ' + f2 + ' -vf crop=800:350:200:250 scratch/f2_crop.png');
console.log('Cropped both images successfully');
