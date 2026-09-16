const http = require('http');

http.get('http://localhost:3000/css/custom.css?v=3.2', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('CSS Status:', res.statusCode);
    console.log('Has ll-services-pixel-bg-canvas:', data.includes('ll-services-pixel-bg-canvas'));
    console.log('Has ll-dither-transition-container:', data.includes('ll-dither-transition-container'));
    console.log('Has visibility: hidden for text-reveal:', data.includes('visibility: hidden !important'));
  });
}).on('error', (err) => {
  console.error('Error fetching CSS:', err);
});
