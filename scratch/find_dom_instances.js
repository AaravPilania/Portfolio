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
        const arr = [];
        window.$.instances.forEach((v, k) => {
          if (k instanceof HTMLElement) {
            arr.push({
              tag: k.tagName,
              component: k.dataset.component,
              class: k.className.slice(0, 30),
              instName: v?.constructor?.name,
              isGl: v?.IS_WEBGL,
              nogrid: v?.nogrid,
              hasLayers: !!(v?.gridLayer || v?.sectionLayer)
            });
          }
        });
        return arr;
      })()`;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true }
      }));
    };
    ws.onmessage = (e) => {
      console.log('DOM instances in $.instances:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
