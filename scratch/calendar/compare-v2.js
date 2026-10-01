// node scratch/calendar/compare-v2.js -> scratch/calendar/v2/compare/<phase>.png
// Pairs reel frames (calendar card crop) with our 1920 stills shot by shoot.js (NAME=c, TIMES = PAIRS times, in order).
const { spawnSync } = require('child_process');
const path = require('path');
const HERE = __dirname;
const REF = path.join(HERE, '..', 'calendar-qa', 'frames');
const PAIRS = require('./compare-pairs.json');
PAIRS.forEach(([name, n], i) => {
    const reel = path.join(REF, 'f' + String(n + 1).padStart(3, '0') + '.png');
    const ours = path.join(HERE, 'v2', 'c-1920-' + i + '.png');
    const out = path.join(HERE, 'v2', 'compare', name + '.png');
    const font = 'fontfile=arial.ttf:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6:x=8:y=8';
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', reel, '-i', ours, '-filter_complex',
        `[0]crop=616:488:52:396,scale=-2:600,drawtext=text='reel n${n}':${font}[a];` +
        `[1]scale=-2:600,drawtext=text='ours ${name}':${font}[b];[a][b]hstack=inputs=2`, out], { cwd: 'C:\\Windows\\Fonts' });
    console.log(name, r.status === 0 ? 'ok' : String(r.stderr));
});
