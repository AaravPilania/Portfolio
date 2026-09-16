const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/portrait_tracked_paths.json')));

const engineCode = `/**
 * Hero Avatar Engine v4.5 (Authentic Vector Portrait with Cursor-Tracking Eyes)
 * 100% Pure Canvas 2D Vector Engine - ZERO image assets, ZERO drawImage().
 * Uses exact me.png eye vector geometry tracking the cursor smoothly.
 */
(function () {
  'use strict';

  var CANVAS_W = 1920;
  var CANVAS_H = 1080;
  var SRC_W = ${data.width};
  var SRC_H = ${data.height};
  var BG_COLOR = "${data.bgColor}";
  var FACE_CENTER_X = ${data.faceCenter.x};
  var FACE_CENTER_Y = ${data.faceCenter.y};

  var animCanvas = document.createElement('canvas');
  animCanvas.width = CANVAS_W;
  animCanvas.height = CANVAS_H;
  var ctx = animCanvas.getContext('2d');

  var basePath = new Path2D("${data.basePathD}");
  var leftEyePath = new Path2D("${data.leftEyePathD}");
  var rightEyePath = new Path2D("${data.rightEyePathD}");

  var scaleX = CANVAS_W / SRC_W;
  var scaleY = CANVAS_H / SRC_H;

  var mouseX = CANVAS_W / 2;
  var mouseY = CANVAS_H / 2;
  var targetDx = 0, targetDy = 0;
  var curDx = 0, curDy = 0;

  var MAX_TRAVEL_X = 9.0;
  var MAX_TRAVEL_Y = 5.0;

  var isRunning = false;
  var animReqId = null;

  window.addEventListener('mousemove', function (e) {
    var winW = window.innerWidth || 1920;
    var winH = window.innerHeight || 1080;

    // Convert screen coordinates to 1672x941 source coordinate space
    var srcMouseX = (e.clientX / winW) * SRC_W;
    var srcMouseY = (e.clientY / winH) * SRC_H;

    var deltaX = srcMouseX - FACE_CENTER_X;
    var deltaY = srcMouseY - FACE_CENTER_Y;
    var dist = Math.hypot(deltaX, deltaY);
    var angle = Math.atan2(deltaY, deltaX);

    var intensity = Math.min(1.0, dist / 420);
    targetDx = Math.cos(angle) * MAX_TRAVEL_X * intensity;
    targetDy = Math.sin(angle) * MAX_TRAVEL_Y * intensity;
  }, { passive: true });

  function renderFrame() {
    curDx += (targetDx - curDx) * 0.12;
    curDy += (targetDy - curDy) * 0.12;

    ctx.save();
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Background yellow
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Scale to fill 1920x1080 WebGL texture buffer
    ctx.scale(scaleX, scaleY);

    // 1. Static face, hair, eyebrows, nose, beard, collar, body
    ctx.fillStyle = '#0a0a0a';
    ctx.fill(basePath, 'evenodd');

    // 2. Left Eye (translated with cursor tracking)
    ctx.save();
    ctx.translate(curDx, curDy);
    ctx.fill(leftEyePath, 'evenodd');
    ctx.restore();

    // 3. Right Eye (translated with cursor tracking)
    ctx.save();
    ctx.translate(curDx, curDy);
    ctx.fill(rightEyePath, 'evenodd');
    ctx.restore();

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

  console.log('[HeroAvatarEngine v4.5] Authentic vector portrait with cursor-tracking eyes active.');
})();
`;

fs.writeFileSync(path.join(__dirname, '../public/js/hero-avatar-engine.js'), engineCode);
console.log('public/js/hero-avatar-engine.js updated with cursor-tracking authentic eyes!');
