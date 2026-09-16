const https = require('https');

https.get('https://lamalama.com/', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    const videos = [...data.matchAll(/<video[^>]*>([\s\S]*?)<\/video>/gi)];
    console.log('Videos found on lamalama.com:', videos.length);
    videos.forEach((v, i) => console.log('Video ' + i + ':\n' + v[0].slice(0, 300)));
    const srcMatches = [...data.matchAll(/(data-src|src)="([^"]+\.mp4[^"]*)"/gi)];
    console.log('MP4 sources:', srcMatches.map(m => m[2]));
  });
}).on('error', e => console.log('Err:', e.message));
