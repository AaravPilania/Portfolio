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
      return new Promise((resolve) => {
        const id = Math.floor(Math.random() * 1000000);
        const handler = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === id) {
            ws.removeEventListener('message', handler);
            resolve(msg.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onopen = async () => {
      await send('Runtime.evaluate', {
        expression: `(() => {
          const s = document.querySelector('.js-scroller');
          s.scrollTop = 3500;
          s.dispatchEvent(new Event('scroll'));
          window.dispatchEvent(new Event('scroll'));
        })()`
      });
      await new Promise(r => setTimeout(r, 800));

      const shot = await send('Page.captureScreenshot', { format: 'png' });
      if (shot?.data) {
        fs.writeFileSync('scratch/services_section_verified.png', Buffer.from(shot.data, 'base64'));
        console.log('Saved scratch/services_section_verified.png');
      }
      ws.close();
      process.exit(0);
    };
  });
});
