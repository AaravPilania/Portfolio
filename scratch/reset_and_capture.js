const http = require('http');
const fs = require('fs');

http.get('http://localhost:9222/json', (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tabLocal = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    if (!tabLocal) return console.log('missing tab');
    const ws = new WebSocket(tabLocal.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const scroller = document.querySelector('.ll-scroller');
            scroller.scrollTop = 0;
            scroller.dispatchEvent(new Event('scroll'));
            return scroller.scrollTop;
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
        fs.writeFileSync('public/hero_clean_final.png', Buffer.from(msg.result.data, 'base64'));
        console.log('Saved public/hero_clean_final.png');
        ws.close();
        process.exit(0);
      }
    };
  });
});
