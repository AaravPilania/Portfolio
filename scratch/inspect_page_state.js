const http = require('http');
http.get('http://localhost:9222/json', res => {
  let raw = '';
  res.on('data', c => raw += c);
  res.on('end', () => {
    const list = JSON.parse(raw);
    const tab = list.find(t => t.url && t.url.includes('localhost:3000') && !t.url.includes('coded-avatar'));
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      const code = `(() => {
        const canvases = Array.from(document.querySelectorAll('canvas')).map(c => ({
          id: c.id,
          className: c.className,
          width: c.width,
          height: c.height,
          style: c.getAttribute('style'),
          parent: c.parentElement?.tagName + '.' + c.parentElement?.className
        }));
        const hero = document.querySelector('.ll-section--hero_extended');
        const heroBg = hero ? window.getComputedStyle(hero).backgroundColor : 'none';
        const pageBg = window.getComputedStyle(document.body).backgroundColor;
        const work = document.querySelector('#work');
        return { canvases, heroBg, pageBg, workOffsetTop: work ? work.offsetTop : null };
      })()`;
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: code, returnByValue: true } }));
    };
    ws.onmessage = e => {
      const msg = JSON.parse(e.data);
      if (msg.id === 1) {
        console.log(JSON.stringify(msg.result?.result?.value, null, 2));
        ws.close();
        process.exit(0);
      }
    };
  });
});
