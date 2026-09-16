const fs = require('fs');

const live = fs.readFileSync('scratch/lamalama_live.html', 'utf8');
const liveStart = live.indexOf('<section class="ll-section ll-section--services');
const liveEnd = live.indexOf('</section>', liveStart) + 10;
const liveServices = live.substring(liveStart, liveEnd);
console.log('Live services length:', liveServices.length);

const curr = fs.readFileSync('index.html', 'utf8');
const currStart = curr.indexOf('<section class="ll-section ll-section--services');
const currEnd = curr.indexOf('</section>', currStart) + 10;
const currServices = curr.substring(currStart, currEnd);
console.log('Current services length:', currServices.length);

fs.writeFileSync('scratch/exact_lamalama_services.html', liveServices);
console.log('Saved exact_lamalama_services.html');
