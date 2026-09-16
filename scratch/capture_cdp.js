const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function capture() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1920,1080',
    'http://localhost:3000/'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  http.get('http://localhost:9222/json', (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', async () => {
      try {
        const list = JSON.parse(raw);
        console.log('Tabs count:', list.length);
        const tab = list.find(t => t.type === 'page');
        if (!tab) {
          console.log('No page tab found');
          edge.kill();
          process.exit(1);
        }

        const ws = new WebSocket(tab.webSocketDebuggerUrl);

        ws.onopen = () => {
          console.log('Connected to CDP via native WebSocket');
          setTimeout(() => {
            console.log('Requesting screenshot after 5s...');
            ws.send(JSON.stringify({
              id: 1,
              method: 'Page.captureScreenshot',
              params: { format: 'png' }
            }));
          }, 5000);
        };

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === 1 && msg.result) {
            fs.writeFileSync('scratch/live_view.png', Buffer.from(msg.result.data, 'base64'));
            console.log('SUCCESS: Saved scratch/live_view.png');
            ws.close();
            edge.kill();
            process.exit(0);
          }
        };

        ws.onerror = (err) => {
          console.error('WS Error:', err);
          edge.kill();
          process.exit(1);
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
