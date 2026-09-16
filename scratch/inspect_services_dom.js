const http = require('http');

http.get('http://localhost:9222/json', (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    if (!tab) return console.log('no tab');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const sec = document.querySelector('.ll-section--services');
            return {
              html: sec ? sec.innerHTML.substring(0, 1500) : null,
              classes: sec ? sec.className : null,
              dataset: sec ? Object.assign({}, sec.dataset) : null,
              buttons: sec ? [...sec.querySelectorAll('a, button')].map(b => ({
                text: b.innerText.trim(),
                className: b.className,
                rect: b.getBoundingClientRect()
              })) : []
            };
          })()`,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = (e) => {
      console.log('Services DOM:', JSON.stringify(JSON.parse(e.data).result?.result?.value, null, 2));
      ws.close();
    };
  });
});
