const http = require('http');

http.get('http://localhost:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      const expr = `(async () => {
        const v = document.querySelector('.ll-section--hero_extended video');
        v.removeAttribute('src');
        v.removeAttribute('data-src');
        v.src = '';
        v.muted = true;
        await v.play().catch(e => console.log('play err:', e));
        return {
          vSrc: v.src,
          vSrcObject: !!v.srcObject,
          vPaused: v.paused,
          vReadyState: v.readyState
        };
      })()`;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, awaitPromise: true, returnByValue: true }
      }));
    };
    ws.onmessage = (e) => {
      console.log('Video state after src clear:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
