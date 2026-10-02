// Decode final/audio/calendar-loop.mp3 the way the page does (Chrome, 44.1 kHz context) and dump channel 0 around the
// loop points to C:/cal4work/chrome-decode.json for audio-verify.py
const fs = require('fs');
const { launch, sleep } = require('./cdp');
(async () => {
    const { page, close } = await launch({ w: 800, h: 600 });
    await page.goto('http://localhost:3010/contact.html');
    await sleep(1500);
    const r = await page.eval(`(async () => {
        const ctx = new AudioContext({ sampleRate: 44100 });
        const buf = await ctx.decodeAudioData(await (await fetch('audio/calendar-loop.mp3?' + Date.now())).arrayBuffer());
        const d = buf.getChannelData(0), sr = buf.sampleRate, pad = Math.round(0.5 * sr), L = 927155;
        const win = (a) => Array.from(d.subarray(a - 4000, a + 4000));
        return { sr, length: buf.length, duration: buf.duration, ctxRate: ctx.sampleRate, start: win(pad), end: win(pad + L) };
    })()`);
    fs.writeFileSync('C:/cal4work/chrome-decode.json', JSON.stringify(r));
    console.log('sr', r.sr, 'length', r.length, 'duration', r.duration, 'ctx', r.ctxRate, 'errors', page.errors);
    await close();
    process.exit(0);
})();
