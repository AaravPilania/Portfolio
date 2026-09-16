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
        const sec = document.querySelector('.ll-section--hero_extended');
        const r = sec?.getBoundingClientRect();
        return {
          found: !!sec,
          r: r ? { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom } : null,
          styleDisplay: sec?.style?.display,
          computedDisplay: sec ? window.getComputedStyle(sec).display : null,
          computedOpacity: sec ? window.getComputedStyle(sec).opacity : null,
          parentTag: sec?.parentNode?.tagName,
          parentClass: sec?.parentNode?.className
        };
      })()`;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true }
      }));
    };
    ws.onmessage = (e) => {
      console.log('Hero section geom:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
