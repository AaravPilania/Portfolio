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
        const els = document.querySelectorAll('[data-component="blocks/backdrop_theme"]');
        const results = [];
        els.forEach(el => {
          const inst = window.$?.instances.get(el);
          results.push({
            parentSection: el.closest('section')?.className,
            instFound: !!inst,
            instName: inst?.constructor?.name,
            isGl: inst?.IS_WEBGL,
            hasGridLayer: !!inst?.gridLayer,
            hasSectionLayer: !!inst?.sectionLayer,
            backdropContentTag: inst?.backdropContent?.tagName,
            backdropContentClass: inst?.backdropContent?.className,
            nogrid: inst?.nogrid,
            inView: inst?.inView
          });
        });
        return results;
      })()`;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true }
      }));
    };
    ws.onmessage = (e) => {
      console.log('backdrop_theme elements:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
