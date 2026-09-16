const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/portrait_eyeballs_config.json')));
const handDrawn = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/hand_drawn_eyeballs.json')));

// Standalone HTML page
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hand-Drawn Vector Portrait &bull; Organic Eyeballs & Tracking</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: #121212;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      overflow-x: hidden;
      cursor: default;
    }
    header {
      width: 100%;
      padding: 16px 28px;
      background: #1c1c1e;
      border-bottom: 1px solid #2c2c2e;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      z-index: 10;
    }
    .title-group h1 {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #fce03b;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .title-group p {
      font-size: 13px;
      color: #8e8e93;
      margin-top: 3px;
    }
    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(252, 224, 59, 0.15);
      color: #fce03b;
      border: 1px solid rgba(252, 224, 59, 0.3);
    }
    .controls {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }
    .btn {
      background: #2c2c2e;
      color: #f2f2f7;
      border: 1px solid #3a3a3c;
      padding: 8px 15px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn:hover {
      background: #3a3a3c;
      border-color: #636366;
    }
    .btn.active {
      background: #fce03b;
      color: #000;
      border-color: #fce03b;
    }
    .gaze-pill {
      font-size: 12px;
      color: #aeaeb2;
      background: #252528;
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid #333336;
      font-variant-numeric: tabular-nums;
    }
    .main-stage {
      flex: 1;
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 24px 20px;
      position: relative;
    }
    .canvas-wrapper {
      position: relative;
      box-shadow: 0 24px 60px rgba(0,0,0,0.7);
      border-radius: 12px;
      overflow: hidden;
      background: #fce03b;
      max-width: 95vw;
      max-height: 82vh;
      aspect-ratio: 1672 / 941;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
    .stats-bar {
      margin-top: 10px;
      display: flex;
      gap: 24px;
      font-size: 12px;
      color: #636366;
      justify-content: center;
      padding-bottom: 20px;
      flex-wrap: wrap;
    }
    .stat-item span {
      color: #aeaeb2;
      font-weight: 600;
    }
  </style>
</head>
<body>

  <header>
    <div class="title-group">
      <h1>Hand-Drawn Vector Portrait <span class="badge">100% Authentic Ink &bull; Zero Wall Clippings</span></h1>
      <p>Organic hand-drawn eyeball contours extracted from me.png &bull; Static anchored upper eyelids &bull; Fluid tracking</p>
    </div>
    <div class="controls">
      <div class="gaze-pill" id="gazeIndicator">Eyeball Gaze: ΔX +0.0px, ΔY +0.0px</div>
      <button class="btn active" id="toggleTrackingBtn">Tracking: Active</button>
      <button class="btn active" id="toggleGlintBtn">Catchlight Dots: On</button>
      <button class="btn" id="resetCenterBtn">Look Center</button>
    </div>
  </header>

  <main class="main-stage">
    <div class="canvas-wrapper" id="wrapper">
      <canvas id="portraitCanvas" width="1672" height="941"></canvas>
    </div>
  </main>

  <div class="stats-bar">
    <div class="stat-item">Eyeballs: <span>Authentic Hand-Drawn Ink Contours (me.png)</span></div>
    <div class="stat-item">Clipping: <span>Natural Eyelid Layering (No Box Walls)</span></div>
    <div class="stat-item">Traction: <span>Smooth 120 FPS Fluid Inertia</span></div>
    <div class="stat-item">Realism: <span>Dual Micro Catchlight Glints</span></div>
  </div>

  <script>
    (function () {
      'use strict';

      var PORTRAIT_WIDTH = ${config.width};
      var PORTRAIT_HEIGHT = ${config.height};
      var BG_COLOR = "${config.bgColor}";
      var FACE_CENTER_X = ${config.faceCenter.x};
      var FACE_CENTER_Y = ${config.faceCenter.y};

      var canvas = document.getElementById('portraitCanvas');
      var ctx = canvas.getContext('2d');
      var gazeIndicator = document.getElementById('gazeIndicator');
      var toggleTrackingBtn = document.getElementById('toggleTrackingBtn');
      var toggleGlintBtn = document.getElementById('toggleGlintBtn');
      var resetCenterBtn = document.getElementById('resetCenterBtn');

      // 1. Base drawing containing anchored upper eyelids, face, hair, eyebrows, nose, beard, collar, shirt
      var baseWithLidsPath = new Path2D("${config.baseWithLidsPathD}");

      // 2. Authentic Hand-Drawn Eyeball Paths extracted directly from me.png
      var leftEyeballPath = new Path2D("${handDrawn.left.relPathD}");
      var rightEyeballPath = new Path2D("${handDrawn.right.relPathD}");

      var leftEyeCenter = { x: ${handDrawn.left.cx}, y: ${handDrawn.left.cy} };
      var rightEyeCenter = { x: ${handDrawn.right.cx}, y: ${handDrawn.right.cy} };

      var trackingActive = true;
      var showGlints = true;
      var targetDx = 0, targetDy = 0;
      var curDx = 0, curDy = 0;

      // Natural eye socket travel bounds without any box clipping walls
      var MAX_TRAVEL_X = 11.0;
      var MAX_TRAVEL_Y = 6.0;

      function updateGazeTarget(clientX, clientY) {
        if (!trackingActive) return;

        var rect = canvas.getBoundingClientRect();
        var canvasX = (clientX - rect.left) * (PORTRAIT_WIDTH / rect.width);
        var canvasY = (clientY - rect.top) * (PORTRAIT_HEIGHT / rect.height);

        var deltaX = canvasX - FACE_CENTER_X;
        var deltaY = canvasY - FACE_CENTER_Y;
        var dist = Math.hypot(deltaX, deltaY);
        var angle = Math.atan2(deltaY, deltaX);

        var intensity = Math.min(1.0, dist / 400);

        targetDx = Math.cos(angle) * MAX_TRAVEL_X * intensity;
        targetDy = Math.sin(angle) * MAX_TRAVEL_Y * intensity;
      }

      window.addEventListener('mousemove', function (e) {
        updateGazeTarget(e.clientX, e.clientY);
      }, { passive: true });

      function drawHandDrawnEyeball(path, cx, cy, glint1, glint2) {
        ctx.save();
        ctx.translate(cx, cy);

        // Fill authentic sketchy ink eyeball
        ctx.fillStyle = '#0a0a0a';
        ctx.fill(path);

        // Catchlight glint dots inside
        if (showGlints) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(glint1.dx, glint1.dy, glint1.rx, glint1.ry, glint1.rot, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.ellipse(glint2.dx, glint2.dy, glint2.rx, glint2.ry, glint2.rot, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      function render() {
        curDx += (targetDx - curDx) * 0.12;
        curDy += (targetDy - curDy) * 0.12;

        ctx.save();
        ctx.clearRect(0, 0, PORTRAIT_WIDTH, PORTRAIT_HEIGHT);

        // 1. Solid yellow background
        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(0, 0, PORTRAIT_WIDTH, PORTRAIT_HEIGHT);

        // 2. Draw Left Eyeball (Authentic Hand-Drawn Ink Path - NO BOX CLIPPING)
        drawHandDrawnEyeball(
          leftEyeballPath,
          leftEyeCenter.x + curDx,
          leftEyeCenter.y + curDy,
          ${JSON.stringify(handDrawn.left.glint1)},
          ${JSON.stringify(handDrawn.left.glint2)}
        );

        // 3. Draw Right Eyeball (Authentic Hand-Drawn Ink Path - NO BOX CLIPPING)
        drawHandDrawnEyeball(
          rightEyeballPath,
          rightEyeCenter.x + curDx,
          rightEyeCenter.y + curDy,
          ${JSON.stringify(handDrawn.right.glint1)},
          ${JSON.stringify(handDrawn.right.glint2)}
        );

        // 4. Draw base portrait WITH STATIC ANCHORED EYELIDS on top
        // Naturally frames the eyeballs underneath the authentic eyelid ink stroke
        ctx.fillStyle = '#0a0a0a';
        ctx.fill(baseWithLidsPath, 'evenodd');

        ctx.restore();

        gazeIndicator.textContent = 'Eyeball Gaze: ΔX ' + (curDx >= 0 ? '+' : '') + curDx.toFixed(1) + 'px, ΔY ' + (curDy >= 0 ? '+' : '') + curDy.toFixed(1) + 'px';

        requestAnimationFrame(render);
      }

      requestAnimationFrame(render);

      toggleTrackingBtn.addEventListener('click', function () {
        trackingActive = !trackingActive;
        if (trackingActive) {
          toggleTrackingBtn.classList.add('active');
          toggleTrackingBtn.textContent = 'Tracking: Active';
        } else {
          toggleTrackingBtn.classList.remove('active');
          toggleTrackingBtn.textContent = 'Tracking: Paused';
          targetDx = 0;
          targetDy = 0;
        }
      });

      toggleGlintBtn.addEventListener('click', function () {
        showGlints = !showGlints;
        if (showGlints) {
          toggleGlintBtn.classList.add('active');
          toggleGlintBtn.textContent = 'Catchlight Dots: On';
        } else {
          toggleGlintBtn.classList.remove('active');
          toggleGlintBtn.textContent = 'Catchlight Dots: Off';
        }
      });

      resetCenterBtn.addEventListener('click', function () {
        targetDx = 0;
        targetDy = 0;
      });

      console.log('Organic hand-drawn eyeballs with seamless travel initialized!');
    })();
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, '../public/portrait-test.html'), htmlContent);
console.log('Updated public/portrait-test.html with hand-drawn eyeballs and zero box wall clippings.');

// Main Hero Avatar Engine
const engineContent = `/**
 * Hero Avatar Engine v5.5 (Organic Hand-Drawn Eyeballs & Static Eyelids)
 * 100% Pure Canvas 2D Vector Engine - ZERO image assets, ZERO drawImage().
 * Organic hand-drawn ink contours from me.png with seamless travel & zero box clips.
 */
(function () {
  'use strict';

  var CANVAS_W = 1920;
  var CANVAS_H = 1080;
  var SRC_W = ${config.width};
  var SRC_H = ${config.height};
  var BG_COLOR = "${config.bgColor}";
  var FACE_CENTER_X = ${config.faceCenter.x};
  var FACE_CENTER_Y = ${config.faceCenter.y};

  var animCanvas = document.createElement('canvas');
  animCanvas.width = CANVAS_W;
  animCanvas.height = CANVAS_H;
  var ctx = animCanvas.getContext('2d');

  var baseWithLidsPath = new Path2D("${config.baseWithLidsPathD}");
  var leftEyeballPath = new Path2D("${handDrawn.left.relPathD}");
  var rightEyeballPath = new Path2D("${handDrawn.right.relPathD}");

  var leftEyeCenter = { x: ${handDrawn.left.cx}, y: ${handDrawn.left.cy} };
  var rightEyeCenter = { x: ${handDrawn.right.cx}, y: ${handDrawn.right.cy} };

  var glint1 = ${JSON.stringify(handDrawn.left.glint1)};
  var glint2 = ${JSON.stringify(handDrawn.left.glint2)};

  var scaleX = CANVAS_W / SRC_W;
  var scaleY = CANVAS_H / SRC_H;

  var targetDx = 0, targetDy = 0;
  var curDx = 0, curDy = 0;

  var MAX_TRAVEL_X = 11.0;
  var MAX_TRAVEL_Y = 6.0;

  var isRunning = false;
  var animReqId = null;

  window.addEventListener('mousemove', function (e) {
    var winW = window.innerWidth || 1920;
    var winH = window.innerHeight || 1080;

    var srcMouseX = (e.clientX / winW) * SRC_W;
    var srcMouseY = (e.clientY / winH) * SRC_H;

    var deltaX = srcMouseX - FACE_CENTER_X;
    var deltaY = srcMouseY - FACE_CENTER_Y;
    var dist = Math.hypot(deltaX, deltaY);
    var angle = Math.atan2(deltaY, deltaX);

    var intensity = Math.min(1.0, dist / 400);
    targetDx = Math.cos(angle) * MAX_TRAVEL_X * intensity;
    targetDy = Math.sin(angle) * MAX_TRAVEL_Y * intensity;
  }, { passive: true });

  function drawHandDrawnEyeball(path, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);

    // Fill authentic hand-drawn sketchy ink eyeball
    ctx.fillStyle = '#0a0a0a';
    ctx.fill(path);

    // Catchlight glints inside
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(glint1.dx, glint1.dy, glint1.rx, glint1.ry, glint1.rot, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(glint2.dx, glint2.dy, glint2.rx, glint2.ry, glint2.rot, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function renderFrame() {
    curDx += (targetDx - curDx) * 0.12;
    curDy += (targetDy - curDy) * 0.12;

    ctx.save();
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // 1. Background yellow
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 2. Scale to 1920x1080 WebGL texture buffer
    ctx.scale(scaleX, scaleY);

    // 3. Draw Left Eyeball (NO BOX WALL CLIPPING)
    drawHandDrawnEyeball(leftEyeballPath, leftEyeCenter.x + curDx, leftEyeCenter.y + curDy);

    // 4. Draw Right Eyeball (NO BOX WALL CLIPPING)
    drawHandDrawnEyeball(rightEyeballPath, rightEyeCenter.x + curDx, rightEyeCenter.y + curDy);

    // 5. Draw static base with anchored upper eyelids ON TOP
    ctx.fillStyle = '#0a0a0a';
    ctx.fill(baseWithLidsPath, 'evenodd');

    ctx.restore();
  }

  function loop() {
    if (!isRunning) return;
    renderFrame();
    animReqId = requestAnimationFrame(loop);
  }

  function start() {
    if (isRunning) return;
    isRunning = true;
    renderFrame();
    loop();
  }

  function stop() {
    isRunning = false;
    if (animReqId) {
      cancelAnimationFrame(animReqId);
      animReqId = null;
    }
  }

  window.__heroAvatarEngine = {
    start: start,
    stop: stop,
    getCanvas: function () {
      return animCanvas;
    },
    render: renderFrame
  };

  start();

  console.log('[HeroAvatarEngine v5.5] Organic hand-drawn eyeballs with seamless travel active.');
})();
`;

fs.writeFileSync(path.join(__dirname, '../public/js/hero-avatar-engine.js'), engineContent);
console.log('Updated public/js/hero-avatar-engine.js with organic hand-drawn eyeballs and zero box wall clips.');
