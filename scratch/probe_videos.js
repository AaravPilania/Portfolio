const { execSync } = require('child_process');
const fs = require('fs');

const files = fs.readdirSync('public/videos').filter(f => f.endsWith('.mp4'));
for (const f of files) {
  try {
    const out = execSync('ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of default=noprint_wrappers=1 "public/videos/' + f + '"').toString().trim().replace(/\r?\n/g, ' ');
    console.log(f, out);
  } catch(e) {
    console.log(f, 'error');
  }
}
