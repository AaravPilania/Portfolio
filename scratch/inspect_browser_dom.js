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
            const canvases = Array.from(document.querySelectorAll('canvas')).map(c => ({
              className: c.className,
              id: c.id,
              width: c.width,
              height: c.height,
              style: c.getAttribute('style'),
              parent: c.parentElement ? c.parentElement.tagName + '.' + c.parentElement.className : null
            }));
            const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src || s.innerText.substring(0, 50));
            const globals = Object.keys(window).filter(k => k.toLowerCase().includes('avatar') || k.toLowerCase().includes('hero') || k.toLowerCase().includes('portrait'));
            return { canvases, scripts, globals, bodyBg: document.body.style.backgroundColor, htmlBg: document.documentElement.style.backgroundColor };
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
