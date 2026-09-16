const http = require('http');

http.get('http://localhost:3000/js/lamalama-interactive.js?v=3.2', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('JS Status:', res.statusCode);
    console.log('Has initDitherTransition:', data.includes('initDitherTransition'));
    console.log('Has initServicesPixelAnimation:', data.includes('initServicesPixelAnimation'));
    console.log('Has 4300 fallback timeout:', data.includes('4300'));
    console.log('Has bayer8 matrix:', data.includes('bayer8'));
  });
}).on('error', (err) => {
  console.error('Error fetching JS:', err);
});
