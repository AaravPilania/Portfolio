const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/portrait_eyeballs_config.json')));

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hand-Drawn Vector Portrait &bull; Decoupled Eyeballs & Eyelids</title>
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
      <h1>Decoupled Eyeballs & Eyelids <span class="badge">Static Lids &bull; Moving Eyeballs</span></h1>
      <p>Authentic upper eyelids stay anchored while realistic oval eyeballs with catchlight dots track the cursor</p>
    </div>
    <div class="controls">
      <div class="gaze-pill" id="gazeIndicator">Eyeball Offset: ΔX +0.0px, ΔY +0.0px</div>
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
    <div class="stat-item">Eyelids: <span>Anchored to Face Contour (Static)</span></div>
    <div class="stat-item">Eyeballs: <span>Independent Ovals with Full Traction</span></div>
    <div class="stat-item">Realism Effect: <span>Dual Specular Catchlight Glints</span></div>
    <div class="stat-item">Framing: <span>Layered Under Eyelid Arches</span></div>
  </div>

  <script>
    (function () {
      'use strict';

      var PORTRAIT_WIDTH = ${config.width};
      var PORTRAIT_HEIGHT = ${config.height};
      var BG_COLOR = "${config.bgColor}";
      var FACE_CENTER_X = ${config.faceCenter.x};
      var FACE_CENTER_Y = ${config.faceCenter.y};

      var leftEye = ${JSON.stringify(config.leftEye)};
      var rightEye = ${JSON.stringify(config.rightEye)};

      var canvas = document.getElementById('portraitCanvas');
      var ctx = canvas.getContext('2d');
      var gazeIndicator = document.getElementById('gazeIndicator');
      var toggleTrackingBtn = document.getElementById('toggleTrackingBtn');
      var toggleGlintBtn = document.getElementById('toggleGlintBtn');
      var resetCenterBtn = document.getElementById('resetCenterBtn');

      // Base drawing containing the anchored upper eyelids, face, hair, eyebrows, nose, beard, collar, shirt
      var baseWithLidsPath = new Path2D("${config.baseWithLidsPathD}");

      var trackingActive = true;
      var showGlints = true;
      var targetDx = 0, targetDy = 0;
      var curDx = 0, curDy = 0;

      // Full traction eyeball travel limits
      var MAX_TRAVEL_X = 14.0;
      var MAX_TRAVEL_Y = 8.0;

      function updateGazeTarget(clientX, clientY) {
        if (!trackingActive) return;

        var rect = canvas.getBoundingClientRect();
        var canvasX = (clientX - rect.left) * (PORTRAIT_WIDTH / rect.width);
        var canvasY = (clientY - rect.top) * (PORTRAIT_HEIGHT / rect.height);

        var deltaX = canvasX - FACE_CENTER_X;
        var deltaY = canvasY - FACE_CENTER_Y;
        var dist = Math.hypot(deltaX, deltaY);
        var angle = Math.atan2(deltaY, deltaX);

        // Smooth responsive traction curve
        var intensity = Math.min(1.0, dist / 400);

        targetDx = Math.cos(angle) * MAX_TRAVEL_X * intensity;
        targetDy = Math.sin(angle) * MAX_TRAVEL_Y * intensity;
      }

      window.addEventListener('mousemove', function (e) {
        updateGazeTarget(e.clientX, e.clientY);
      }, { passive: true });

      function drawEyeball(eye, dx, dy) {
        var cx = eye.cx + dx;
        var cy = eye.cy + dy;

        // 1. Dark ink oval eyeball
        ctx.fillStyle = '#0a0a0a';
        ctx.beginPath();
        ctx.ellipse(cx, cy, eye.rx, eye.ry, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Realism effect: specular catchlight white dots
        if (showGlints) {
          ctx.fillStyle = '#ffffff';
          // Primary reflective glint
          ctx.beginPath();
          ctx.arc(cx + eye.glint1.dx, cy + eye.glint1.dy, eye.glint1.r, 0, Math.PI * 2);
          ctx.fill();

          // Secondary micro-glint for depth
          ctx.beginPath();
          ctx.arc(cx + eye.glint2.dx, cy + eye.glint2.dy, eye.glint2.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      function render() {
        // Fluid spring interpolation
        curDx += (targetDx - curDx) * 0.12;
        curDy += (targetDy - curDy) * 0.12;

        ctx.save();
        ctx.clearRect(0, 0, PORTRAIT_WIDTH, PORTRAIT_HEIGHT);

        // 1. Yellow background
        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(0, 0, PORTRAIT_WIDTH, PORTRAIT_HEIGHT);

        // 2. Draw the independent moving eyeballs
        // Left Eyeball
        ctx.save();
        // Socket clip for left eye to keep it neatly within the eye contour
        ctx.beginPath();
        ctx.rect(728, 432, 60, 48);
        ctx.clip();
        drawEyeball(leftEye, curDx, curDy);
        ctx.restore();

        // Right Eyeball
        ctx.save();
        // Socket clip for right eye
        ctx.beginPath();
        ctx.rect(864, 414, 60, 48);
        ctx.clip();
        drawEyeball(rightEye, curDx, curDy);
        ctx.restore();

        // 3. Draw the base portrait WITH THE ANCHORED STATIC EYELIDS on top
        // This naturally frames and clips the eyeballs beneath the authentic eyelid curves!
        ctx.fillStyle = '#0a0a0a';
        ctx.fill(baseWithLidsPath, 'evenodd');

        ctx.restore();

        // Update indicator UI
        gazeIndicator.textContent = 'Eyeball Offset: ΔX ' + (curDx >= 0 ? '+' : '') + curDx.toFixed(1) + 'px, ΔY ' + (curDy >= 0 ? '+' : '') + curDy.toFixed(1) + 'px';

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

      console.log('Decoupled eyeballs and static eyelids initialized!');
    })();
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, '../public/portrait-test.html'), html);
console.log('public/portrait-test.html updated with decoupled eyeballs and static eyelids!');
