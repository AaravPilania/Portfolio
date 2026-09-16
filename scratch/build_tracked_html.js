const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/portrait_tracked_paths.json')));

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hand-Drawn Portrait Replica &bull; Cursor-Tracking Eyes</title>
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
      gap: 10px;
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
    .overlay-compare {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.25s ease;
      mix-blend-mode: difference;
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
      <h1>Hand-Drawn Vector Portrait <span class="badge">Authentic Eyes &bull; Cursor Following</span></h1>
      <p>Original me.png eye vector geometry smoothly tracking cursor &bull; 0 design changes &bull; 0 raster images</p>
    </div>
    <div class="controls">
      <div class="gaze-pill" id="gazeIndicator">Gaze: ΔX +0.0px, ΔY +0.0px</div>
      <button class="btn active" id="toggleTrackingBtn">Tracking: Active</button>
      <button class="btn" id="toggleDiffBtn">Compare with me.png</button>
      <button class="btn" id="resetCenterBtn">Look Center</button>
    </div>
  </header>

  <main class="main-stage">
    <div class="canvas-wrapper" id="wrapper">
      <canvas id="portraitCanvas" width="1672" height="941"></canvas>
      <img id="compareImg" class="overlay-compare" src="/images/me.png" alt="Reference me.png">
    </div>
  </main>

  <div class="stats-bar">
    <div class="stat-item">Eyes: <span>Original me.png Hand-Drawn Ink Path</span></div>
    <div class="stat-item">Physics: <span>Spring Dampened Inertia (120 FPS)</span></div>
    <div class="stat-item">Travel Bounds: <span>Subtle Natural Eye Socket Limits</span></div>
    <div class="stat-item">Base Drawing: <span>433 Vector Cycles</span></div>
  </div>

  <script>
    (function () {
      'use strict';

      var PORTRAIT_WIDTH = ${data.width};
      var PORTRAIT_HEIGHT = ${data.height};
      var BG_COLOR = "${data.bgColor}";
      var FACE_CENTER_X = ${data.faceCenter.x};
      var FACE_CENTER_Y = ${data.faceCenter.y};

      var canvas = document.getElementById('portraitCanvas');
      var ctx = canvas.getContext('2d');
      var wrapper = document.getElementById('wrapper');
      var compareImg = document.getElementById('compareImg');
      var gazeIndicator = document.getElementById('gazeIndicator');
      var toggleTrackingBtn = document.getElementById('toggleTrackingBtn');
      var toggleDiffBtn = document.getElementById('toggleDiffBtn');
      var resetCenterBtn = document.getElementById('resetCenterBtn');

      // 1. Vector Paths (Base and authentic Left & Right Eyes)
      var basePath = new Path2D("${data.basePathD}");
      var leftEyePath = new Path2D("${data.leftEyePathD}");
      var rightEyePath = new Path2D("${data.rightEyePathD}");

      // 2. Cursor tracking state
      var trackingActive = true;
      var targetDx = 0, targetDy = 0;
      var curDx = 0, curDy = 0;

      // Natural eye socket limits (in 1672x941 coordinates)
      var MAX_TRAVEL_X = 9.0;
      var MAX_TRAVEL_Y = 5.0;

      function updateGazeTarget(clientX, clientY) {
        if (!trackingActive) return;

        var rect = canvas.getBoundingClientRect();
        // Convert screen coordinates into canvas coordinate space (1672 x 941)
        var canvasX = (clientX - rect.left) * (PORTRAIT_WIDTH / rect.width);
        var canvasY = (clientY - rect.top) * (PORTRAIT_HEIGHT / rect.height);

        var deltaX = canvasX - FACE_CENTER_X;
        var deltaY = canvasY - FACE_CENTER_Y;
        var dist = Math.hypot(deltaX, deltaY);
        var angle = Math.atan2(deltaY, deltaX);

        // Smooth non-linear curve so gaze reaches edge naturally
        var intensity = Math.min(1.0, dist / 420);

        targetDx = Math.cos(angle) * MAX_TRAVEL_X * intensity;
        targetDy = Math.sin(angle) * MAX_TRAVEL_Y * intensity;
      }

      window.addEventListener('mousemove', function (e) {
        updateGazeTarget(e.clientX, e.clientY);
      }, { passive: true });

      // 3. Render loop with 60/120fps inertia smoothing
      function render() {
        // Smooth lerp
        curDx += (targetDx - curDx) * 0.12;
        curDy += (targetDy - curDy) * 0.12;

        ctx.save();
        ctx.clearRect(0, 0, PORTRAIT_WIDTH, PORTRAIT_HEIGHT);

        // Background yellow
        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(0, 0, PORTRAIT_WIDTH, PORTRAIT_HEIGHT);

        // Static face, hair, eyebrows, nose, beard, collar, and body
        ctx.fillStyle = '#0a0a0a';
        ctx.fill(basePath, 'evenodd');

        // Draw Left Eye with authentic hand-drawn vector stroke
        ctx.save();
        ctx.translate(curDx, curDy);
        ctx.fill(leftEyePath, 'evenodd');
        ctx.restore();

        // Draw Right Eye with authentic hand-drawn vector stroke
        ctx.save();
        ctx.translate(curDx, curDy);
        ctx.fill(rightEyePath, 'evenodd');
        ctx.restore();

        ctx.restore();

        // Update indicator UI
        gazeIndicator.textContent = 'Gaze: ΔX ' + (curDx >= 0 ? '+' : '') + curDx.toFixed(1) + 'px, ΔY ' + (curDy >= 0 ? '+' : '') + curDy.toFixed(1) + 'px';

        requestAnimationFrame(render);
      }

      requestAnimationFrame(render);

      // Controls
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

      resetCenterBtn.addEventListener('click', function () {
        targetDx = 0;
        targetDy = 0;
      });

      var diffActive = false;
      toggleDiffBtn.addEventListener('click', function () {
        diffActive = !diffActive;
        if (diffActive) {
          compareImg.style.opacity = '1';
          toggleDiffBtn.classList.add('active');
          toggleDiffBtn.textContent = 'Hide Comparison';
          targetDx = 0;
          targetDy = 0;
        } else {
          compareImg.style.opacity = '0';
          toggleDiffBtn.classList.remove('active');
          toggleDiffBtn.textContent = 'Compare with me.png';
        }
      });

      console.log('Cursor-tracking authentic eyes initialized!');
    })();
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, '../public/portrait-test.html'), htmlContent);
console.log('public/portrait-test.html updated with cursor-tracking eyes!');
