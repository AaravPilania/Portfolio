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
            const canvases = Array.from(document.querySelectorAll("canvas")).map(c => ({
              className: c.className,
              width: c.width,
              height: c.height,
              style: c.getAttribute('style'),
              dataset: Object.assign({}, c.dataset)
            }));
            const backdropThemes = Array.from(document.querySelectorAll("[data-component*='backdrop_theme']")).map(b => ({
              sectionClass: b.closest("section")?.className,
              theme: b.closest("section")?.dataset.theme,
              hasVideo: !!b.querySelector("video")
            }));
            return { canvases, backdropThemes };
          })()`,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === 1) {
        console.log('Canvases & Backdrops:', JSON.stringify(msg.result?.result?.value, null, 2));
        ws.close();
        process.exit(0);
      }
    };
  });
});
