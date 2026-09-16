const http = require('http');

http.get('http://localhost:9222/json', res => {
  let raw = ''; res.on('data', c => raw += c);
  res.on('end', () => {
    const list = JSON.parse(raw);
    const tab = list.find(t => t.url && t.url.includes('localhost:3000'));
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            try {
              const sec = document.querySelector('.ll-section--services');
              const cs = window.getComputedStyle(sec);
              return {
                paddingTop: cs.paddingTop,
                paddingBottom: cs.paddingBottom,
                height: cs.height,
                clientHeight: sec.clientHeight,
                offsetTop: sec.offsetTop
              };
            } catch(e) {
              return { error: e.message };
            }
          })()`,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = e => {
      console.log('Result:', JSON.parse(e.data).result?.result?.value);
      ws.close();
    };
  });
});
