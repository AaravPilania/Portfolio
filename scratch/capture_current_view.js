const http = require('http');
const fs = require('fs');

http.get('http://localhost:9222/json', res => {
  let raw = '';
  res.on('data', c => raw += c);
  res.on('end', () => {
    const list = JSON.parse(raw);
    const tab = list.find(t => t.url && t.url.includes('localhost:3000'));
    if (!tab) {
      console.log('No tab found on port 9222');
      return;
    }
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Page.captureScreenshot', params: { format: 'png' } }));
    };
    ws.onmessage = msg => {
      const data = JSON.parse(msg.data);
      if (data.id === 1 && data.result && data.result.data) {
        fs.writeFileSync('scratch/live_now.png', Buffer.from(data.result.data, 'base64'));
        console.log('Saved scratch/live_now.png');
        ws.close();
      }
    };
  });
});
