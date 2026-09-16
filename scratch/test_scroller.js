const http = require('http');
const fs = require('fs');

http.get('http://localhost:9222/json', res => {
  let raw = '';
  res.on('data', c => raw += c);
  res.on('end', async () => {
    const list = JSON.parse(raw);
    const tab = list.find(t => t.url && t.url.includes('localhost:3000') && !t.url.includes('coded-avatar'));
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 1000000);
        const timeout = setTimeout(() => {
          ws.removeEventListener('message', handler);
          reject(new Error(`Timeout for ${method}`));
        }, 10000);

        const handler = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === id) {
            clearTimeout(timeout);
            ws.removeEventListener('message', handler);
            resolve(msg.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onopen = async () => {
      console.log('Connected to CDP');

      // Scroll to 400px
      await send('Runtime.evaluate', {
        expression: `(() => {
          const s = document.querySelector('.js-scroller');
          s.scrollTop = 400;
          s.dispatchEvent(new Event('scroll'));
          window.dispatchEvent(new Event('scroll'));
          return s.scrollTop;
        })()`
      });
      await new Promise(r => setTimeout(r, 600));

      let shot = await send('Page.captureScreenshot', { format: 'png' });
      if (shot?.data) {
        fs.writeFileSync('scratch/scroll_400px.png', Buffer.from(shot.data, 'base64'));
        console.log('Saved scratch/scroll_400px.png');
      }

      // Scroll to 800px
      await send('Runtime.evaluate', {
        expression: `(() => {
          const s = document.querySelector('.js-scroller');
          s.scrollTop = 800;
          s.dispatchEvent(new Event('scroll'));
          window.dispatchEvent(new Event('scroll'));
          return s.scrollTop;
        })()`
      });
      await new Promise(r => setTimeout(r, 600));

      shot = await send('Page.captureScreenshot', { format: 'png' });
      if (shot?.data) {
        fs.writeFileSync('scratch/scroll_800px.png', Buffer.from(shot.data, 'base64'));
        console.log('Saved scratch/scroll_800px.png');
      }

      // Scroll to 1200px
      await send('Runtime.evaluate', {
        expression: `(() => {
          const s = document.querySelector('.js-scroller');
          s.scrollTop = 1200;
          s.dispatchEvent(new Event('scroll'));
          window.dispatchEvent(new Event('scroll'));
          return s.scrollTop;
        })()`
      });
      await new Promise(r => setTimeout(r, 600));

      shot = await send('Page.captureScreenshot', { format: 'png' });
      if (shot?.data) {
        fs.writeFileSync('scratch/scroll_1200px.png', Buffer.from(shot.data, 'base64'));
        console.log('Saved scratch/scroll_1200px.png');
      }

      ws.close();
      process.exit(0);
    };
  });
});
