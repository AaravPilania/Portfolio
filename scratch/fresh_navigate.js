const http = require('http');

http.get('http://localhost:9222/json', res => {
  let raw = '';
  res.on('data', c => raw += c);
  res.on('end', () => {
    const list = JSON.parse(raw);
    const tab = list.find(t => t.url && t.url.includes('localhost:3000'));
    if (!tab) return console.log('No tab');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    const logs = [];
    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Log.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Console.enable' }));
      ws.send(JSON.stringify({ id: 3, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 4, method: 'Page.enable' }));
      // Clear console
      ws.send(JSON.stringify({ id: 5, method: 'Console.clearMessages' }));
      // Navigate fresh
      ws.send(JSON.stringify({ id: 6, method: 'Page.navigate', params: { url: 'http://localhost:3000/' } }));
    };
    ws.onmessage = msg => {
      const data = JSON.parse(msg.data);
      if (data.method === 'Runtime.consoleAPICalled') {
        const text = data.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
        logs.push(`[${data.params.type}] ${text}`);
      }
      if (data.method === 'Runtime.exceptionThrown') {
        logs.push(`[UNCAUGHT] ${data.params.exceptionDetails.text}: ${data.params.exceptionDetails.exception?.description}`);
      }
      if (data.method === 'Log.entryAdded') {
        logs.push(`[LOG ${data.params.entry.level}] ${data.params.entry.text}`);
      }
    };
    setTimeout(() => {
      console.log('=== Console Logs from Fresh Navigation ===');
      console.log(logs.length ? logs.join('\n') : 'NO ERRORS! Completely clean console!');
      ws.close();
      process.exit(0);
    }, 4500);
  });
});
