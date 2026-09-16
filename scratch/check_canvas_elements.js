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
        const canvas = window.$?.instances?.get('canvas');
        return {
          animating: canvas?.animating,
          elementsCount: canvas?.elements?.length,
          elements: canvas?.elements?.map(el => ({
            key: el?.key,
            constructor: el?.constructor?.name,
            inView: el?.inView,
            paused: el?.paused,
            canUseWebGL: typeof el?.canUseWebGL === 'function' ? el.canUseWebGL() : null
          }))
        };
      })()`;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true }
      }));
    };
    ws.onmessage = (e) => {
      console.log('Canvas elements:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
