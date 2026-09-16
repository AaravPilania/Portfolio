const http = require('http');
http.get('http://localhost:9222/json', (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('lamalama.com') && t.webSocketDebuggerUrl);
    if (!tab) return console.log('no tab');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const hero = document.querySelector('.ll-section--hero_extended');
            const vids = hero ? Array.from(hero.querySelectorAll('video')).map(v => ({
              src: v.src,
              currentSrc: v.currentSrc,
              paused: v.paused,
              readyState: v.readyState,
              style: v.getAttribute('style'),
              className: v.className,
              parentStyle: window.getComputedStyle(v.parentElement).opacity
            })) : [];
            const canvas = document.querySelector('.js-canvas');
            return { vids, heroOuter: hero ? hero.outerHTML.substring(0, 800) : null };
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
