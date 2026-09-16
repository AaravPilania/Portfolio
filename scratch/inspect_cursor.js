const http = require('http');

http.get('http://localhost:9222/json', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const tabs = JSON.parse(data);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    if (!tab) {
      console.log('Tab not found');
      process.exit(1);
    }
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      const code = `(() => {
        const cursorEls = Array.from(document.querySelectorAll('*')).filter(el => {
          const str = (el.className || '') + ' ' + (el.id || '');
          return /cursor|pointer|follower|circle|dot/i.test(str);
        }).map(el => ({
          tag: el.tagName,
          id: el.id,
          class: el.className,
          style: el.getAttribute('style'),
          rect: el.getBoundingClientRect()
        }));
        return {
          title: document.title,
          cursorEls: cursorEls,
          bodyChildren: Array.from(document.body.children).map(c => ({
            tag: c.tagName,
            id: c.id,
            className: c.className
          }))
        };
      })()`;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: code, returnByValue: true }
      }));
    };
    ws.onmessage = (e) => {
      const resp = JSON.parse(e.data);
      if (resp.id === 1) {
        console.log(JSON.stringify(resp.result?.result?.value || resp.result, null, 2));
        ws.close();
        process.exit(0);
      }
    };
  });
});
