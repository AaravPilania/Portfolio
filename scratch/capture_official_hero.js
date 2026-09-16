const http = require('http');
const fs = require('fs');

http.get('http://localhost:9222/json', (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tabLama = tabs.find(t => t.url.includes('lamalama.com') && t.webSocketDebuggerUrl);
    if (!tabLama) return console.log('no lamalama tab');

    const ws = new WebSocket(tabLama.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const scroller = document.querySelector('.ll-scroller');
            if (scroller) scroller.scrollTop = 0;
            return scroller ? scroller.scrollTop : null;
          })()`,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === 1) {
        setTimeout(() => {
          ws.send(JSON.stringify({ id: 2, method: 'Page.captureScreenshot', params: { format: 'png' } }));
        }, 500);
      } else if (msg.id === 2 && msg.result?.data) {
        fs.writeFileSync('scratch/official_hero_screenshot.png', Buffer.from(msg.result.data, 'base64'));
        console.log('Saved scratch/official_hero_screenshot.png');
        ws.close();
        process.exit(0);
      }
    };
  });
});
