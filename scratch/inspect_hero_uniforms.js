const http = require('http');

http.get('http://localhost:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      const expr = `(() => {
        const page = window.$?.instances.get('page');
        let heroBt = null;
        if (page?.instances) {
          page.instances.forEach((v, k) => {
            const sec = (k instanceof HTMLElement ? k.closest('section') : v?.section);
            if (sec?.className?.includes('hero_extended') && k?.dataset?.component === 'blocks/backdrop_theme') {
              heroBt = v;
            }
          });
        }
        if (!heroBt || !heroBt.gridLayer) return null;
        const u = {};
        heroBt.gridLayer.uniforms.forEach((val, key) => {
          u[key] = val.value;
        });
        return {
          uniforms: u,
          revealProgress: heroBt.revealProgress,
          inView: heroBt.inView,
          paused: heroBt.paused,
          canUseWebGL: heroBt.canUseWebGL(),
          theme: heroBt.theme,
          selectedTheme: heroBt.selectedTheme
        };
      })()`;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true }
      }));
    };
    ws.onmessage = (e) => {
      console.log('Hero uniforms:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
