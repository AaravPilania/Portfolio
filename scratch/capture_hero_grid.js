const http = require('http');
const fs = require('fs');

http.get('http://localhost:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Page.captureScreenshot',
        params: { format: 'png' }
      }));
    };
    ws.onmessage = (e) => {
      const resp = JSON.parse(e.data);
      if (resp.result?.data) {
        fs.writeFileSync('scratch/hero_grid_test.png', Buffer.from(resp.result.data, 'base64'));
        console.log('Saved scratch/hero_grid_test.png');
      }
      ws.close();
      process.exit(0);
    };
  });
});
