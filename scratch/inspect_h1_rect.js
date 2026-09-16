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
            const hero = document.querySelector('.ll-section--hero_extended');
            const h1 = hero ? hero.querySelector('h1') : null;
            const h1Rect = h1 ? h1.getBoundingClientRect() : null;
            const heroRect = hero ? hero.getBoundingClientRect() : null;
            const backdropVideo = hero ? hero.querySelector('.js-backdrop-video-item') : null;
            const video = backdropVideo ? backdropVideo.querySelector('video') : null;
            return {
              heroRect: heroRect ? { top: heroRect.top, left: heroRect.left, width: heroRect.width, height: heroRect.height } : null,
              h1Rect: h1Rect ? { top: h1Rect.top, left: h1Rect.left, width: h1Rect.width, height: h1Rect.height } : null,
              h1Text: h1 ? h1.innerText : null,
              h1Color: h1 ? window.getComputedStyle(h1).color : null,
              h1Opacity: h1 ? window.getComputedStyle(h1).opacity : null,
              h1Visibility: h1 ? window.getComputedStyle(h1).visibility : null,
              h1Parent: h1 ? h1.parentElement.className : null,
              video: video ? { src: video.src, currentSrc: video.currentSrc, paused: video.paused, opacity: window.getComputedStyle(video).opacity } : null,
              backdropVideoOpacity: backdropVideo ? window.getComputedStyle(backdropVideo).opacity : null
            };
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
