const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

async function main() {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=9260',
    'http://localhost:3010/'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  http.get('http://localhost:9260/json', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      const tab = JSON.parse(d).find(t => t.type === 'page');
      const ws = new WebSocket(tab.webSocketDebuggerUrl);
      let id = 0;
      function send(method, params = {}) {
        return new Promise((resolve) => {
          const curId = ++id;
          const handler = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.id === curId) {
              ws.removeEventListener('message', handler);
              resolve(data.result);
            }
          };
          ws.addEventListener('message', handler);
          ws.send(JSON.stringify({ id: curId, method, params }));
        });
      }

      ws.onopen = async () => {
        await send('Page.enable');
        await send('Runtime.enable');

        console.log('Waiting 3s for page load...');
        await new Promise(r => setTimeout(r, 3000));

        // Dispatch mouse wheel events to simulate user scrolling down
        console.log('Simulating mouse wheel down...');
        for (let i = 0; i < 15; i++) {
          await send('Input.dispatchMouseEvent', {
            type: 'mouseWheel',
            x: 720,
            y: 450,
            deltaX: 0,
            deltaY: 500
          });
          await new Promise(r => setTimeout(r, 200));
        }

        await new Promise(r => setTimeout(r, 1000));

        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('scratch/after_wheel_scroll.png', Buffer.from(shot.data, 'base64'));
        console.log('Saved scratch/after_wheel_scroll.png');

        const scrollInfo = await send('Runtime.evaluate', {
          expression: `JSON.stringify({
            windowScrollY: window.scrollY,
            scrollerScrollTop: document.querySelector('.ll-scroller')?.scrollTop,
            bodyScrollTop: document.body.scrollTop
          })`
        });
        console.log('Scroll info after wheel:\n', scrollInfo.result?.value);

        ws.close();
        edge.kill();
        process.exit(0);
      };
    });
  });
}

main().catch(console.error);
