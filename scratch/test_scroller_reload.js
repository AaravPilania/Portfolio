const http = require('http');

http.get('http://localhost:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const localTab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    if (!localTab) return;
    const ws = new WebSocket(localTab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Page.reload' }));
      setTimeout(() => {
        const expr = `(() => {
          const s = document.querySelector('.ll-scroller');
          const flex = document.querySelector('.ll-flexible');
          return {
            scrollerScrollHeight: s ? s.scrollHeight : null,
            scrollerClientHeight: s ? s.clientHeight : null,
            parentOfFlex: flex ? flex.parentElement.className : null
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
