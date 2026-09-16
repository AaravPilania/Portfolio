const http = require('http');
const fs = require('fs');

http.get('http://localhost:9222/json', (res) => {
  let raw = '';
  res.on('data', c => raw += c);
  res.on('end', async () => {
    const list = JSON.parse(raw);
    const tab = list.find(t => t.type === 'page');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    ws.onopen = async () => {
      console.log('Capturing frame 1...');
      ws.send(JSON.stringify({ id: 1, method: 'Page.captureScreenshot', params: { format: 'png' } }));
      await new Promise(r => setTimeout(r, 120));
      console.log('Capturing frame 2...');
      ws.send(JSON.stringify({ id: 2, method: 'Page.captureScreenshot', params: { format: 'png' } }));
      await new Promise(r => setTimeout(r, 120));
      console.log('Capturing frame 3...');
      ws.send(JSON.stringify({ id: 3, method: 'Page.captureScreenshot', params: { format: 'png' } }));
    };

    let count = 0;
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.result && msg.result.data) {
        count++;
        fs.writeFileSync('scratch/scribble_frame_' + count + '.png', Buffer.from(msg.result.data, 'base64'));
        console.log('Saved scratch/scribble_frame_' + count + '.png');
        if (count === 3) {
          ws.close();
          process.exit(0);
        }
      }
    };
  });
});