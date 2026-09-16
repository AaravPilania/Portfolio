const http = require('http');

http.get('http://localhost:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    if (!tab) {
      console.error('No tab on localhost:3000 found');
      return;
    }
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      const expr = `(() => {
        const heroSec = document.querySelector('.ll-section--hero_extended');
        const v = heroSec ? heroSec.querySelector('video') : null;
        const canvas = window.$ ? window.$.instances.get('canvas') : null;
        let heroBackdrop = null;
        if (window.$) {
          window.$.instances.forEach((inst, key) => {
            if (inst && inst.key && inst.key.includes('hero_extended')) {
              heroBackdrop = {
                isWebGL: inst.IS_WEBGL,
                nogrid: inst.nogrid,
                inView: inst.inView,
                hasGridLayer: !!inst.gridLayer,
                u_render_content: inst.gridLayer?.uniforms.get('u_render_content')?.value,
                u_nogrid: inst.gridLayer?.uniforms.get('u_nogrid')?.value,
                u_reveal_progress: inst.gridLayer?.uniforms.get('u_reveal_progress')?.value
              };
            }
          });
        }
        return {
          heroFound: !!heroSec,
          videoFound: !!v,
          videoSrc: v ? v.src : null,
          videoReadyState: v ? v.readyState : null,
          videoNogrid: v ? v.dataset.nogrid : null,
          heroBackdrop
        };
      })()`;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true }
      }));
    };
    ws.onmessage = (e) => {
      console.log('Browser State:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
