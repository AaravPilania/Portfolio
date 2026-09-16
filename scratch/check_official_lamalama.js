const http = require('http');

http.get('http://localhost:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('lamalama.com') && t.webSocketDebuggerUrl);
    if (!tab) { console.log('No lamalama.com tab found on 9222'); return; }
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      const expr = `(() => {
        const hStyle = window.getComputedStyle(document.documentElement);
        const bStyle = window.getComputedStyle(document.body);
        const m = document.querySelector('main');
        const mStyle = m ? window.getComputedStyle(m) : null;
        const scroller = document.querySelector('.ll-scroller');
        const scrollerStyle = scroller ? window.getComputedStyle(scroller) : null;
        return {
          html: { pos: hStyle.position, overflowY: hStyle.overflowY, height: hStyle.height },
          body: { pos: bStyle.position, overflowY: bStyle.overflowY, height: bStyle.height },
          main: { pos: mStyle?.position, overflowY: mStyle?.overflowY, height: mStyle?.height },
          scroller: { pos: scrollerStyle?.position, overflowY: scrollerStyle?.overflowY, height: scrollerStyle?.height, scrollHeight: scroller?.scrollHeight },
          windowScrollY: window.scrollY,
          scrollerScrollTop: scroller?.scrollTop
        };
      })()`;
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
    };
    ws.onmessage = (e) => {
      console.log('LAMA LAMA ORIGINAL STYLES:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
