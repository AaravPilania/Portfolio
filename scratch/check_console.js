const http = require('http');

http.get('http://localhost:9222/json', res => {
  let raw = '';
  res.on('data', c => raw += c);
  res.on('end', () => {
    const list = JSON.parse(raw);
    const tab = list.find(t => t.url && t.url.includes('localhost:3000'));
    if (!tab) return;
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: 'console.error' } }));
      // Listen to runtime events
      ws.send(JSON.stringify({ id: 2, method: 'Console.enable' }));
      ws.send(JSON.stringify({ id: 3, method: 'Runtime.enable' }));
      // Also evaluate errors or state
      ws.send(JSON.stringify({
        id: 4,
        method: 'Runtime.evaluate',
        params: {
          expression: 'JSON.stringify({ errors: window.__errors || [], hasApp: !!window.$, instances: window.$ ? Array.from(window.$.instances.keys()) : [] })'
        }
      }));
    };
    ws.onmessage = msg => {
      const data = JSON.parse(msg.data);
      if (data.id === 4) {
        console.log('App state:', data.result.result.value);
      }
      if (data.method === 'Runtime.consoleAPICalled' || data.method === 'Runtime.exceptionThrown') {
        console.log('Console event:', JSON.stringify(data.params));
      }
    };
    setTimeout(() => { ws.close(); process.exit(0); }, 2000);
  });
});
