const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function capture() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9226',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1920,1080',
    'http://localhost:3000/'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  http.get('http://localhost:9226/json', (res) => {
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
          // Wait 9 seconds
          setTimeout(() => {
            console.log('Taking screenshot at 9s...');
            ws.send(JSON.stringify({
              id: 3,
              method: 'Page.captureScreenshot',
              params: { format: 'png' }
            }));
          }, 9000);
        };

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === 3 && msg.result) {
            fs.writeFileSync('scratch/live_view_9s.png', Buffer.from(msg.result.data, 'base64'));
            console.log('Saved scratch/live_view_9s.png');
            ws.close();
            edge.kill();
            process.exit(0);
          }
        };
      } catch (e) {
        console.error(e);
        edge.kill();
      }
    });
  });
}

capture();
