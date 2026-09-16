const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/portrait_eyeballs_config.json')));

const engineCode = `/**
 * Hero Avatar Engine v5.0 (Decoupled Eyeballs & Static Eyelids)
 * 100% Pure Canvas 2D Vector Engine - ZERO image assets, ZERO drawImage().
 * Upper eyelids remain static while oval eyeballs with catchlight dots track cursor.
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

  var leftEye = ${JSON.stringify(config.leftEye)};
  var rightEye = ${JSON.stringify(config.rightEye)};

  var animCanvas = document.createElement('canvas');
  animCanvas.width = CANVAS_W;
  animCanvas.height = CANVAS_H;
  var ctx = animCanvas.getContext('2d');

  var baseWithLidsPath = new Path2D("${config.baseWithLidsPathD}");

  var scaleX = CANVAS_W / SRC_W;
  var scaleY = CANVAS_H / SRC_H;

  var targetDx = 0, targetDy = 0;
  var curDx = 0, curDy = 0;

  var MAX_TRAVEL_X = 14.0;
  var MAX_TRAVEL_Y = 8.0;

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

  function drawEyeball(eye, dx, dy) {
    var cx = eye.cx + dx;
    var cy = eye.cy + dy;

    // Dark ink oval eyeball
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.ellipse(cx, cy, eye.rx, eye.ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Specular catchlight white glint dots
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + eye.glint1.dx, cy + eye.glint1.dy, eye.glint1.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx + eye.glint2.dx, cy + eye.glint2.dy, eye.glint2.r, 0, Math.PI * 2);
    ctx.fill();
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

    // 3. Draw Left Eyeball (clipped to socket)
    ctx.save();
    ctx.beginPath();
    ctx.rect(728, 432, 60, 48);
    ctx.clip();
    drawEyeball(leftEye, curDx, curDy);
    ctx.restore();

    // 4. Draw Right Eyeball (clipped to socket)
    ctx.save();
    ctx.beginPath();
    ctx.rect(864, 414, 60, 48);
    ctx.clip();
    drawEyeball(rightEye, curDx, curDy);
    ctx.restore();

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

  console.log('[HeroAvatarEngine v5.0] Decoupled eyeballs and static eyelids active.');
})();
`;

fs.writeFileSync(path.join(__dirname, '../public/js/hero-avatar-engine.js'), engineCode);
console.log('public/js/hero-avatar-engine.js updated successfully!');
