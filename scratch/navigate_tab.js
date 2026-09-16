const http = require('http');

http.get('http://localhost:9222/json', (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => (t.url.includes('localhost:3000') || t.url.includes('chrome-error')) && t.webSocketDebuggerUrl);
    if (!tab) return console.log('no tab');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      console.log('Navigating tab to http://localhost:3000/...');
      ws.send(JSON.stringify({
        id: 1,
        method: 'Page.navigate',
        params: { url: 'http://localhost:3000/' }
      }));
    };
    ws.onmessage = (e) => {
      console.log('Navigated:', e.data);
      setTimeout(() => ws.close(), 1000);
    };
  });
});
