const http = require('http');
const fs = require('fs');

http.get('http://localhost:9222/json', (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('lamalama.com') && t.webSocketDebuggerUrl);
    if (!tab) return console.log('no lamalama tab');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `document.querySelector('main#page') ? document.querySelector('main#page').outerHTML : null`,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === 1) {
        const html = msg.result?.result?.value;
        if (html) {
          console.log('Got main#page HTML! Length:', html.length);
          fs.writeFileSync('scratch/official_main_page.html', html);
          console.log('Saved scratch/official_main_page.html');
        } else {
          console.log('main#page not found or empty');
        }
        ws.close();
        process.exit(0);
      }
    };
  });
});
