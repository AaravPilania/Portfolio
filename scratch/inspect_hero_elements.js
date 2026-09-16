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
            // Find what has avatar or yellow or me.png
            const imgs = Array.from(document.querySelectorAll('img')).map(i => i.src);
            const videos = Array.from(document.querySelectorAll('video')).map(v => ({ src: v.src, currentSrc: v.currentSrc, style: v.getAttribute('style'), className: v.className }));
            const hero = document.querySelector('.ll-section--hero_extended');
            const heroHtml = hero ? hero.outerHTML.substring(0, 500) : 'no hero';
            const heroStyle = hero ? window.getComputedStyle(hero).backgroundColor : 'none';
            const canvas2d = Array.from(document.querySelectorAll('canvas')).map(c => {
              const ctx = c.getContext('2d');
              const gl = c.getContext('webgl') || c.getContext('webgl2');
              return {
                className: c.className,
                type: ctx ? '2d' : (gl ? 'webgl' : 'unknown')
              };
            });
            return { imgs: imgs.slice(0, 10), videos, heroHtml, heroStyle, canvas2d };
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
