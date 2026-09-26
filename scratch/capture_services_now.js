const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

async function captureServicesNow() {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=9288',
    '--window-size=1440,900',
    'http://localhost:3010/'
  ]);
  await new Promise(r => setTimeout(r, 2000));
  http.get('http://localhost:9288/json', res => {
    let d = ''; res.on('data', c => d += c);
    res.on('end', async () => {
      const tab = JSON.parse(d).find(t => t.type === 'page');
      const ws = new WebSocket(tab.webSocketDebuggerUrl);
      let id = 0;
      function send(m, p = {}) {
        return new Promise(resolve => {
          const curId = ++id;
          const handler = evt => {
            const data = JSON.parse(evt.data);
            if (data.id === curId) { ws.removeEventListener('message', handler); resolve(data.result); }
          };
          ws.addEventListener('message', handler);
          ws.send(JSON.stringify({ id: curId, method: m, params: p }));
        });
      }
      ws.onopen = async () => {
        await send('Page.enable');
        await send('Runtime.enable');
        await new Promise(r => setTimeout(r, 4500));

        // Scroll to services
        await send('Runtime.evaluate', {
          expression: `(() => {
            const s = document.querySelector('.ll-section--services');
            if (s) s.scrollIntoView({ behavior: 'instant', block: 'start' });
            window.dispatchEvent(new Event('scroll'));
            const sc = document.querySelector('.js-scroller');
            if (sc) sc.dispatchEvent(new Event('scroll'));
          })()`
        });
        await new Promise(r => setTimeout(r, 2000));

        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('scratch/current_services_view.png', Buffer.from(shot.data, 'base64'));
        console.log('Saved scratch/current_services_view.png');

        ws.close(); edge.kill(); process.exit(0);
      };
    });
  });
}
captureServicesNow();
