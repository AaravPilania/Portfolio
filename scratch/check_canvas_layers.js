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
        const heroBt = (() => {
          let h = null;
          window.$?.instances?.get('page')?.instances?.forEach((v, k) => {
            if (v?.key?.includes('hero_extended')) h = v;
          });
          return h;
        })();
        return {
          canvasFound: !!canvas,
          canvasAnimating: canvas?.animating,
          canvasPaused: canvas?.paused,
          canvasLayersCount: canvas?.layers?.length,
          canvasLayers: canvas?.layers?.map(l => l.key || l.type || l.constructor?.name),
          heroBtInCanvas: canvas?.layers?.includes(heroBt),
          heroBtInView: heroBt?.inView,
          heroBtPaused: heroBt?.paused
        };
      })()`;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true }
      }));
    };
    ws.onmessage = (e) => {
      console.log('Canvas state:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
