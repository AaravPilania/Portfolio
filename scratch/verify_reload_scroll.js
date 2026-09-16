const http = require('http');

http.get('http://localhost:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    if (!tab) { console.log('No tab found on 9222'); return; }
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Page.reload' }));
      setTimeout(() => {
        const expr = `(() => {
          return {
            scrollHeight: document.documentElement.scrollHeight,
            clientHeight: document.documentElement.clientHeight,
            htmlPos: window.getComputedStyle(document.documentElement).position,
            bodyPos: window.getComputedStyle(document.body).position,
            mainPos: window.getComputedStyle(document.querySelector('main')).position,
            scrollY: window.scrollY
          };
        })()`;
        ws.send(JSON.stringify({ id: 2, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
      }, 1500);
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === 2) {
        console.log('After reload:', msg.result?.result?.value);
        ws.close();
        process.exit(0);
      }
    };
  });
});
