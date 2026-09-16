const http = require('http');
http.get('http://localhost:9222/json', (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tabLocal = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    if (!tabLocal) return console.log('missing tab');

    const ws = new WebSocket(tabLocal.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const hero = document.querySelector('.ll-section--hero_extended');
            const backdropBlock = hero ? hero.querySelector('[data-component="blocks/backdrop_theme"]') : null;
            return {
              heroFound: !!hero,
              backdropBlockFound: !!backdropBlock,
              classes: hero?.className
            };
          })()`,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === 1) {
        console.log(msg.result?.result?.value);
        ws.close();
        process.exit(0);
      }
    };
  });
});
