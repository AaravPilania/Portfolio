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

        // Main animation canvas
        const animCanvas = document.createElement('canvas');
        animCanvas.width = 1920;
        animCanvas.height = 1080;
        const ctx = animCanvas.getContext('2d');

        // Offscreen canvas for raw avatar rendering
        const offCanvas = document.createElement('canvas');
        offCanvas.width = 1920;
        offCanvas.height = 1080;
        const offCtx = offCanvas.getContext('2d');

        const avatarPath = new Path2D(${JSON.stringify(pathD)});

        let mouseX = 960, mouseY = 540;
        let curMouseX = 960, curMouseY = 540;

        window.addEventListener('mousemove', (e) => {
          mouseX = (e.clientX / window.innerWidth) * 1920;
          mouseY = (e.clientY / window.innerHeight) * 1080;
        });

        let startTime = performance.now();
        let lastBoilTime = 0;
        let boilJitterX = 0;
        let boilJitterY = 0;

        function animate(now) {
          const t = (now - startTime) * 0.001;

          // Smooth mouse lerp
          curMouseX += (mouseX - curMouseX) * 0.04;
          curMouseY += (mouseY - curMouseY) * 0.04;
          const mouseOffsetX = (curMouseX - 960) * 0.025;
          const mouseOffsetY = (curMouseY - 540) * 0.02;

          // 10 fps line-boil update
          if (now - lastBoilTime > 90) {
            lastBoilTime = now;
            boilJitterX = (Math.random() - 0.5) * 2.5;
            boilJitterY = (Math.random() - 0.5) * 2.0;
          }

          // 1. Draw raw vector to offscreen canvas
          offCtx.fillStyle = '#000000';
          offCtx.fillRect(0, 0, 1920, 1080);

          offCtx.save();
          const breathe = 1.0 + Math.sin(t * 1.4) * 0.012;
          const swayX = Math.sin(t * 0.9) * 8 + mouseOffsetX + boilJitterX;
          const swayY = Math.cos(t * 1.1) * 6 + mouseOffsetY + boilJitterY;

          offCtx.translate(960 + swayX, 540 + swayY);
          offCtx.scale(breathe, breathe);
          offCtx.rotate(Math.sin(t * 0.8) * 0.008);
          offCtx.translate(-960, -540);

          offCtx.fillStyle = '#ffffff';
          offCtx.fill(avatarPath, 'evenodd');
          offCtx.restore();

          // 2. Multi-frequency wavy slice wiggle
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, 1920, 1080);

          const sliceH = 4;
          const numSlices = 1080 / sliceH;

          for (let i = 0; i < numSlices; i++) {
            const sy = i * sliceH;
            // Artsy wavy harmonics
            const w1 = Math.sin(sy * 0.015 + t * 2.8) * 7.0;
            const w2 = Math.sin(sy * 0.035 - t * 1.9) * 4.0;
            const w3 = Math.cos(sy * 0.007 + t * 1.2) * 3.5;
            const totalWiggle = w1 + w2 + w3;

            ctx.drawImage(offCanvas, 0, sy, 1920, sliceH, totalWiggle, sy, 1920, sliceH);
          }

          requestAnimationFrame(animate);
        }

        requestAnimationFrame(animate);

        const contentUniform = heroBt.gridLayer.uniforms.get('u_content');
        contentUniform.value.player = animCanvas;
        heroBt.gridLayer.uniforms.set('u_content_dimensions', { value: [1920, 1080] });
        heroBt.gridLayer.uniforms.set('u_nogrid', { value: 0 });
        heroBt.gridLayer.uniforms.set('u_render_content', { value: 1 });
        heroBt.gridLayer.uniforms.set('u_reveal_progress', { value: 1 });
        heroBt.gridLayer.uniforms.set('u_content_theme', { value: [249, 244, 235] });

        window.__heroAvatarAnimCanvas = animCanvas;
        return { success: true };
      })()`;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true }
      }));
    };
    ws.onmessage = (e) => {
      console.log('Animated wiggle result:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
