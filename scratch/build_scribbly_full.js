const fs = require('fs');
const path = require('path');

const boilData = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/scribble_boil_data.json')));

// 1. Build portrait-test.html
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hand-Drawn Vector Portrait &bull; Scribbly Animation & Light Physics</title>
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
      <h1>Living Hand-Drawn Portrait <span class="badge">Scribbly Motion &bull; Light Physics</span></h1>
      <p>11.5 FPS line-boil hand-drawn animation &bull; Spherical optical cornea parallax &bull; Organic gouache catchlights</p>
    </div>
    <div class="controls">
      <div class="gaze-pill" id="gazeIndicator">Gaze: ΔX +0.0px, ΔY +0.0px</div>
      <button class="btn active" id="toggleBoilBtn">Scribble Motion: On</button>
      <button class="btn active" id="toggleTrackingBtn">Tracking: Active</button>
      <button class="btn" id="resetCenterBtn">Look Center</button>
    </div>
  </header>

  <main class="main-stage">
    <div class="canvas-wrapper" id="wrapper">
      <canvas id="portraitCanvas" width="1672" height="941"></canvas>
    </div>
  </main>

  <div class="stats-bar">
    <div class="stat-item">Animation: <span>11.5 FPS Hand-Drawn Line Boil</span></div>
    <div class="stat-item">Catchlights: <span>Spherical Cornea Optical Parallax</span></div>
    <div class="stat-item">Specular Shape: <span>Organic Hand-Drawn Flecks</span></div>
    <div class="stat-item">Eyeball Framing: <span>Seamless Natural Under-Lid Motion</span></div>
  </div>

  <script>
    (function () {
      'use strict';

      var PORTRAIT_WIDTH = ${boilData.width};
      var PORTRAIT_HEIGHT = ${boilData.height};
      var BG_COLOR = "${boilData.bgColor}";
      var FACE_CENTER_X = ${boilData.faceCenter.x};
      var FACE_CENTER_Y = ${boilData.faceCenter.y};

      var canvas = document.getElementById('portraitCanvas');
      var ctx = canvas.getContext('2d');
      var gazeIndicator = document.getElementById('gazeIndicator');
      var toggleBoilBtn = document.getElementById('toggleBoilBtn');
      var toggleTrackingBtn = document.getElementById('toggleTrackingBtn');
      var resetCenterBtn = document.getElementById('resetCenterBtn');

      // 1. Line-Boil Base Drawing Frames (Cycles at ~11.5 FPS for authentic animator scribble)
      var baseFrames = [
        new Path2D("${boilData.baseFrames[0]}"),
        new Path2D("${boilData.baseFrames[1]}"),
        new Path2D("${boilData.baseFrames[2]}")
      ];

      // 2. Hand-Drawn Eyeball Frames
      var leftEyeballFrames = [
        new Path2D("${boilData.leftEyeball.frames[0]}"),
        new Path2D("${boilData.leftEyeball.frames[1]}"),
        new Path2D("${boilData.leftEyeball.frames[2]}")
      ];

      var rightEyeballFrames = [
        new Path2D("${boilData.rightEyeball.frames[0]}"),
        new Path2D("${boilData.rightEyeball.frames[1]}"),
        new Path2D("${boilData.rightEyeball.frames[2]}")
      ];

      var leftEyeCenter = { x: ${boilData.leftEyeball.cx}, y: ${boilData.leftEyeball.cy} };
      var rightEyeCenter = { x: ${boilData.rightEyeball.cx}, y: ${boilData.rightEyeball.cy} };

      // 3. Hand-Drawn Organic Catchlight Specular Flecks
      var glint1Path = new Path2D("${boilData.glintPaths.glint1}");
      var glint2Path = new Path2D("${boilData.glintPaths.glint2}");

      // 4. State
      var boilActive = true;
      var trackingActive = true;
      var targetDx = 0, targetDy = 0;
      var curDx = 0, curDy = 0;

      // Natural eye socket travel bounds without any box clipping walls
      var MAX_TRAVEL_X = 11.0;
      var MAX_TRAVEL_Y = 6.0;

      // Line boil timing: switch frame every 85ms (~11.7 FPS traditional animation rate)
      var boilFrame = 0;
      var lastBoilTime = 0;

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

      // Draw the authentic hand-drawn eyeball with 3D cornea light parallax & organic catchlights
      function renderEyeballWithOptics(frames, eyeCenter, curDx, curDy, activeFrame) {
        var cx = eyeCenter.x + curDx;
        var cy = eyeCenter.y + curDy;

        // 1. Draw organic hand-drawn dark ink eyeball
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = '#0a0a0a';
        ctx.fill(frames[activeFrame]);
        ctx.restore();

        // 2. Realistic 3D Cornea Optical Light Reflection:
        // When the eye turns toward the cursor, the cornea surface reflects the external light source.
        // The reflection does NOT move 1:1 with the pupil — it moves with optical parallax (0.35x)!
        // This causes the glint to glide across the spherical surface, creating authentic 3D depth!
        var parallaxDx = curDx * 0.35;
        var parallaxDy = curDy * 0.35;

        // Base catchlight offsets from resting eye center
        var g1BaseX = eyeCenter.x - 4.5 + parallaxDx;
        var g1BaseY = eyeCenter.y - 5.5 + parallaxDy;

        var g2BaseX = eyeCenter.x + 3.5 + parallaxDx;
        var g2BaseY = eyeCenter.y + 4.5 + parallaxDy;

        // Subtle gleam response: when glancing toward cursor, light flares slightly brighter
        var gazeAngle = Math.atan2(curDy, curDx);
        var flareIntensity = Math.max(0.75, 1.0 + Math.hypot(curDx, curDy) * 0.02);

        ctx.save();
        // Primary hand-drawn specular fleck
        ctx.translate(g1BaseX, g1BaseY);
        ctx.scale(flareIntensity, flareIntensity);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
        ctx.fill(glint1Path);
        ctx.restore();

        ctx.save();
        // Secondary subtle specular bounce fleck
        ctx.translate(g2BaseX, g2BaseY);
        ctx.scale(flareIntensity * 0.85, flareIntensity * 0.85);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fill(glint2Path);
        ctx.restore();
      }

      function render(now) {
        // Step line boil frame (~11.7 FPS)
        if (boilActive && now - lastBoilTime > 85) {
          lastBoilTime = now;
          boilFrame = (boilFrame + 1) % 3;
        }

        var activeFrame = boilActive ? boilFrame : 0;

        // Smooth spring-damped pupil tracking
        curDx += (targetDx - curDx) * 0.12;
        curDy += (targetDy - curDy) * 0.12;

        ctx.save();
        ctx.clearRect(0, 0, PORTRAIT_WIDTH, PORTRAIT_HEIGHT);

        // 1. Solid yellow background
        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(0, 0, PORTRAIT_WIDTH, PORTRAIT_HEIGHT);

        // 2. Draw Left Eyeball with authentic hand-drawn shape + optical light parallax
        renderEyeballWithOptics(leftEyeballFrames, leftEyeCenter, curDx, curDy, activeFrame);

        // 3. Draw Right Eyeball with authentic hand-drawn shape + optical light parallax
        renderEyeballWithOptics(rightEyeballFrames, rightEyeCenter, curDx, curDy, activeFrame);

        // 4. Draw base portrait WITH STATIC ANCHORED EYELIDS on top
        // Hand-drawn line boil vibrates the hair, beard, shirt scribbles, and eyelids seamlessly!
        ctx.fillStyle = '#0a0a0a';
        ctx.fill(baseFrames[activeFrame], 'evenodd');

        ctx.restore();

        gazeIndicator.textContent = 'Eyeball Gaze: ΔX ' + (curDx >= 0 ? '+' : '') + curDx.toFixed(1) + 'px, ΔY ' + (curDy >= 0 ? '+' : '') + curDy.toFixed(1) + 'px';

        requestAnimationFrame(render);
      }

      requestAnimationFrame(render);

      toggleBoilBtn.addEventListener('click', function () {
        boilActive = !boilActive;
        if (boilActive) {
          toggleBoilBtn.classList.add('active');
          toggleBoilBtn.textContent = 'Scribble Motion: On';
        } else {
          toggleBoilBtn.classList.remove('active');
          toggleBoilBtn.textContent = 'Scribble Motion: Paused';
        }
      });

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

      console.log('Living hand-drawn portrait with line boil and cornea light physics initialized!');
    })();
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, '../public/portrait-test.html'), htmlContent);
console.log('public/portrait-test.html updated with line boil and light physics!');

// 2. Build hero-avatar-engine.js
const engineContent = `/**
 * Hero Avatar Engine v6.0 (Living Hand-Drawn Vector Portrait)
 * 100% Pure Canvas 2D Vector Engine - ZERO image assets, ZERO drawImage().
 * Organic line-boil scribble animation, optical cornea parallax, & hand-drawn catchlights.
 */
(function () {
  'use strict';

  var CANVAS_W = 1920;
  var CANVAS_H = 1080;
  var SRC_W = ${boilData.width};
  var SRC_H = ${boilData.height};
  var BG_COLOR = "${boilData.bgColor}";
  var FACE_CENTER_X = ${boilData.faceCenter.x};
  var FACE_CENTER_Y = ${boilData.faceCenter.y};

  var animCanvas = document.createElement('canvas');
  animCanvas.width = CANVAS_W;
  animCanvas.height = CANVAS_H;
  var ctx = animCanvas.getContext('2d');

  var baseFrames = [
    new Path2D("${boilData.baseFrames[0]}"),
    new Path2D("${boilData.baseFrames[1]}"),
    new Path2D("${boilData.baseFrames[2]}")
  ];

  var leftEyeballFrames = [
    new Path2D("${boilData.leftEyeball.frames[0]}"),
    new Path2D("${boilData.leftEyeball.frames[1]}"),
    new Path2D("${boilData.leftEyeball.frames[2]}")
  ];

  var rightEyeballFrames = [
    new Path2D("${boilData.rightEyeball.frames[0]}"),
    new Path2D("${boilData.rightEyeball.frames[1]}"),
    new Path2D("${boilData.rightEyeball.frames[2]}")
  ];

  var leftEyeCenter = { x: ${boilData.leftEyeball.cx}, y: ${boilData.leftEyeball.cy} };
  var rightEyeCenter = { x: ${boilData.rightEyeball.cx}, y: ${boilData.rightEyeball.cy} };

  var glint1Path = new Path2D("${boilData.glintPaths.glint1}");
  var glint2Path = new Path2D("${boilData.glintPaths.glint2}");

  var scaleX = CANVAS_W / SRC_W;
  var scaleY = CANVAS_H / SRC_H;

  var targetDx = 0, targetDy = 0;
  var curDx = 0, curDy = 0;

  var MAX_TRAVEL_X = 11.0;
  var MAX_TRAVEL_Y = 6.0;

  var boilFrame = 0;
  var lastBoilTime = 0;

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

  function renderEyeballWithOptics(frames, eyeCenter, curDx, curDy, activeFrame) {
    var cx = eyeCenter.x + curDx;
    var cy = eyeCenter.y + curDy;

    // Hand-drawn ink eyeball
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#0a0a0a';
    ctx.fill(frames[activeFrame]);
    ctx.restore();

    // Spherical optical parallax for specular highlights
    var parallaxDx = curDx * 0.35;
    var parallaxDy = curDy * 0.35;

    var g1BaseX = eyeCenter.x - 4.5 + parallaxDx;
    var g1BaseY = eyeCenter.y - 5.5 + parallaxDy;

    var g2BaseX = eyeCenter.x + 3.5 + parallaxDx;
    var g2BaseY = eyeCenter.y + 4.5 + parallaxDy;

    var flareIntensity = Math.max(0.75, 1.0 + Math.hypot(curDx, curDy) * 0.02);

    ctx.save();
    ctx.translate(g1BaseX, g1BaseY);
    ctx.scale(flareIntensity, flareIntensity);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.fill(glint1Path);
    ctx.restore();

    ctx.save();
    ctx.translate(g2BaseX, g2BaseY);
    ctx.scale(flareIntensity * 0.85, flareIntensity * 0.85);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fill(glint2Path);
    ctx.restore();
  }

  function renderFrame(now) {
    if (now && now - lastBoilTime > 85) {
      lastBoilTime = now;
      boilFrame = (boilFrame + 1) % 3;
    }

    curDx += (targetDx - curDx) * 0.12;
    curDy += (targetDy - curDy) * 0.12;

    ctx.save();
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // 1. Background yellow
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 2. Scale to 1920x1080 WebGL texture buffer
    ctx.scale(scaleX, scaleY);

    // 3. Eyeballs with optical cornea light physics
    renderEyeballWithOptics(leftEyeballFrames, leftEyeCenter, curDx, curDy, boilFrame);
    renderEyeballWithOptics(rightEyeballFrames, rightEyeCenter, curDx, curDy, boilFrame);

    // 4. Base portrait with static anchored upper eyelids & line-boil scribble
    ctx.fillStyle = '#0a0a0a';
    ctx.fill(baseFrames[boilFrame], 'evenodd');

    ctx.restore();
  }

  function loop(now) {
    if (!isRunning) return;
    renderFrame(now);
    animReqId = requestAnimationFrame(loop);
  }

  function start() {
    if (isRunning) return;
    isRunning = true;
    renderFrame(performance.now());
    loop(performance.now());
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
    render: function () {
      renderFrame(performance.now());
    }
  };

  start();

  console.log('[HeroAvatarEngine v6.0] Living hand-drawn portrait with line boil active.');
})();
`;

fs.writeFileSync(path.join(__dirname, '../public/js/hero-avatar-engine.js'), engineContent);
console.log('public/js/hero-avatar-engine.js updated with line boil and light physics!');
