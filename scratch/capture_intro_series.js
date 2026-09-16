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
      await send('Page.reload', { ignoreCache: true });

      // Poll every 250ms from 2000ms to 3500ms
      await new Promise(r => setTimeout(r, 2000));
      for (let i = 0; i < 6; i++) {
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(`scratch/intro_step_${i}.png`, Buffer.from(shot.data, 'base64'));
        await new Promise(r => setTimeout(r, 250));
      }
      console.log('Captured 6 intro frames');
      ws.close();
      process.exit(0);
    };
  });
});
