const http = require('http');

http.get('http://localhost:9222/json', (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    if (!tab) return console.log('no tab');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    function evaluate(expr) {
      return new Promise((resolve) => {
        const id = Math.floor(Math.random() * 100000);
        const handler = (msg) => {
          const data = JSON.parse(msg.data);
          if (data.id === id) {
            ws.removeEventListener('message', handler);
            resolve(data.result?.result?.value);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
      });
    }

    ws.onopen = async () => {
      // Reload page
      await new Promise((resolve) => {
        const handler = (msg) => {
          const data = JSON.parse(msg.data);
          if (data.method === 'Page.loadEventFired') {
            ws.removeEventListener('message', handler);
            resolve();
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Page.reload', params: { ignoreCache: true } }));
      });

      await new Promise(r => setTimeout(r, 2000));

      const res = await evaluate(`(() => {
        const tldr = document.querySelector('.ll-section--services .ll-body-rg');
        const col = document.querySelector('.ll-section--services .ll-block--service-column');
        const sheets = [...document.styleSheets].map(s => s.href);
        return {
          sheets,
          tldrDisplay: tldr ? window.getComputedStyle(tldr).display : null,
          colChildren: col ? [...col.children].map(c => ({ tag: c.tagName, class: c.className, display: window.getComputedStyle(c).display })) : null
        };
      })()`);
      console.log('Result after reload:', JSON.stringify(res, null, 2));
      ws.close();
    };
  });
});
