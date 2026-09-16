const fs = require('fs');

// 1. Fix segment-DtAQyFoF.js
let seg = fs.readFileSync('public/assets/segment-DtAQyFoF.js', 'utf8');
seg = seg.replaceAll('progress * ((0.0 + offset));', 'progress * (0.0 + offset);')
         .replaceAll('progress * ((1.0 + offset));', 'progress * (1.0 + offset);')
         .replaceAll('progress * ((2.0 + offset));', 'progress * (2.0 + offset);')
         .replaceAll('progress * ((3.0 + offset));', 'progress * (3.0 + offset);')
         .replaceAll('progress * ((4.0 + offset));', 'progress * (4.0 + offset);')
         .replaceAll('progress * ((5.0 + offset));', 'progress * (5.0 + offset);')
         .replaceAll('progress * ((6.0 + offset));', 'progress * (6.0 + offset);')
         .replaceAll('progress * ((7.0 + offset));', 'progress * (7.0 + offset);')
         .replaceAll('progress * ((8.0 + offset));', 'progress * (8.0 + offset);')
         .replaceAll('progress * ((9.0 + offset));', 'progress * (9.0 + offset);')
         .replaceAll('progress * ((10.0 + offset));', 'progress * (10.0 + offset);')
         .replaceAll('progress * ((11.0 + offset));', 'progress * (11.0 + offset);')
         .replaceAll('progress * ((12.0 + offset));', 'progress * (12.0 + offset);')
         .replaceAll('progress * ((13.0 + offset));', 'progress * (13.0 + offset);')
         .replaceAll('progress * ((14.0 + offset));', 'progress * (14.0 + offset);')
         .replaceAll('progress * ((15.0 + offset));', 'progress * (15.0 + offset);');
fs.writeFileSync('public/assets/segment-DtAQyFoF.js', seg, 'utf8');
console.log('Fixed segment-DtAQyFoF.js syntax');

// 2. Fix app-zxjZQ-wy.js
let app = fs.readFileSync('public/assets/app-zxjZQ-wy.js', 'utf8');
app = app.replaceAll('progress * ((0.0 + offset));', 'progress * (0.0 + offset);')
         .replaceAll('progress * ((1.0 + offset));', 'progress * (1.0 + offset);')
         .replaceAll('progress * ((2.0 + offset));', 'progress * (2.0 + offset);')
         .replaceAll('progress * ((3.0 + offset));', 'progress * (3.0 + offset);')
         .replaceAll('progress * ((4.0 + offset));', 'progress * (4.0 + offset);')
         .replaceAll('progress * ((5.0 + offset));', 'progress * (5.0 + offset);')
         .replaceAll('progress * ((6.0 + offset));', 'progress * (6.0 + offset);')
         .replaceAll('progress * ((7.0 + offset));', 'progress * (7.0 + offset);')
         .replaceAll('progress * ((8.0 + offset));', 'progress * (8.0 + offset);')
         .replaceAll('progress * ((9.0 + offset));', 'progress * (9.0 + offset);')
         .replaceAll('progress * ((10.0 + offset));', 'progress * (10.0 + offset);')
         .replaceAll('progress * ((11.0 + offset));', 'progress * (11.0 + offset);')
         .replaceAll('progress * ((12.0 + offset));', 'progress * (12.0 + offset);')
         .replaceAll('progress * ((13.0 + offset));', 'progress * (13.0 + offset);')
         .replaceAll('progress * ((14.0 + offset));', 'progress * (14.0 + offset);')
         .replaceAll('progress * ((15.0 + offset));', 'progress * (15.0 + offset);');
fs.writeFileSync('public/assets/app-zxjZQ-wy.js', app, 'utf8');
console.log('Fixed app-zxjZQ-wy.js syntax');
