const http = require('http');
const fs = require('fs');

const svgContent = fs.readFileSync('public/coded-avatar/avatar.svg', 'utf8');
const match = svgContent.match(/\bd="([^"]+)"/);
if (!match) {
  console.error('Could not extract d attribute from avatar.svg');
  process.exit(1);
}
const pathD = match[1];

http.get('http://localhost:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      const expr = `(async () => {
        const video = document.querySelector('.ll-section--hero_extended video');
        if (!video) return { error: 'Hero video not found' };

        // 1. Create animation canvas
        const animCanvas = document.createElement('canvas');
        animCanvas.width = 1920;
        animCanvas.height = 1080;
        const ctx = animCanvas.getContext('2d');

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

        function renderFrame(now) {
          const t = (now - startTime) * 0.001;

          curMouseX += (mouseX - curMouseX) * 0.05;
          curMouseY += (mouseY - curMouseY) * 0.05;
          const mouseOffsetX = (curMouseX - 960) * 0.03;
          const mouseOffsetY = (curMouseY - 540) * 0.03;

          // 1. Render raw avatar to offscreen canvas
          offCtx.fillStyle = '#000000';
          offCtx.fillRect(0, 0, 1920, 1080);

          offCtx.save();
          // Organic breathing & gentle sway
          const breathe = 1.0 + Math.sin(t * 1.5) * 0.018;
          const swayX = Math.sin(t * 1.1) * 12 + mouseOffsetX;
          const swayY = Math.cos(t * 1.4) * 8 + mouseOffsetY;

          offCtx.translate(960 + swayX, 540 + swayY);
          offCtx.scale(breathe, breathe);
          offCtx.rotate(Math.sin(t * 0.9) * 0.012);
          offCtx.translate(-960, -540);

          // Fill avatar in pure white (#ffffff) so luminance is 1.0
          offCtx.fillStyle = '#ffffff';
          offCtx.fill(avatarPath, 'evenodd');
          offCtx.restore();

          // 2. Render slice wiggle to main canvas
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, 1920, 1080);

          const sliceH = 4; // 4px slices for fine organic wiggle
          const numSlices = 1080 / sliceH;

          // Stop-motion style line boil step
          const boilFrame = Math.floor(t * 12);
          const boilSeed = (Math.sin(boilFrame * 127.1) * 43758.5453) % 1;
          const boilJitter = (boilSeed - 0.5) * 2.5;

          for (let i = 0; i < numSlices; i++) {
            const sy = i * sliceH;
            // Harmonic wave formula for artsy wiggly motion
            const wave1 = Math.sin(sy * 0.012 + t * 3.2) * 9.0;
            const wave2 = Math.sin(sy * 0.028 - t * 2.1) * 5.0;
            const wave3 = Math.cos(sy * 0.006 + t * 1.5) * 4.0;
            const wave = wave1 + wave2 + wave3 + boilJitter;

            ctx.drawImage(offCanvas, 0, sy, 1920, sliceH, wave, sy, 1920, sliceH);
          }

          requestAnimationFrame(renderFrame);
        }

        requestAnimationFrame(renderFrame);

        // 3. Connect canvas stream to video
        const stream = animCanvas.captureStream(30);
        video.srcObject = stream;
        delete video.dataset.nogrid;
        video.removeAttribute('data-nogrid');
        await video.play();

        // 4. Update backdrop_theme instance
        const page = window.$?.instances.get('page');
        let heroBt = null;
        if (page?.instances) {
          page.instances.forEach((v, k) => {
            if (v?.key?.includes('hero_extended') || (k?.dataset?.component === 'blocks/backdrop_theme' && k?.closest('.ll-section--hero_extended'))) {
              heroBt = v;
            }
          });
        }

        if (heroBt && heroBt.gridLayer) {
          heroBt.nogrid = false;
          heroBt.gridLayer.uniforms.set('u_nogrid', { value: 0 });
          heroBt.gridLayer.uniforms.set('u_render_content', { value: 1 });
          heroBt.gridLayer.uniforms.set('u_reveal_progress', { value: 1 });
          heroBt.gridLayer.uniforms.set('u_content_theme', { value: [249, 244, 235] });
        }

        window.__heroAvatarCanvas = animCanvas;

        return {
          streamConnected: true,
          videoReadyState: video.readyState,
          heroBtFound: !!heroBt
        };
      })()`;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, awaitPromise: true, returnByValue: true }
      }));
    };
    ws.onmessage = (e) => {
      console.log('Stream test result:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
