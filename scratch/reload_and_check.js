const http = require('http');

http.get('http://localhost:9222/json', res => {
  let raw = '';
  res.on('data', c => raw += c);
  res.on('end', () => {
    const list = JSON.parse(raw);
    const tab = list.find(t => t.url && t.url.includes('localhost:3000'));
    if (!tab) return console.log('No tab');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Console.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 3, method: 'Page.enable' }));
      ws.send(JSON.stringify({ id: 4, method: 'Page.reload', params: { ignoreCache: true } }));
    };
    ws.onmessage = msg => {
      const data = JSON.parse(msg.data);
      if (data.method === 'Runtime.consoleAPICalled') {
        const type = data.params.type;
        const text = data.params.args.map(a => a.value).join(' ');
        if (type === 'error' || type === 'warn') {
          console.log(`[Browser ${type}]:`, text);
        }
      }
      if (data.method === 'Runtime.exceptionThrown') {
        console.log('[Browser Uncaught Exception]:', data.params.exceptionDetails.text, data.params.exceptionDetails.exception?.description);
      }
    };
    setTimeout(() => {
      ws.close();
      console.log('Reload test finished.');
      process.exit(0);
    }, 4500);
  });
});
