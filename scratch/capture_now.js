const http = require('http');
const fs = require('fs');
const path = require('path');

http.get('http://localhost:9222/json', (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    if (!tab) return console.log('no tab');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Page.captureScreenshot', params: { format: 'png' } }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === 1 && msg.result?.data) {
        fs.writeFileSync(path.join(__dirname, '../public/now_screen.png'), Buffer.from(msg.result.data, 'base64'));
        console.log('Saved public/now_screen.png');
        ws.close();
        process.exit(0);
      }
    };
  });
});
