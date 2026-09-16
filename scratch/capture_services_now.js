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
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const sec = document.querySelector('.ll-section--services');
            if (!sec) return { error: 'no services section' };
            sec.scrollIntoView({ behavior: 'instant', block: 'center' });
            return {
              top: sec.getBoundingClientRect().top,
              height: sec.getBoundingClientRect().height
            };
          })()`,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === 1) {
        console.log('Scrolled to services:', msg.result?.result?.value);
        setTimeout(() => {
          ws.send(JSON.stringify({ id: 2, method: 'Page.captureScreenshot', params: { format: 'png' } }));
        }, 800);
      } else if (msg.id === 2) {
        fs.writeFileSync('scratch/current_services_view.png', Buffer.from(msg.result.data, 'base64'));
        console.log('Saved scratch/current_services_view.png');
        ws.close();
      }
    };
  });
});
