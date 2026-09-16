const http = require('http');

http.get('http://localhost:9222/json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const tabs = JSON.parse(data);
      console.log('Tabs:', tabs.map(t => ({ id: t.id, title: t.title, url: t.url, ws: t.webSocketDebuggerUrl })));
    } catch(err) {
      console.error(err);
    }
  });
}).on('error', (err) => {
  console.error('HTTP error:', err.message);
});
