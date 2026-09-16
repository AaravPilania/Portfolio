const fs = require('fs');

fs.copyFileSync('scratch/final_reverted_custom.css', 'public/css/custom.css');
console.log('Copied custom.css successfully, size:', fs.statSync('public/css/custom.css').size);

fs.copyFileSync('scratch/final_reverted_interactive.js', 'public/js/lamalama-interactive.js');
console.log('Copied lamalama-interactive.js successfully, size:', fs.statSync('public/js/lamalama-interactive.js').size);
