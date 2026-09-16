const http = require('http');
http.get('http://localhost:9222/json', (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tabLama = tabs.find(t => t.url.includes('lamalama.com') && t.webSocketDebuggerUrl);
    if (!tabLama) return console.log('no lamalama tab');
    const ws = new WebSocket(tabLama.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            // Check all global variables or window properties that have 'instances'
            const hasInstances = [];
            for (const key of Object.getOwnPropertyNames(window)) {
              try {
                if (window[key] && window[key].instances) hasInstances.push(key);
              } catch(e) {}
            }
            return { hasInstances };
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
