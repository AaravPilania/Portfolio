const http = require('http');
const fs = require('fs');

const appJs = fs.readFileSync('public/assets/app-zxjZQ-wy.js', 'utf8');
const backdropJs = fs.readFileSync('public/assets/backdrop_theme-MLvCd1KU.js', 'utf8');
const segmentJs = fs.readFileSync('public/assets/segment-DtAQyFoF.js', 'utf8');

function getShaders(src, filename) {
  const list = [];
  let idx = 0;
  while ((idx = src.indexOf('#version 300 es', idx)) !== -1) {
    const startBacktick = src.lastIndexOf('`', idx);
    const endBacktick = src.indexOf('`', idx);
    const shader = src.substring(startBacktick + 1, endBacktick);
    const varName = src.substring(Math.max(0, startBacktick - 20), startBacktick).trim();
    list.push({ filename, varName, shader });
    idx = endBacktick + 1;
  }
  return list;
}

const allShaders = [
  ...getShaders(appJs, 'app'),
  ...getShaders(backdropJs, 'backdrop'),
  ...getShaders(segmentJs, 'segment')
];

http.get('http://localhost:9222/json', res => {
  let raw = '';
  res.on('data', c => raw += c);
  res.on('end', () => {
    const list = JSON.parse(raw);
    const tab = list.find(t => t.url && t.url.includes('localhost:3000'));
    if (!tab) return console.log('No tab');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      const code = `
        (() => {
          const shaders = ${JSON.stringify(allShaders)};
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl2');
          if (!gl) return { error: 'No webgl2' };

          const results = [];
          for (const s of shaders) {
            const isVertex = s.shader.includes('gl_Position');
            const sh = gl.createShader(isVertex ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
            gl.shaderSource(sh, s.shader);
            gl.compileShader(sh);
            const success = gl.getShaderParameter(sh, gl.COMPILE_STATUS);
            if (!success) {
              const log = gl.getShaderInfoLog(sh);
              results.push({ filename: s.filename, varName: s.varName, error: log });
            } else {
              results.push({ filename: s.filename, varName: s.varName, ok: true });
            }
          }
          return results;
        })()
      `;
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: code, returnByValue: true } }));
    };
    ws.onmessage = msg => {
      const data = JSON.parse(msg.data);
      if (data.id === 1) {
        console.log('Shader Compile Results:');
        for (const r of data.result.result.value) {
          if (r.error) {
            console.log(`FAIL [${r.filename} ${r.varName}]: ${r.error}`);
          } else {
            console.log(`OK   [${r.filename} ${r.varName}]`);
          }
        }
        ws.close();
      }
    };
  });
});
