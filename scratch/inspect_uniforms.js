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
            const page = window.$?.instances?.get('page');
            let heroBt = null;
            if (page?.instances) {
              page.instances.forEach((v, k) => {
                if (v?.key?.includes('hero_extended')) heroBt = v;
              });
            }
            if (!heroBt || !heroBt.gridLayer) return { error: 'no heroBt' };
            const unis = {};
            heroBt.gridLayer.uniforms.forEach((v, k) => {
              unis[k] = v.value;
            });
            return {
              uniforms: unis,
              inView: heroBt.inView,
              paused: heroBt.paused,
              canUseWebGL: heroBt.canUseWebGL(),
              composerCanvas: heroBt.composer?.canvas?.className,
              canvasList: [...document.querySelectorAll('.js-canvas')].map(c => ({
                w: c.width, h: c.height, style: c.style.cssText, opacity: window.getComputedStyle(c).opacity
              }))
            };
          })()`,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = (e) => {
      console.log('Uniforms inspection:', JSON.stringify(JSON.parse(e.data).result?.result?.value, null, 2));
      ws.close();
    };
  });
});
