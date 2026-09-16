const http = require('http');
const fs = require('fs');

http.get('http://localhost:9222/json', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', async () => {
    const tabs = JSON.parse(data);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    let msgId = 1;
    const callbacks = {};

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        callbacks[id] = resolve;
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onmessage = (e) => {
      const resp = JSON.parse(e.data);
      if (resp.id && callbacks[resp.id]) {
        callbacks[resp.id](resp.result);
        delete callbacks[resp.id];
      }
    };

    ws.onopen = async () => {
      // Get viewport metrics
      const layout = await send('Page.getLayoutMetrics');
      const w = layout.visualViewport.clientWidth;
      const h = layout.visualViewport.clientHeight;

      // Capture central 500x500 box around center
      const clip = {
        x: Math.round(w / 2 - 250),
        y: Math.round(h / 2 - 250),
        width: 500,
        height: 500,
        scale: 1
      };

      const shot = await send('Page.captureScreenshot', { format: 'png', clip });
      fs.writeFileSync('scratch/ap_center_crop.png', Buffer.from(shot.data, 'base64'));
      console.log('Saved scratch/ap_center_crop.png');
      ws.close();
      process.exit(0);
    };
  });
});
