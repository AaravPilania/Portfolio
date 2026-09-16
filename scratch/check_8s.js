const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function capture() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9223',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1920,1080',
    'http://localhost:3000/'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  http.get('http://localhost:9223/json', (res) => {
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
          // Wait 8 seconds
          setTimeout(() => {
            console.log('Evaluating DOM state...');
            ws.send(JSON.stringify({
              id: 2,
              method: 'Runtime.evaluate',
              params: {
                expression: `JSON.stringify({
                  loaderPresent: !!document.querySelector('.js-loader'),
                  menuRevealed: document.querySelector('.js-menu')?.classList.contains('is-revealed'),
                  menuTransform: window.getComputedStyle(document.querySelector('.js-menu')).transform,
                  menuLeft: window.getComputedStyle(document.querySelector('.js-menu')).left,
                  menuTop: window.getComputedStyle(document.querySelector('.js-menu')).top,
                  heroRevealed: document.querySelector('.ll-section--hero_extended .ll-text-reveal')?.classList.contains('is-revealed'),
                  heroOpacity: window.getComputedStyle(document.querySelector('.ll-section--hero_extended .ll-text-reveal')).opacity,
                  heroVisibility: window.getComputedStyle(document.querySelector('.ll-section--hero_extended .ll-text-reveal')).visibility
                })`
              }
            }));
          }, 8000);
        };

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === 2) {
            console.log('DOM Evaluation:', msg.result.result.value);
            ws.send(JSON.stringify({
              id: 3,
              method: 'Page.captureScreenshot',
              params: { format: 'png' }
            }));
          }
          if (msg.id === 3 && msg.result) {
            fs.writeFileSync('scratch/live_view_8s.png', Buffer.from(msg.result.data, 'base64'));
            console.log('Saved scratch/live_view_8s.png');
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
