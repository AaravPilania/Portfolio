const http = require('http');
const fs = require('fs');

http.get('http://localhost:9222/json', (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    if (!tab) return console.log('no tab');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      // Capture frame 1
      ws.send(JSON.stringify({ id: 1, method: 'Page.captureScreenshot', params: { format: 'png' } }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === 1) {
        fs.writeFileSync('scratch/motion_f1.png', Buffer.from(msg.result.data, 'base64'));
        console.log('Saved motion_f1.png, waiting 350ms for frame 2...');
        setTimeout(() => {
          ws.send(JSON.stringify({ id: 2, method: 'Page.captureScreenshot', params: { format: 'png' } }));
        }, 350);
      } else if (msg.id === 2) {
        fs.writeFileSync('scratch/motion_f2.png', Buffer.from(msg.result.data, 'base64'));
        console.log('Saved motion_f2.png');
        ws.close();
      }
    };
  });
});
