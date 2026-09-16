const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function inspectDOM() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1920,1080',
    'http://localhost:3000/'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  http.get('http://localhost:9224/json', (res) => {
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
          setTimeout(() => {
            ws.send(JSON.stringify({
              id: 1,
              method: 'Runtime.evaluate',
              params: {
                expression: `(() => {
                  const hero = document.querySelector('.ll-section--hero_extended');
                  const heroRect = hero ? hero.getBoundingClientRect() : null;
                  const heroContainer = hero ? hero.querySelector('.ll-container') : null;
                  const containerRect = heroContainer ? heroContainer.getBoundingClientRect() : null;
                  const h1 = document.querySelector('.ll-section--hero_extended h1');
                  const h1Rect = h1 ? h1.getBoundingClientRect() : null;
                  const h1Styles = h1 ? {
                    color: window.getComputedStyle(h1).color,
                    opacity: window.getComputedStyle(h1).opacity,
                    visibility: window.getComputedStyle(h1).visibility,
                    display: window.getComputedStyle(h1).display,
                    mixBlendMode: window.getComputedStyle(h1).mixBlendMode
                  } : null;
                  const ditherCanvas = document.getElementById('hero-dither-canvas');
                  const ditherRect = ditherCanvas ? ditherCanvas.getBoundingClientRect() : null;
                  const videoItem = document.querySelector('.ll-section--hero_extended .js-backdrop-video-item');
                  const videoRect = videoItem ? videoItem.getBoundingClientRect() : null;
                  const webglCanvas = document.querySelector('canvas.js-canvas') || document.querySelector('canvas');
                  const webglRect = webglCanvas ? webglCanvas.getBoundingClientRect() : null;

                  return JSON.stringify({
                    heroRect,
                    containerRect,
                    h1Rect,
                    h1Styles,
                    ditherRect,
                    videoRect,
                    webglRect
                  }, null, 2);
                })()`
              }
            }));
          }, 6000);
        };

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === 1) {
            console.log('DOM Elements Report:\n', msg.result.result.value);
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

inspectDOM();
