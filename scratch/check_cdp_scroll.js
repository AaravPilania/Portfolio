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
      const expr = `(() => {
        const hStyle = window.getComputedStyle(document.documentElement);
        const bStyle = window.getComputedStyle(document.body);
        const m = document.querySelector('main');
        const mStyle = m ? window.getComputedStyle(m) : null;
        return {
          htmlOverflow: hStyle.overflowY,
          htmlPos: hStyle.position,
          bodyOverflow: bStyle.overflowY,
          bodyPos: bStyle.position,
          mainPos: mStyle ? mStyle.position : null,
          mainOverflow: mStyle ? mStyle.overflowY : null,
          scrollHeight: document.documentElement.scrollHeight,
          clientHeight: document.documentElement.clientHeight
        };
      })()`;
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
    };
    ws.onmessage = (e) => {
      console.log('Page scroll state:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
}).on('error', (e) => console.log('CDP error:', e.message));
