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
        const page = window.$?.instances.get('page');
        const pageInsts = [];
        if (page?.instances) {
          page.instances.forEach((v, k) => {
            pageInsts.push({
              keyComponent: k?.dataset?.component || (typeof k === 'string' ? k : k?.className?.slice(0, 30)),
              valName: v?.constructor?.name,
              isGl: v?.IS_WEBGL,
              nogrid: v?.nogrid,
              hasGridLayer: !!v?.gridLayer,
              sectionClass: v?.section?.className?.slice(0, 40)
            });
          });
        }
        return {
          hasPage: !!page,
          instCount: page?.instances?.size,
          pageInsts
        };
      })()`;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true }
      }));
    };
    ws.onmessage = (e) => {
      console.log('Page instances:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
