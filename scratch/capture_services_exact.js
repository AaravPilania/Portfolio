const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const script = `
<script>
  window.addEventListener('load', () => {
    setTimeout(() => {
      const services = document.querySelector('.ll-section--services');
      if (services) {
        services.scrollIntoView({ behavior: 'instant' });
      }
    }, 1800);
  });
</script>
`;

const html = fs.readFileSync('public/index.html', 'utf-8').replace('</body>', script + '</body>');
fs.writeFileSync('public/temp_services.html', html);
const out = path.resolve('public', 'verify_services_exact.png');

try {
  execSync(`"${browserPath}" --headless --disable-gpu --screenshot="${out}" --window-size=1440,900 --virtual-time-budget=3500 http://localhost:3000/temp_services.html`, { timeout: 25000 });
  console.log('Captured verify_services_exact, size:', fs.statSync(out).size);
} catch (e) {
  console.error('Error:', e.message);
}

if (fs.existsSync('public/temp_services.html')) {
  fs.unlinkSync('public/temp_services.html');
}
