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
      ws.send(JSON.stringify({ id: 1, method: 'Page.captureScreenshot', params: { format: 'png' } }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === 1 && msg.result?.data) {
        fs.writeFileSync('scratch/official_screenshot.png', Buffer.from(msg.result.data, 'base64'));
        console.log('Saved scratch/official_screenshot.png');
        ws.close();
        process.exit(0);
      }
    };
  });
});
