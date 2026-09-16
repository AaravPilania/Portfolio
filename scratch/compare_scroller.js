const http = require('http');

// Compare localhost:3000 and lamalama.com scroller elements
http.get('http://localhost:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const localTab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    const remoteTab = tabs.find(t => t.url.includes('lamalama.com') && t.webSocketDebuggerUrl);

    if (localTab) {
      const ws = new WebSocket(localTab.webSocketDebuggerUrl);
      ws.onopen = () => {
        const expr = `(() => {
          const s = document.querySelector('.ll-scroller');
          return {
            exists: !!s,
            scrollHeight: s?.scrollHeight,
            clientHeight: s?.clientHeight,
            scrollTop: s?.scrollTop,
            style: s ? {
              overflowY: window.getComputedStyle(s).overflowY,
              position: window.getComputedStyle(s).position,
              pointerEvents: window.getComputedStyle(s).pointerEvents,
              zIndex: window.getComputedStyle(s).zIndex
            } : null
          };
        })()`;
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
      };
      ws.onmessage = (e) => {
        console.log('LOCAL SCROLLER:', JSON.parse(e.data).result?.result?.value);
        ws.close();
      };
    }
  });
});
