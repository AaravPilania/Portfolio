const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9222;
const artifactDir = 'C:\\Users\\gaura\\.gemini\\antigravity-ide\\brain\\2ded929c-541a-4bfa-b747-b56cd87797e7';

const chrome = spawn(chromePath, [
  '--headless=new',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--window-size=1280,800',
  '--remote-debugging-port=' + port,
  '--no-sandbox',
  'http://localhost:3000/'
]);

setTimeout(async () => {
  try {
    const res = await new Promise((resolve, reject) => {
      http.get(`http://localhost:${port}/json`, r => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });

    const page = res.find(p => p.url === 'http://localhost:3000/');
    const ws = new globalThis.WebSocket(page.webSocketDebuggerUrl);

    let frame = 0;
    async function captureFrame(name) {
      return new Promise(resolve => {
        const id = 300 + (++frame);
        const handler = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === id) {
            ws.removeEventListener('message', handler);
            const buffer = Buffer.from(msg.result.data, 'base64');
            const filePath = path.join(artifactDir, name + '.png');
            fs.writeFileSync(filePath, buffer);
            console.log('Saved screenshot:', filePath);
            resolve();
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({
          id: id,
          method: 'Page.captureScreenshot',
          params: { format: 'png' }
        }));
      });
    }

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));

      // Wait until app enters and video is playing (5s)
      setTimeout(async () => {
        // First, check hero at scroll 0
        await captureFrame('hero_scroll_0');

        // Scroll down to transition zone between hero and second section
        ws.send(JSON.stringify({
          id: 10,
          method: 'Runtime.evaluate',
          params: {
            expression: `window.scrollTo({ top: 350, behavior: 'instant' }); window.pageYOffset;`
          }
        }));

        setTimeout(async () => {
          await captureFrame('hero_transition_350px');

          // Scroll a bit more
          ws.send(JSON.stringify({
            id: 11,
            method: 'Runtime.evaluate',
            params: {
              expression: `window.scrollTo({ top: 550, behavior: 'instant' }); window.pageYOffset;`
            }
          }));

          setTimeout(async () => {
            await captureFrame('hero_transition_550px');
            ws.close();
            chrome.kill();
            process.exit(0);
          }, 500);
        }, 500);

      }, 5500);
    };

  } catch (err) {
    console.error('Error:', err);
    chrome.kill();
  }
}, 2000);
