// node scratch/calendar/compare-v3.js times   -> prints the TIMES list for shoot.js (NAME=c, OUT=v3/compare/raw)
// node scratch/calendar/compare-v3.js [w]     -> scratch/calendar/v3/compare/<w>-n<reel frame>.png
// Pairs reel frames (calendar card crop) with our stills at the moment that plays the same reel frame, using the
// frame mapping of reel-build.py.
const { spawnSync } = require('child_process');
const path = require('path');
const HERE = __dirname;
const REF = path.join(HERE, '..', 'calendar-qa', 'frames');
const PICKS = [90, 150, 175, 200, 230, 264];
const BEAT = 60 / 137.01, FPS = 30;
const F_FINE = 8 * BEAT * FPS, F_OUTRO = 26 * BEAT * FPS;
const reelFrame = (f) => (f < F_FINE ? 66 + Math.min(56, Math.floor(f * 57 / F_FINE))
    : 123 + Math.min(144, Math.floor((f - F_FINE) * 145 / (F_OUTRO - F_FINE))));
const firstF = (n) => { let f = 0; while (reelFrame(f) !== n) f++; return f; };

if (process.argv[2] === 'times') {
    console.log(PICKS.map((n) => 'dance+' + ((firstF(n) + 0.5) / FPS).toFixed(4)).join(','));
} else {
    const w = process.argv[2] || 1920;
    PICKS.forEach((n, i) => {
        const reel = path.join(REF, 'f' + String(n + 1).padStart(3, '0') + '.png');
        const ours = path.join(HERE, 'v3', 'compare', 'raw', `c-${w}-${i}.png`);
        const out = path.join(HERE, 'v3', 'compare', `${w}-n${n}.png`);
        const font = 'fontfile=arial.ttf:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6:x=8:y=8';
        const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', reel, '-i', ours, '-filter_complex',
            `[0]crop=616:488:52:396,scale=-2:600,drawtext=text='reel n${n}':${font}[a];` +
            `[1]scale=-2:600,drawtext=text='ours ${w}':${font}[b];[a][b]hstack=inputs=2`, out], { cwd: 'C:\\Windows\\Fonts' });
        console.log(out, r.status === 0 ? 'ok' : String(r.stderr));
    });
}
