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
      console.log('Sending Page.reload...');
      ws.send(JSON.stringify({ id: 1, method: 'Page.reload', params: { ignoreCache: true } }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === 1) {
        console.log('Reload triggered. Waiting 3s to capture screenshot...');
        setTimeout(() => {
          ws.send(JSON.stringify({ id: 2, method: 'Page.captureScreenshot', params: { format: 'png' } }));
        }, 3000);
      } else if (msg.id === 2 && msg.result?.data) {
        fs.writeFileSync(path.join(__dirname, '../public/after_reload_screen.png'), Buffer.from(msg.result.data, 'base64'));
        console.log('Saved public/after_reload_screen.png');
        ws.close();
        process.exit(0);
      }
    };
  });
});
