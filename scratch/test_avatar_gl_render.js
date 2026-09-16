const http = require('http');
const fs = require('fs');

const svgContent = fs.readFileSync('public/coded-avatar/avatar.svg', 'utf8');
const match = svgContent.match(/\bd="([^"]+)"/);
const pathD = match[1];

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

        const c = document.createElement('canvas');
        c.width = 1920;
        c.height = 1080;
        const ctx = c.getContext('2d');

        // Dark background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 1920, 1080);

        // White avatar silhouette
        const p = new Path2D(${JSON.stringify(pathD)});
        ctx.fillStyle = '#ffffff';
        ctx.fill(p, 'evenodd');

        const contentUniform = heroBt.gridLayer.uniforms.get('u_content');
        contentUniform.value.player = c;
        heroBt.gridLayer.uniforms.set('u_content_dimensions', { value: [1920, 1080] });
        heroBt.gridLayer.uniforms.set('u_nogrid', { value: 0 });
        heroBt.gridLayer.uniforms.set('u_render_content', { value: 1 });
        heroBt.gridLayer.uniforms.set('u_reveal_progress', { value: 1 });
        heroBt.gridLayer.uniforms.set('u_content_theme', { value: [249, 244, 235] });

        window.__heroAvatarCanvas = c;
        return { success: true };
      })()`;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true }
      }));
    };
    ws.onmessage = (e) => {
      console.log('Avatar render result:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
