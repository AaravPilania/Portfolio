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
            if (v?.key?.includes('hero_extended') || (k?.dataset?.component === 'blocks/backdrop_theme' && k?.closest('.ll-section--hero_extended'))) {
              heroBt = v;
            }
          });
        }
        if (!heroBt || !heroBt.gridLayer) return { error: 'heroBt not found' };

        // Create a test canvas with red and green stripes
        const testC = document.createElement('canvas');
        testC.width = 512;
        testC.height = 512;
        const ctx = testC.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = 'black';
        ctx.fillRect(100, 100, 312, 312);

        const contentUniform = heroBt.gridLayer.uniforms.get('u_content');
        if (contentUniform && contentUniform.value) {
          contentUniform.value.player = testC;
          heroBt.gridLayer.uniforms.set('u_content_dimensions', { value: [512, 512] });
          heroBt.gridLayer.uniforms.set('u_nogrid', { value: 0 });
          heroBt.gridLayer.uniforms.set('u_render_content', { value: 1 });
          heroBt.gridLayer.uniforms.set('u_reveal_progress', { value: 1 });
          heroBt.gridLayer.uniforms.set('u_content_theme', { value: [249, 244, 235] });
          return {
            success: true,
            playerType: contentUniform.value.player.tagName
          };
        }
        return { error: 'contentUniform not found' };
      })()`;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true }
      }));
    };
    ws.onmessage = (e) => {
      console.log('Result:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
