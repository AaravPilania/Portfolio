const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/portrait_path.json')));

const engineCode = `/**
 * Hero Avatar Engine v4.0 (Pure Canvas Code Replica)
 * 100% Pure Canvas 2D Vector Engine - ZERO image assets, ZERO drawImage().
 * Replicates me.png hand-drawn ink curves down to every stroke.
 */
(function () {
  'use strict';

  var CANVAS_W = 1920;
  var CANVAS_H = 1080;
  var SRC_W = ${data.width};
  var SRC_H = ${data.height};
  var BG_COLOR = "${data.bgColor}";
  var PATH_D = "${data.pathD}";

  var animCanvas = document.createElement('canvas');
  animCanvas.width = CANVAS_W;
  animCanvas.height = CANVAS_H;
  var ctx = animCanvas.getContext('2d');

  var portraitPath = new Path2D(PATH_D);
  var scaleX = CANVAS_W / SRC_W;
  var scaleY = CANVAS_H / SRC_H;

  var isRunning = false;
  var animReqId = null;
  var targetHeroBt = null;

  function renderPortrait() {
    ctx.save();
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Background yellow
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Scale to fill 1920x1080 WebGL texture buffer
    ctx.scale(scaleX, scaleY);

    // Fill authentic hand-drawn ink strokes
    ctx.fillStyle = '#0a0a0a';
    ctx.fill(portraitPath, 'evenodd');
    ctx.restore();
  }

  // Initial draw
  renderPortrait();

  function start() {
    if (isRunning) return;
    isRunning = true;
    renderPortrait();
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
    setHeroBt: function (bt) {
      targetHeroBt = bt;
    },
    render: renderPortrait
  };

  // Auto-start
  start();

  console.log('[HeroAvatarEngine v4.0] Pure Canvas 2D code initialized (0 images).');
})();
`;

fs.writeFileSync(path.join(__dirname, '../public/js/hero-avatar-engine.js'), engineCode);
console.log('public/js/hero-avatar-engine.js updated successfully! Size:', engineCode.length);
