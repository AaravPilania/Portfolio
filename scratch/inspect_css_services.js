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
            const el = document.querySelector('.ll-section--services .ll-block--service-column');
            const tldr = document.querySelector('.ll-section--services .ll-body-rg');
            const sheets = [...document.styleSheets].map(s => s.href);
            return {
              sheets,
              elFound: !!el,
              elChildren: el ? [...el.children].map(c => ({ tag: c.tagName, class: c.className, display: window.getComputedStyle(c).display })) : null,
              tldrDisplay: tldr ? window.getComputedStyle(tldr).display : null,
              tldrClass: tldr ? tldr.className : null
            };
          })()`,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = (e) => {
      console.log('Result:', JSON.stringify(JSON.parse(e.data).result?.result?.value, null, 2));
      ws.close();
    };
  });
});
