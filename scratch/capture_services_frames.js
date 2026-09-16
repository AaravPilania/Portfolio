const http = require('http');
const fs = require('fs');

http.get('http://localhost:9222/json', (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    if (!tab) return console.log('no tab');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    function screenshot(name) {
      return new Promise((resolve) => {
        const id = Math.floor(Math.random() * 100000);
        const handler = (msg) => {
          const data = JSON.parse(msg.data);
          if (data.id === id) {
            ws.removeEventListener('message', handler);
            if (data.result?.data) {
              fs.writeFileSync(`scratch/${name}`, Buffer.from(data.result.data, 'base64'));
              console.log(`Saved scratch/${name}`);
            }
            resolve();
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method: 'Page.captureScreenshot', params: { format: 'png' } }));
      });
    }

    ws.onopen = async () => {
      await screenshot('services_frame1.png');
      await new Promise(r => setTimeout(r, 250));
      await screenshot('services_frame2.png');
      ws.close();
    };
  });
});
