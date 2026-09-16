const http = require('http');

http.get('http://localhost:9222/json', res => {
  let raw = '';
  res.on('data', c => raw += c);
  res.on('end', () => {
    const list = JSON.parse(raw);
    const tab = list.find(t => t.url && t.url.includes('localhost:3000'));
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      const expr = `
        (() => {
          const targets = [
            document.documentElement,
            document.body,
            document.getElementById('page'),
            document.querySelector('.js-scroller'),
            document.querySelector('.js-scroll-content'),
            document.querySelector('.ll-section--hero_extended')
          ];
          return targets.filter(Boolean).map(el => ({
            tag: el.tagName,
            id: el.id,
            className: el.className,
            bg: getComputedStyle(el).backgroundColor,
            bgImage: getComputedStyle(el).backgroundImage,
            mixBlendMode: getComputedStyle(el).mixBlendMode,
            color: getComputedStyle(el).color
          }));
        })()
      `;
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
    };
    ws.onmessage = msg => {
      const data = JSON.parse(msg.data);
      if (data.id === 1) {
        console.log(JSON.stringify(data.result.result.value, null, 2));
        ws.close();
      }
    };
  });
});
