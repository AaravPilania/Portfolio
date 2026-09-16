const http = require('http');
const fs = require('fs');

http.get('http://localhost:9222/json', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', async () => {
    const tabs = JSON.parse(data);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    if (!tab) {
      console.log('No localhost:3000 tab');
      process.exit(1);
    }
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
      console.log('Reloading page...');
      await send('Page.reload', { ignoreCache: true });

      // Wait 1.5s (intro AP visible)
      await new Promise(r => setTimeout(r, 1500));
      let shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('scratch/ap_shape_1500ms.png', Buffer.from(shot.data, 'base64'));
      console.log('Captured scratch/ap_shape_1500ms.png');

      // Wait another 1.2s (t = 2.7s)
      await new Promise(r => setTimeout(r, 1200));
      shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('scratch/ap_shape_2700ms.png', Buffer.from(shot.data, 'base64'));
      console.log('Captured scratch/ap_shape_2700ms.png');

      // Wait until loaded (t = 4.0s) and inspect cursor elements
      await new Promise(r => setTimeout(r, 1500));
      const evalCursor = await send('Runtime.evaluate', {
        expression: `(() => {
          const dot = document.querySelector('.ll-cursor-dot');
          const ring = document.querySelector('.ll-cursor-ring');
          return {
            dotExists: !!dot,
            ringExists: !!ring,
            dotDisplay: dot ? window.getComputedStyle(dot).display : null,
            ringDisplay: ring ? window.getComputedStyle(ring).display : null
          };
        })()`,
        returnByValue: true
      });
      console.log('Cursor elements status:', evalCursor.result?.value);

      shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('scratch/hero_cursor_removed.png', Buffer.from(shot.data, 'base64'));
      console.log('Captured scratch/hero_cursor_removed.png');

      ws.close();
      process.exit(0);
    };
  });
});
