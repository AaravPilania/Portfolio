const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function capture() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9228',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1920,1080',
    'http://localhost:3000/'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  http.get('http://localhost:9228/json', (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', async () => {
      try {
        const list = JSON.parse(raw);
        const tab = list.find(t => t.type === 'page');
        if (!tab) {
          edge.kill();
          process.exit(1);
        }

        const ws = new WebSocket(tab.webSocketDebuggerUrl);

        ws.onopen = () => {
          console.log('Connected to CDP');
          // Wait 6s for intro to finish and reveal to complete
          setTimeout(() => {
            console.log('Capturing Hero screenshot...');
            ws.send(JSON.stringify({
              id: 1,
              method: 'Page.captureScreenshot',
              params: { format: 'png' }
            }));
          }, 6000);
        };

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === 1 && msg.result) {
            fs.writeFileSync('scratch/hero_cleaned.png', Buffer.from(msg.result.data, 'base64'));
            console.log('Saved scratch/hero_cleaned.png');

            // Now scroll to services section
            ws.send(JSON.stringify({
              id: 2,
              method: 'Runtime.evaluate',
              params: {
                expression: `(() => {
                  const s = document.querySelector('.ll-section--services');
                  if (s) {
                    s.scrollIntoView({ behavior: 'instant' });
                    if (window.lenis) window.lenis.scrollTo(s, { immediate: true });
                  }
                  return s ? s.getBoundingClientRect().top : null;
                })()`
              }
            }));

            setTimeout(() => {
              ws.send(JSON.stringify({
                id: 3,
                method: 'Page.captureScreenshot',
                params: { format: 'png' }
              }));
            }, 1000);
          }

          if (msg.id === 3 && msg.result) {
            fs.writeFileSync('scratch/services_cleaned.png', Buffer.from(msg.result.data, 'base64'));
            console.log('Saved scratch/services_cleaned.png');
            ws.close();
            edge.kill();
            process.exit(0);
          }
        };
      } catch (e) {
        console.error('Error:', e);
        edge.kill();
        process.exit(1);
      }
    });
  }).on('error', (e) => {
    console.error('HTTP error:', e);
    edge.kill();
    process.exit(1);
  });
}

capture();
