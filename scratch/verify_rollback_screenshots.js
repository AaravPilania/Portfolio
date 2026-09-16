const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const targets = [
  { name: 'verify_rollback_hero', y: 0, delay: 2500 },
  { name: 'verify_rollback_dither', y: 450, delay: 2500 },
  { name: 'verify_rollback_work', y: 1100, delay: 2500 },
  { name: 'verify_rollback_services', y: 2400, delay: 2500 }
];

for (const target of targets) {
  const script = `
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        if (window.lenis) {
          window.lenis.scrollTo(${target.y}, { immediate: true });
        }
        window.scrollTo(0, ${target.y});
        document.documentElement.scrollTop = ${target.y};
        document.body.scrollTop = ${target.y};
        const scroller = document.querySelector('.js-scroller');
        if (scroller) scroller.scrollTop = ${target.y};
      }, 1500);
    });
  </script>
  `;
  const html = fs.readFileSync('public/index.html', 'utf-8').replace('</body>', script + '</body>');
  fs.writeFileSync('public/temp_verify.html', html);
  const out = path.resolve('public', `${target.name}.png`);
  try {
    execSync(`"${browserPath}" --headless --disable-gpu --screenshot="${out}" --window-size=1440,900 --virtual-time-budget=${target.delay + 1000} http://localhost:3000/temp_verify.html`, { timeout: 25000 });
    console.log(`Captured ${target.name}, size:`, fs.statSync(out).size);
  } catch (e) {
    console.error(`Error at ${target.name}:`, e.message);
  }
}

if (fs.existsSync('public/temp_verify.html')) {
  fs.unlinkSync('public/temp_verify.html');
}
console.log('Finished capturing rollback verification screenshots.');
