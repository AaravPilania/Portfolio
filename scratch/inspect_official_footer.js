const http = require('http');
http.get('http://localhost:9222/json', (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('lamalama.com') && t.webSocketDebuggerUrl);
    if (!tab) return console.log('no tab');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const footer = document.querySelector('footer');
            const scroller = document.querySelector('.ll-scroller');
            const scrollContent = document.querySelector('.js-scroll-content');
            return {
              footerParent: footer ? footer.parentElement.tagName + '.' + footer.parentElement.className : 'no footer',
              footerInScroller: scroller ? scroller.contains(footer) : false,
              footerInScrollContent: scrollContent ? scrollContent.contains(footer) : false,
              scrollerChildren: Array.from(scroller.children).map(c => c.tagName + '.' + c.className),
              scrollContentChildren: scrollContent ? Array.from(scrollContent.children).map(c => c.tagName + '.' + c.className) : []
            };
          })()`,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === 1) {
        console.log(JSON.stringify(msg.result?.result?.value, null, 2));
        ws.close();
        process.exit(0);
      }
    };
  });
});
