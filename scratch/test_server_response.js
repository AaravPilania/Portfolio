const http = require('http');

http.get('http://localhost:3000/', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Has dither canvas:', data.includes('id="hero-dither-canvas"'));
    console.log('Has services backdrop:', data.includes('js-backdrop-video-item'));
    console.log('Has showreel.mp4:', data.includes('/videos/showreel.mp4'));
    console.log('Has custom.css?v=3.2:', data.includes('/css/custom.css?v=3.2'));
    console.log('Has lamalama-interactive.js?v=3.2:', data.includes('/js/lamalama-interactive.js?v=3.2'));
    console.log('Mix blend exclusion removed from hero:', !data.includes('ll-section--hero_extended min-h-dvh mix-blend-exclusion'));
    console.log('Cache-Control header:', res.headers['cache-control']);
  });
}).on('error', (err) => {
  console.error('Error connecting to server:', err);
});
