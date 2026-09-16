const http = require('http');

http.get('http://localhost:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      const expr = `(() => {
        document.documentElement.scrollTop = 500;
        document.body.scrollTop = 500;
        window.scrollBy(0, 500);
        return {
          windowScrollY: window.scrollY,
          htmlScrollTop: document.documentElement.scrollTop,
          bodyScrollTop: document.body.scrollTop,
          scrollingElem: document.scrollingElement?.tagName,
          hasWheelListener: typeof window.onwheel,
          activeElement: document.activeElement?.tagName
        };
      })()`;
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
    };
    ws.onmessage = (e) => {
      console.log('Scroll details:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
